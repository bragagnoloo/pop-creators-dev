import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
  const limit  = Math.min(100, parseInt(searchParams.get('limit') ?? '50'));
  const plan   = searchParams.get('plan');
  const method = searchParams.get('payment_method');
  const search = searchParams.get('search')?.trim();
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  let query = supabase
    .from('subscriptions')
    .select(`
      user_id, plan, started_at, expires_at,
      kiwify_subscription_id, payment_method,
      profiles!inner(
        full_name, email, created_at,
        first_subscribed_at, first_utm_source, first_utm_campaign
      )
    `, { count: 'exact' })
    .neq('plan', 'free');

  if (plan) query = query.eq('plan', plan);
  if (method) query = query.eq('payment_method', method);
  if (search) {
    query = query.or(
      `profiles.full_name.ilike.%${search}%,profiles.email.ilike.%${search}%`
    );
  }

  query = query.order('started_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();

  // Contagem de renovações por usuário
  const userIds = (data ?? []).map((r) => r.user_id);
  const { data: renewalRows } = await supabase
    .from('subscription_events')
    .select('user_id')
    .in('user_id', userIds)
    .eq('event_type', 'order_approved');

  const renewalMap: Record<string, number> = {};
  for (const row of renewalRows ?? []) {
    renewalMap[row.user_id] = (renewalMap[row.user_id] ?? 0) + 1;
  }

  type ProfileJoin = {
    full_name: string;
    email: string;
    created_at: string;
    first_subscribed_at: string | null;
    first_utm_source: string | null;
    first_utm_campaign: string | null;
  };

  const rows = (data ?? []).map((r) => {
    const p = r.profiles as unknown as ProfileJoin;
    const expiry = r.expires_at ? new Date(r.expires_at).getTime() : null;
    const daysLeft = expiry ? Math.ceil((expiry - now) / 86400000) : null;

    let status: string;
    if (!expiry || expiry > now) {
      status = daysLeft !== null && daysLeft <= 7 ? 'expiring_soon' : 'active';
    } else {
      status = 'expired';
    }
    if (!r.kiwify_subscription_id && status === 'active') status = 'cancelled_pending';

    return {
      userId: r.user_id,
      fullName: p.full_name,
      email: p.email,
      createdAt: p.created_at,
      firstSubscribedAt: p.first_subscribed_at,
      plan: r.plan,
      paymentMethod: r.payment_method,
      startedAt: r.started_at,
      expiresAt: r.expires_at,
      kiwifySubscriptionId: r.kiwify_subscription_id,
      status,
      renewalCount: (renewalMap[r.user_id] ?? 1) - 1, // -1 para excluir primeira compra
      utmSource: p.first_utm_source,
      utmCampaign: p.first_utm_campaign,
    };
  });

  return NextResponse.json({ data: rows, total: count ?? 0, page });
}
