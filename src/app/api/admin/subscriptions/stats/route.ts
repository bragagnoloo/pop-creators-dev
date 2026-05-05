import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { PLANS } from '@/services/subscriptions';

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const supabase = createAdminClient();

  // Assinantes ativos agora
  const { count: activeCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .neq('plan', 'free')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  // Novos últimos 30 dias (order_approved)
  const { count: newLast30 } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'order_approved')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

  // Churn últimos 30 dias (refunds)
  const { count: churnLast30 } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .in('event_type', ['order_refunded', 'compra_reembolsada', 'chargeback'])
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

  // Distribuição por plano
  const { data: planRows } = await supabase
    .from('subscriptions')
    .select('plan')
    .neq('plan', 'free')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  const byPlan = { monthly: 0, semester: 0, yearly: 0 };
  for (const row of planRows ?? []) {
    if (row.plan in byPlan) byPlan[row.plan as keyof typeof byPlan]++;
  }

  // MRR
  const mrr =
    byPlan.monthly  * PLANS.monthly.priceTotal +
    byPlan.semester * (PLANS.semester.priceTotal / 6) +
    byPlan.yearly   * (PLANS.yearly.priceTotal / 12);

  // Novas assinaturas por dia — últimos 30 dias
  const { data: dailyNewRows } = await supabase
    .from('subscription_events')
    .select('created_at')
    .eq('event_type', 'order_approved')
    .gte('created_at', new Date(Date.now() - 29 * 86400000).toISOString());

  const dailyNewMap: Record<string, number> = {};
  for (const row of dailyNewRows ?? []) {
    const day = row.created_at.slice(0, 10);
    dailyNewMap[day] = (dailyNewMap[day] ?? 0) + 1;
  }

  // Gerar série de 30 dias
  const dailyNew = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    const date = d.toISOString().slice(0, 10);
    return { date, count: dailyNewMap[date] ?? 0 };
  });

  // Ativos por dia via subscriptions (para cada dia dos últimos 30)
  const { data: subRows } = await supabase
    .from('subscriptions')
    .select('started_at, expires_at, plan')
    .neq('plan', 'free');

  const dailyActive = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    d.setHours(23, 59, 59);
    const date = d.toISOString().slice(0, 10);
    const count = (subRows ?? []).filter((s) => {
      const started = new Date(s.started_at).getTime();
      const expires = s.expires_at ? new Date(s.expires_at).getTime() : Infinity;
      return started <= d.getTime() && expires >= d.getTime();
    }).length;
    return { date, count };
  });

  const churnRate = newLast30 && (newLast30 > 0)
    ? Math.round(((churnLast30 ?? 0) / newLast30) * 100)
    : 0;

  return NextResponse.json({
    activeCount: activeCount ?? 0,
    newLast30: newLast30 ?? 0,
    churnLast30: churnLast30 ?? 0,
    churnRate,
    mrr: Math.round(mrr * 100) / 100,
    byPlan,
    dailyNew,
    dailyActive,
  });
}
