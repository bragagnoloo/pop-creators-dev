import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { PLANS } from '@/services/subscriptions';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const sp = req.nextUrl.searchParams;
  const allTime   = sp.get('all') === '1';
  const fromParam = sp.get('from');
  const toParam   = sp.get('to');
  const daysRaw   = parseInt(sp.get('days') ?? '30');
  const daysPreset = [7, 14, 30, 60, 90].includes(daysRaw) ? daysRaw : 30;

  let fromISO = '';
  let toISO   = '';
  let periodDays = daysPreset;

  if (allTime) {
    fromISO    = '';
    toISO      = '';
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

  // =========================================================================
  // LINHA 1 — Snapshot atual (sem filtro de data)
  // =========================================================================

  const [activoRes, cancelandoRes, expiradoRes, refundedRes, chargebackRes] = await Promise.all([
    // Ativos: active + expires_at no futuro + tem renovação
    supabase.from('subscriptions').select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active')
      .not('kiwify_subscription_id', 'is', null)
      .or(`expires_at.is.null,expires_at.gt.${now}`),

    // Cancelando: active + expires_at no futuro + SEM renovação
    supabase.from('subscriptions').select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active')
      .is('kiwify_subscription_id', null)
      .gt('expires_at', now),

    // Expirado: active mas expires_at no passado
    supabase.from('subscriptions').select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active')
      .lt('expires_at', now),

    // Reembolsado
    supabase.from('subscriptions').select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'refunded'),

    // Chargeback
    supabase.from('subscriptions').select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'chargeback'),
  ]);

  const snapshot = {
    ativos:       activoRes.count     ?? 0,
    cancelando:   cancelandoRes.count ?? 0,
    expirados:    expiradoRes.count   ?? 0,
    reembolsados: refundedRes.count   ?? 0,
    chargebacks:  chargebackRes.count ?? 0,
  };

  // MRR — baseado nos ativos (não expirados, incluindo "Cancelando" pois ainda pagam)
  const totalAtivos = snapshot.ativos + snapshot.cancelando;
  const { data: planRows } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('subscription_status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  const byPlan = { monthly: 0, semester: 0, yearly: 0 };
  for (const r of planRows ?? []) {
    if (r.plan in byPlan) byPlan[r.plan as keyof typeof byPlan]++;
  }
  const mrr =
    byPlan.monthly  * PLANS.monthly.priceTotal +
    byPlan.semester * (PLANS.semester.priceTotal / 6) +
    byPlan.yearly   * (PLANS.yearly.priceTotal / 12);

  // =========================================================================
  // LINHA 2 — Métricas do período (respeitam filtro de data)
  // =========================================================================

  // Builder para queries de eventos com date filter
  function eventPeriodQuery(eventType: string | string[]) {
    let q = supabase.from('subscription_events').select('*', { count: 'exact', head: true });
    if (Array.isArray(eventType)) q = q.in('event_type', eventType);
    else q = q.eq('event_type', eventType);
    if (fromISO) q = q.gte('created_at', fromISO);
    if (toISO)   q = q.lte('created_at', toISO);
    return q;
  }

  // Novos e Renovações — requerem join com profiles (usar SQL via RPC não disponível, fazemos em memória)
  const orderApprovedQuery = supabase
    .from('subscription_events')
    .select('user_id, created_at')
    .eq('event_type', 'order_approved');

  const filteredQuery = fromISO
    ? (toISO ? orderApprovedQuery.gte('created_at', fromISO).lte('created_at', toISO)
             : orderApprovedQuery.gte('created_at', fromISO))
    : orderApprovedQuery;

  const { data: orderApprovedRows } = await filteredQuery;

  // Busca first_subscribed_at dos usuários únicos
  const uniqueUserIds = [...new Set((orderApprovedRows ?? []).map(r => r.user_id).filter(Boolean))];
  let novos = 0;
  let renovacoes = 0;

  if (uniqueUserIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, first_subscribed_at')
      .in('id', uniqueUserIds);

    const profileMap = new Map((profileRows ?? []).map(p => [p.id, p.first_subscribed_at]));

    for (const event of orderApprovedRows ?? []) {
      const firstSub = profileMap.get(event.user_id);
      const eventTime = new Date(event.created_at).getTime();
      const firstTime = firstSub ? new Date(firstSub).getTime() : null;

      // Se first_subscribed_at não existe ou é igual ao evento (±1h) = primeira vez
      if (!firstTime || Math.abs(eventTime - firstTime) < 3600000) {
        novos++;
      } else {
        renovacoes++;
      }
    }
  }

  // subscription_renewed conta como renovação também
  const { count: renewedCount } = await eventPeriodQuery('subscription_renewed');
  renovacoes += renewedCount ?? 0;

  // Expirados no período — subscriptions que expiraram dentro do intervalo
  let expiradosPeriodo = 0;
  if (fromISO) {
    const expiradoQ = supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active')
      .gte('expires_at', fromISO)
      .lt('expires_at', toISO || now);
    const { count } = await expiradoQ;
    expiradosPeriodo = count ?? 0;
  }

  const [refundPeriodRes, chargebackPeriodRes] = await Promise.all([
    eventPeriodQuery(['order_refunded', 'compra_reembolsada']),
    eventPeriodQuery('chargeback'),
  ]);

  const period = {
    novos,
    renovacoes,
    expirados:   expiradosPeriodo,
    reembolsos:  refundPeriodRes.count   ?? 0,
    chargebacks: chargebackPeriodRes.count ?? 0,
  };

  // =========================================================================
  // Série diária (para o gráfico)
  // =========================================================================
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
    .select('started_at, expires_at, subscription_status');

  const dailySeries = Array.from({ length: seriesLen }, (_, i) => {
    const d = new Date(new Date(seriesFrom).getTime() + i * 86400000);
    d.setHours(23, 59, 59);
    const date = d.toISOString().slice(0, 10);
    const active = (subRows ?? []).filter((s) => {
      if (s.subscription_status !== 'active') return false;
      const started = new Date(s.started_at).getTime();
      const expires = s.expires_at ? new Date(s.expires_at).getTime() : Infinity;
      return started <= d.getTime() && expires >= d.getTime();
    }).length;
    return { date, novos: dailyNewMap[date] ?? 0, ativos: active };
  });

  // =========================================================================
  // UTM breakdown (período)
  // =========================================================================
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

  const [srcEntries, campEntries, adEntries] = await Promise.all([
    utmBreakdown('utm_source', 'order_approved'),
    utmBreakdown('utm_campaign', 'order_approved'),
    utmBreakdown('utm_content', 'order_approved'),   // anúncio específico
  ]);

  const totalWithUTM = srcEntries.reduce((s, [, c]) => s + c, 0);
  const direto = novos + renovacoes - totalWithUTM;
  const bySource = [
    ...srcEntries.map(([source, count]) => ({ source, count })),
    ...(direto > 0 ? [{ source: '(direto)', count: direto }] : []),
  ].sort((a, b) => b.count - a.count);

  return NextResponse.json({
    // Linha 1 — snapshot atual
    snapshot,
    totalAtivos,
    mrr: Math.round(mrr * 100) / 100,
    byPlan,
    // Linha 2 — período
    period,
    // Gráfico
    dailySeries,
    // UTM
    bySource,
    byCampaign:    campEntries.map(([campaign, count]) => ({ campaign, count })),
    byAd: adEntries.map(([ad, count]) => ({ ad, count })),
    // Meta
    periodDays,
    allTime,
  });
}
