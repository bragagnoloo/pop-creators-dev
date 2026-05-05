import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { PLANS } from '@/services/subscriptions';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = req.nextUrl;

  // Filtro de data — padrão: últimos 30 dias
  const daysParam = parseInt(searchParams.get('days') ?? '30');
  const days = [7, 14, 30, 60, 90].includes(daysParam) ? daysParam : 30;
  const from = new Date(Date.now() - (days - 1) * 86400000).toISOString();

  const supabase = createAdminClient();

  // Assinantes ativos agora
  const { count: activeCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .neq('plan', 'free')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  // Novos no período
  const { count: newInPeriod } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'order_approved')
    .gte('created_at', from);

  // Churn no período
  const { count: churnInPeriod } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .in('event_type', ['order_refunded', 'compra_reembolsada', 'chargeback'])
    .gte('created_at', from);

  // Renovações no período
  const { count: renewalsInPeriod } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'subscription_renewed')
    .gte('created_at', from);

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

  // -------------------------------------------------------------------------
  // Série diária (novos e ativos) para o período selecionado
  // -------------------------------------------------------------------------
  const { data: dailyNewRows } = await supabase
    .from('subscription_events')
    .select('created_at')
    .eq('event_type', 'order_approved')
    .gte('created_at', from);

  const dailyNewMap: Record<string, number> = {};
  for (const row of dailyNewRows ?? []) {
    const day = row.created_at.slice(0, 10);
    dailyNewMap[day] = (dailyNewMap[day] ?? 0) + 1;
  }

  const { data: subRows } = await supabase
    .from('subscriptions')
    .select('started_at, expires_at, plan')
    .neq('plan', 'free');

  const dailySeries = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    d.setHours(23, 59, 59);
    const date = d.toISOString().slice(0, 10);
    const active = (subRows ?? []).filter((s) => {
      const started = new Date(s.started_at).getTime();
      const expires = s.expires_at ? new Date(s.expires_at).getTime() : Infinity;
      return started <= d.getTime() && expires >= d.getTime();
    }).length;
    return { date, novos: dailyNewMap[date] ?? 0, ativos: active };
  });

  // -------------------------------------------------------------------------
  // Breakdown por utm_source (top 8 no período)
  // -------------------------------------------------------------------------
  const { data: utmSourceRows } = await supabase
    .from('subscription_events')
    .select('utm_source')
    .eq('event_type', 'order_approved')
    .gte('created_at', from)
    .not('utm_source', 'is', null);

  const utmSourceMap: Record<string, number> = {};
  for (const row of utmSourceRows ?? []) {
    const src = row.utm_source ?? '(direto)';
    utmSourceMap[src] = (utmSourceMap[src] ?? 0) + 1;
  }
  // Adicionar entradas sem utm_source como '(direto)'
  const totalWithUTM = Object.values(utmSourceMap).reduce((a, b) => a + b, 0);
  const direto = (newInPeriod ?? 0) - totalWithUTM;
  if (direto > 0) utmSourceMap['(direto)'] = direto;

  const bySource = Object.entries(utmSourceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([source, count]) => ({ source, count }));

  // -------------------------------------------------------------------------
  // Breakdown por utm_campaign (top 8 no período)
  // -------------------------------------------------------------------------
  const { data: utmCampaignRows } = await supabase
    .from('subscription_events')
    .select('utm_campaign')
    .eq('event_type', 'order_approved')
    .gte('created_at', from)
    .not('utm_campaign', 'is', null);

  const utmCampaignMap: Record<string, number> = {};
  for (const row of utmCampaignRows ?? []) {
    const c = row.utm_campaign ?? '';
    if (c) utmCampaignMap[c] = (utmCampaignMap[c] ?? 0) + 1;
  }

  const byCampaign = Object.entries(utmCampaignMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([campaign, count]) => ({ campaign, count }));

  // -------------------------------------------------------------------------
  // Churn por source
  // -------------------------------------------------------------------------
  const { data: churnSourceRows } = await supabase
    .from('subscription_events')
    .select('utm_source')
    .in('event_type', ['order_refunded', 'compra_reembolsada', 'chargeback'])
    .gte('created_at', from);

  const churnSourceMap: Record<string, number> = {};
  for (const row of churnSourceRows ?? []) {
    const src = row.utm_source ?? '(direto)';
    churnSourceMap[src] = (churnSourceMap[src] ?? 0) + 1;
  }

  const churnBySource = Object.entries(churnSourceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([source, count]) => ({ source, count }));

  const churnRate = (newInPeriod ?? 0) > 0
    ? Math.round(((churnInPeriod ?? 0) / (newInPeriod ?? 1)) * 100)
    : 0;

  return NextResponse.json({
    // KPIs
    activeCount:    activeCount ?? 0,
    newInPeriod:    newInPeriod ?? 0,
    churnInPeriod:  churnInPeriod ?? 0,
    renewalsInPeriod: renewalsInPeriod ?? 0,
    churnRate,
    mrr: Math.round(mrr * 100) / 100,
    // Distribuição
    byPlan,
    // Séries temporais
    dailySeries,
    // UTM breakdown
    bySource,
    byCampaign,
    churnBySource,
    // Meta
    days,
  });
}
