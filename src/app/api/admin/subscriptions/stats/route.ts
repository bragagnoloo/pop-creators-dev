import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { PLANS } from '@/services/subscriptions';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const sp = req.nextUrl.searchParams;

  // Modos:
  //   all=1                         → todo o período
  //   from=YYYY-MM-DD&to=YYYY-MM-DD → intervalo customizado
  //   days=N (padrão: 30)           → últimos N dias
  const allTime   = sp.get('all') === '1';
  const fromParam = sp.get('from');
  const toParam   = sp.get('to');
  const daysRaw   = parseInt(sp.get('days') ?? '30');
  const daysPreset = [7, 14, 30, 60, 90].includes(daysRaw) ? daysRaw : 30;

  let fromISO = '';
  let toISO   = '';
  let periodDays = daysPreset;

  if (allTime) {
    fromISO = '';
    toISO   = '';
    periodDays = 0;
  } else if (fromParam && toParam) {
    fromISO    = new Date(fromParam).toISOString();
    toISO      = new Date(`${toParam}T23:59:59`).toISOString();
    periodDays = Math.max(1, Math.ceil(
      (new Date(toISO).getTime() - new Date(fromISO).getTime()) / 86400000,
    ));
  } else {
    fromISO    = new Date(Date.now() - (daysPreset - 1) * 86400000).toISOString();
    toISO      = '';
    periodDays = daysPreset;
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Ativos agora
  const { count: activeCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .neq('plan', 'free')
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  // Builder de query de eventos com filtro de data
  function eventsBase(eventType: string | string[]) {
    let q = supabase.from('subscription_events').select('*', { count: 'exact', head: true });
    if (Array.isArray(eventType)) q = q.in('event_type', eventType);
    else q = q.eq('event_type', eventType);
    if (fromISO) q = q.gte('created_at', fromISO);
    if (toISO)   q = q.lte('created_at', toISO);
    return q;
  }

  const [newRes, churnRes, renewalRes] = await Promise.all([
    eventsBase('order_approved'),
    eventsBase(['order_refunded', 'compra_reembolsada', 'chargeback']),
    eventsBase('subscription_renewed'),
  ]);

  const newInPeriod      = newRes.count    ?? 0;
  const churnInPeriod    = churnRes.count  ?? 0;
  const renewalsInPeriod = renewalRes.count ?? 0;

  // Distribuição por plano + MRR
  const { data: planRows } = await supabase
    .from('subscriptions')
    .select('plan')
    .neq('plan', 'free')
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  const byPlan = { monthly: 0, semester: 0, yearly: 0 };
  for (const r of planRows ?? []) {
    if (r.plan in byPlan) byPlan[r.plan as keyof typeof byPlan]++;
  }

  const mrr =
    byPlan.monthly  * PLANS.monthly.priceTotal +
    byPlan.semester * (PLANS.semester.priceTotal / 6) +
    byPlan.yearly   * (PLANS.yearly.priceTotal / 12);

  // Série diária
  const seriesLen  = allTime ? 90 : Math.min(periodDays, 90);
  const seriesFrom = allTime
    ? new Date(Date.now() - 89 * 86400000).toISOString()
    : (fromISO || new Date(Date.now() - (seriesLen - 1) * 86400000).toISOString());

  const { data: dailyNewRows } = await supabase
    .from('subscription_events')
    .select('created_at')
    .eq('event_type', 'order_approved')
    .gte('created_at', seriesFrom);

  const dailyNewMap: Record<string, number> = {};
  for (const r of dailyNewRows ?? []) {
    const d = r.created_at.slice(0, 10);
    dailyNewMap[d] = (dailyNewMap[d] ?? 0) + 1;
  }

  const { data: subRows } = await supabase
    .from('subscriptions')
    .select('started_at, expires_at, plan')
    .neq('plan', 'free');

  const dailySeries = Array.from({ length: seriesLen }, (_, i) => {
    const d = new Date(new Date(seriesFrom).getTime() + i * 86400000);
    d.setHours(23, 59, 59);
    const date = d.toISOString().slice(0, 10);
    const active = (subRows ?? []).filter((s) => {
      const started = new Date(s.started_at).getTime();
      const expires = s.expires_at ? new Date(s.expires_at).getTime() : Infinity;
      return started <= d.getTime() && expires >= d.getTime();
    }).length;
    return { date, novos: dailyNewMap[date] ?? 0, ativos: active };
  });

  // UTM breakdown
  async function utmBreakdown(field: string, eventType: string | string[]) {
    let q = supabase.from('subscription_events').select(field).not(field, 'is', null);
    if (Array.isArray(eventType)) q = q.in('event_type', eventType);
    else q = q.eq('event_type', eventType);
    if (fromISO) q = q.gte('created_at', fromISO);
    if (toISO)   q = q.lte('created_at', toISO);
    const { data } = await q;
    const map: Record<string, number> = {};
    for (const row of data ?? []) {
      const val = String((row as unknown as Record<string, unknown>)[field] ?? '');
      if (val) map[val] = (map[val] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }

  const [srcEntries, campEntries, churnSrcEntries] = await Promise.all([
    utmBreakdown('utm_source', 'order_approved'),
    utmBreakdown('utm_campaign', 'order_approved'),
    utmBreakdown('utm_source', ['order_refunded', 'compra_reembolsada', 'chargeback']),
  ]);

  const totalWithUTM = srcEntries.reduce((s, [, c]) => s + c, 0);
  const direto = newInPeriod - totalWithUTM;
  const bySource = [
    ...srcEntries.map(([source, count]) => ({ source, count })),
    ...(direto > 0 ? [{ source: '(direto)', count: direto }] : []),
  ].sort((a, b) => b.count - a.count);

  return NextResponse.json({
    activeCount,
    newInPeriod,
    churnInPeriod,
    renewalsInPeriod,
    churnRate: newInPeriod > 0 ? Math.round((churnInPeriod / newInPeriod) * 100) : 0,
    mrr: Math.round(mrr * 100) / 100,
    byPlan,
    dailySeries,
    bySource,
    byCampaign:    campEntries.map(([campaign, count]) => ({ campaign, count })),
    churnBySource: churnSrcEntries.map(([source, count]) => ({ source, count })),
    periodDays,
    allTime,
  });
}
