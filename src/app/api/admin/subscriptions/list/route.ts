import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';

// Derive display status from subscription fields
function deriveStatus(sub: {
  subscription_status: string;
  expires_at: string | null;
  kiwify_subscription_id: string | null;
  assigned_by: string;
}): string {
  const now = Date.now();
  if (sub.subscription_status === 'refunded')   return 'refunded';
  if (sub.subscription_status === 'chargeback') return 'chargeback';
  if (sub.subscription_status === 'active') {
    const expiry = sub.expires_at ? new Date(sub.expires_at).getTime() : null;
    if (expiry && expiry < now) return 'expired';
    // "Cancelando" só se veio de pagamento e perdeu o kiwify_subscription_id (cancelou renovação)
    // Ativações manuais (admin/payment sem ID) ficam como ativo
    if (!sub.kiwify_subscription_id && sub.assigned_by === 'payment') return 'cancelando';
    const daysLeft = expiry ? Math.ceil((expiry - now) / 86400000) : null;
    if (daysLeft !== null && daysLeft <= 7) return 'expiring_soon';
    return 'active';
  }
  return 'inactive';
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = req.nextUrl;
  const page    = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
  const limit   = Math.min(100, parseInt(searchParams.get('limit') ?? '50'));
  const plan    = searchParams.get('plan');
  const method  = searchParams.get('payment_method');
  const status  = searchParams.get('status');
  const search  = searchParams.get('search')?.trim();
  const offset  = (page - 1) * limit;

  const supabase = createAdminClient();

  // Busca por nome/email exige pré-fetch dos user_ids — o .or() do PostgREST
  // não interpreta dot-notation de tabela aninhada de forma confiável
  let userIdsForSearch: string[] | null = null;
  if (search) {
    const { data: matches } = await supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    userIdsForSearch = (matches ?? []).map(m => m.id);
    if (userIdsForSearch.length === 0) {
      return NextResponse.json({ data: [], total: 0, page });
    }
  }

  // Inclui todos que já tiveram assinatura paga (exceto free nunca assinado)
  let query = supabase
    .from('subscriptions')
    .select(`
      user_id, plan, started_at, expires_at,
      kiwify_subscription_id, payment_method, subscription_status, assigned_by,
      profiles!inner(
        full_name, email, created_at,
        first_subscribed_at, first_utm_source, first_utm_campaign
      )
    `, { count: 'exact' })
    .neq('subscription_status', 'free');

  if (plan)             query = query.eq('plan', plan);
  if (method)           query = query.eq('payment_method', method);
  if (userIdsForSearch) query = query.in('user_id', userIdsForSearch);

  // Filtro de status — aplicado após fetch por ser derivado
  query = query.order('started_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Contagem de renovações por usuário
  const userIds = (data ?? []).map((r) => r.user_id);
  let renewalMap: Record<string, number> = {};
  if (userIds.length > 0) {
    const { data: renewalRows } = await supabase
      .from('subscription_events')
      .select('user_id')
      .in('user_id', userIds)
      .in('event_type', ['order_approved', 'subscription_renewed']);
    for (const row of renewalRows ?? []) {
      renewalMap[row.user_id] = (renewalMap[row.user_id] ?? 0) + 1;
    }
  }

  type ProfileJoin = {
    full_name: string;
    email: string;
    created_at: string;
    first_subscribed_at: string | null;
    first_utm_source: string | null;
    first_utm_campaign: string | null;
  };

  let rows = (data ?? []).map((r) => {
    const p = r.profiles as unknown as ProfileJoin;
    const derivedStatus = deriveStatus({
      subscription_status:    r.subscription_status,
      expires_at:             r.expires_at,
      kiwify_subscription_id: r.kiwify_subscription_id,
      assigned_by:            r.assigned_by,
    });

    const expiry = r.expires_at ? new Date(r.expires_at).getTime() : null;
    const daysLeft = expiry ? Math.ceil((expiry - Date.now()) / 86400000) : null;

    return {
      userId:               r.user_id,
      fullName:             p.full_name,
      email:                p.email,
      createdAt:            p.created_at,
      firstSubscribedAt:    p.first_subscribed_at,
      plan:                 r.plan,
      paymentMethod:        r.payment_method,
      startedAt:            r.started_at,
      expiresAt:            r.expires_at,
      daysLeft,
      kiwifySubscriptionId: r.kiwify_subscription_id,
      subscriptionStatus:   r.subscription_status,
      status:               derivedStatus,
      // -1 para excluir a primeira compra da contagem de renovações
      renewalCount:         Math.max(0, (renewalMap[r.user_id] ?? 1) - 1),
      utmSource:            p.first_utm_source,
      utmCampaign:          p.first_utm_campaign,
    };
  });

  // Filtro de status derivado (não existe como coluna, filtrar em memória)
  if (status) {
    rows = rows.filter((r) => r.status === status);
  }

  return NextResponse.json({ data: rows, total: count ?? 0, page });
}
