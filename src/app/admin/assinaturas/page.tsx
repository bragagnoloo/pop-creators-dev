'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LineChart from '@/components/ui/LineChart';
import { PLANS } from '@/services/subscriptions';
import { whatsappLink } from '@/lib/whatsapp';
import { useRequireTab } from '@/lib/hooks/useRequireTab';
import type { PlanId } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type DisplayStatus = 'active' | 'cancelando' | 'expiring_soon' | 'expired' | 'refunded' | 'chargeback' | 'inactive';

const STATUS_CONFIG: Record<DisplayStatus, { label: string; variant: 'success' | 'warning' | 'default' | 'pink' }> = {
  active:        { label: 'Ativo',           variant: 'success'  },
  expiring_soon: { label: 'Vence em breve',  variant: 'warning'  },
  cancelando:    { label: 'Cancelando',      variant: 'warning'  },
  expired:       { label: 'Expirado',        variant: 'default'  },
  refunded:      { label: 'Reembolsado',     variant: 'default'  },
  chargeback:    { label: 'Chargeback',      variant: 'default'  },
  inactive:      { label: 'Inativo',         variant: 'default'  },
};

function statusBadge(status: string) {
  const cfg = STATUS_CONFIG[status as DisplayStatus] ?? { label: status, variant: 'default' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function methodLabel(method: string | null) {
  if (method === 'pix')         return 'PIX';
  if (method === 'credit_card') return 'Cartão';
  return '—';
}

const PRESET_OPTIONS = [
  { label: '7d',  value: 7  },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
  { label: '90d', value: 90 },
];

const STATUS_FILTER_OPTIONS = [
  { value: '',           label: 'Todos os status' },
  { value: 'active',     label: 'Ativo' },
  { value: 'cancelando', label: 'Cancelando' },
  { value: 'expired',    label: 'Expirado' },
  { value: 'refunded',   label: 'Reembolsado' },
  { value: 'chargeback', label: 'Chargeback' },
];

export default function AdminAssinaturasPage() {
  useRequireTab('assinaturas');
  const [days, setDays]           = useState(30);
  const [allTime, setAllTime]     = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]   = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const [page, setPage]           = useState(1);
  const [filterPlan, setFilterPlan]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [vencimentoView, setVencimentoView] = useState<'expiring' | 'expired'>('expiring');

  const statsUrl = (() => {
    if (allTime) return '/api/admin/subscriptions/stats?all=1';
    if (showCustom && customFrom && customTo)
      return `/api/admin/subscriptions/stats?from=${customFrom}&to=${customTo}`;
    return `/api/admin/subscriptions/stats?days=${days}`;
  })();

  const { data: stats } = useSWR(statsUrl, fetcher);

  const listParams = new URLSearchParams({ page: String(page), limit: '50' });
  if (filterPlan)   listParams.set('plan', filterPlan);
  if (filterStatus) listParams.set('status', filterStatus);
  if (filterMethod) listParams.set('payment_method', filterMethod);
  if (search)       listParams.set('search', search);
  const { data: list } = useSWR(`/api/admin/subscriptions/list?${listParams}`, fetcher);

  const snap    = stats?.snapshot ?? {};
  const period  = stats?.period   ?? {};
  const byPlan  = stats?.byPlan   ?? { monthly: 0, semester: 0, yearly: 0 };
  const bySource: { source: string; count: number }[]     = stats?.bySource   ?? [];
  const byCampaign: { campaign: string; count: number }[] = stats?.byCampaign ?? [];
  const byAd: { ad: string; count: number }[] = stats?.byAd ?? [];
  const maxAd = byAd[0]?.count ?? 1;
  const maxSource   = bySource[0]?.count   ?? 1;
  const maxCampaign = byCampaign[0]?.count ?? 1;
  const totalAtivos = stats?.totalAtivos ?? 0;

  const expiringSoon = (list?.data ?? []).filter(
    (r: Record<string, unknown>) => r.status === 'expiring_soon' || r.status === 'cancelando'
  );
  const expired = (list?.data ?? []).filter(
    (r: Record<string, unknown>) => r.status === 'expired'
  );
  const vencimentoRows = vencimentoView === 'expiring' ? expiringSoon : expired;

  function exportCSV() {
    const rows = list?.data ?? [];
    const headers = ['Nome','Email','Plano','Método','Status','Cadastro','Assinatura','Vence','Origem','Campanha','Renovações'];
    const lines = rows.map((r: Record<string, unknown>) => [
      r.fullName, r.email, r.plan, r.paymentMethod, r.status,
      r.createdAt    ? new Date(r.createdAt    as string).toLocaleDateString('pt-BR') : '',
      r.firstSubscribedAt ? new Date(r.firstSubscribedAt as string).toLocaleDateString('pt-BR') : '',
      r.expiresAt    ? new Date(r.expiresAt    as string).toLocaleDateString('pt-BR') : '',
      r.utmSource ?? '', r.utmCampaign ?? '', r.renewalCount,
    ].join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `assinantes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const periodLabel = allTime ? 'total'
    : showCustom && customFrom && customTo ? 'período'
    : `${days}d`;

  return (
    <div className="space-y-8 py-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Assinaturas</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            {PRESET_OPTIONS.map((opt) => (
              <button key={opt.value}
                onClick={() => { setDays(opt.value); setAllTime(false); setShowCustom(false); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  !allTime && !showCustom && days === opt.value
                    ? 'bg-popline-pink text-white' : 'text-text-secondary hover:text-white'
                }`}
              >{opt.label}</button>
            ))}
            <button onClick={() => { setAllTime(true); setShowCustom(false); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                allTime ? 'bg-popline-pink text-white' : 'text-text-secondary hover:text-white'
              }`}
            >Tudo</button>
            <button onClick={() => { setShowCustom(true); setAllTime(false); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                showCustom ? 'bg-popline-pink text-white' : 'text-text-secondary hover:text-white'
              }`}
            >Personalizado</button>
          </div>
          {showCustom && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs bg-background border border-border rounded-lg px-2 py-1.5" />
              <span className="text-text-secondary text-xs">até</span>
              <input type="date" value={customTo}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs bg-background border border-border rounded-lg px-2 py-1.5" />
            </div>
          )}
          <Button variant="secondary" onClick={exportCSV}>Exportar CSV</Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* LINHA 1 — Snapshot atual                                            */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <p className="text-xs text-text-secondary mb-2 font-medium uppercase tracking-wider">Estado atual</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <p className="text-xs text-text-secondary mb-1">Ativos</p>
            <p className="text-3xl font-bold text-green-400">{totalAtivos ?? '—'}</p>
            {snap.cancelando > 0 && (
              <p className="text-[10px] text-amber-400 mt-1">
                {snap.cancelando} sem renovação automática
              </p>
            )}
          </Card>
          <Card>
            <p className="text-xs text-text-secondary mb-1">Expirados</p>
            <p className="text-3xl font-bold">{snap.expirados ?? '—'}</p>
            <p className="text-[10px] text-text-secondary mt-1">perderam acesso</p>
          </Card>
          <Card>
            <p className="text-xs text-text-secondary mb-1">Reembolsados</p>
            <p className="text-3xl font-bold text-orange-400">{snap.reembolsados ?? '—'}</p>
          </Card>
          <Card>
            <p className="text-xs text-text-secondary mb-1">Chargebacks</p>
            <p className="text-3xl font-bold text-red-400">{snap.chargebacks ?? '—'}</p>
          </Card>
        </div>

        {/* MRR + LTV + ARPU */}
        <div className="mt-3 grid md:grid-cols-4 gap-3">
          <div className="px-4 py-3 rounded-xl bg-surface border border-border">
            <p className="text-xs text-text-secondary mb-0.5">MRR estimado</p>
            <p className="text-2xl font-bold gradient-text">{stats ? formatBRL(stats.mrr) : '—'}</p>
            <div className="flex gap-3 mt-1">
              {(['monthly','semester','yearly'] as PlanId[]).map(p => (
                <span key={p} className="text-[10px] text-text-secondary">
                  {PLANS[p].name.slice(0,3)}: <span className="text-text-primary">{byPlan[p] ?? 0}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="px-4 py-3 rounded-xl bg-surface border border-border">
            <p className="text-xs text-text-secondary mb-0.5">ARPU</p>
            <p className="text-2xl font-bold">{stats?.arpu ? formatBRL(stats.arpu) : '—'}</p>
            <p className="text-[10px] text-text-secondary mt-1">receita média por assinante/mês</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-surface border border-border">
            <p className="text-xs text-text-secondary mb-0.5">LTV observado</p>
            <p className="text-2xl font-bold">
              {stats?.ltvObservado ? formatBRL(stats.ltvObservado) : '—'}
            </p>
            <p className="text-[10px] text-text-secondary mt-1">média pago por usuário (real)</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-surface border border-border">
            <p className="text-xs text-text-secondary mb-0.5">LTV projetado</p>
            <p className="text-2xl font-bold">
              {stats?.ltvProjetado ? formatBRL(stats.ltvProjetado) : '—'}
            </p>
            <p className="text-[10px] text-text-secondary mt-1">
              {stats?.ltvProjetado ? 'ARPU ÷ churn mensal (30d)' : 'dados insuficientes'}
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* LINHA 2 — Período                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <p className="text-xs text-text-secondary mb-2 font-medium uppercase tracking-wider">
          Aconteceu no período ({periodLabel})
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <p className="text-xs text-text-secondary mb-1">Novos</p>
            <p className="text-3xl font-bold text-violet-400">{period.novos ?? '—'}</p>
            <p className="text-[10px] text-text-secondary mt-1">primeira assinatura</p>
          </Card>
          <Card>
            <p className="text-xs text-text-secondary mb-1">Renovações</p>
            <p className="text-3xl font-bold text-blue-400">{period.renovacoes ?? '—'}</p>
            <p className="text-[10px] text-text-secondary mt-1">re-assinatura</p>
          </Card>
          <Card>
            <p className="text-xs text-text-secondary mb-1">Expirados</p>
            <p className="text-3xl font-bold">{period.expirados ?? '—'}</p>
            <p className="text-[10px] text-text-secondary mt-1">perderam acesso</p>
          </Card>
          <Card>
            <p className="text-xs text-text-secondary mb-1">Reembolsos</p>
            <p className="text-3xl font-bold text-orange-400">{period.reembolsos ?? '—'}</p>
          </Card>
          <Card>
            <p className="text-xs text-text-secondary mb-1">Chargebacks</p>
            <p className="text-3xl font-bold text-red-400">{period.chargebacks ?? '—'}</p>
          </Card>
        </div>
      </div>

      {/* Gráfico + distribuição */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <h3 className="text-sm font-semibold mb-4">
            Assinantes por dia —{' '}
            {allTime ? 'todo o período (últimos 90d visíveis)'
              : showCustom && customFrom && customTo
              ? `${new Date(customFrom).toLocaleDateString('pt-BR')} a ${new Date(customTo).toLocaleDateString('pt-BR')}`
              : `últimos ${days} dias`}
          </h3>
          <LineChart
            data={stats?.dailySeries ?? []}
            lines={[
              { key: 'ativos', label: 'Ativos',  color: '#ec4899' },
              { key: 'novos',  label: 'Novos',   color: '#8b5cf6' },
            ]}
            height={200}
          />
        </Card>

        <Card>
          <h3 className="text-sm font-semibold mb-4">Distribuição por plano</h3>
          <div className="space-y-3">
            {(['monthly','semester','yearly'] as PlanId[]).map((plan) => {
              const count = byPlan[plan] ?? 0;
              const pct = totalAtivos > 0 ? Math.round((count / totalAtivos) * 100) : 0;
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{PLANS[plan].name}</span>
                    <span className="text-text-secondary">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5">
                    <div className="bg-popline-pink h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* UTM Analysis */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <h3 className="text-sm font-semibold mb-4">Conversões por origem</h3>
          {bySource.length === 0
            ? <p className="text-xs text-text-secondary text-center py-4">Sem dados no período</p>
            : <div className="space-y-2.5">{bySource.map(({ source, count }) => (
                <div key={source}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{source}</span>
                    <span className="text-text-secondary ml-2 shrink-0">{count}</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1">
                    <div className="bg-popline-pink h-1 rounded-full"
                      style={{ width: `${Math.round((count / maxSource) * 100)}%` }} />
                  </div>
                </div>
              ))}</div>
          }
        </Card>

        <Card>
          <h3 className="text-sm font-semibold mb-4">Conversões por campanha</h3>
          {byCampaign.length === 0
            ? <p className="text-xs text-text-secondary text-center py-4">Sem dados no período</p>
            : <div className="space-y-2.5">{byCampaign.map(({ campaign, count }) => (
                <div key={campaign}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate text-xs">{campaign}</span>
                    <span className="text-text-secondary ml-2 shrink-0">{count}</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1">
                    <div className="bg-violet-500 h-1 rounded-full"
                      style={{ width: `${Math.round((count / maxCampaign) * 100)}%` }} />
                  </div>
                </div>
              ))}</div>
          }
        </Card>

        <Card>
          <h3 className="text-sm font-semibold mb-4">Conversões por anúncio</h3>
          <p className="text-[10px] text-text-secondary mb-3">via utm_content</p>
          {byAd.length === 0
            ? <p className="text-xs text-text-secondary text-center py-4">Sem dados — adicione utm_content nos seus anúncios</p>
            : <div className="space-y-2.5">{byAd.map(({ ad, count }) => (
                <div key={ad}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate text-xs">{ad}</span>
                    <span className="text-text-secondary ml-2 shrink-0">{count}</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1">
                    <div className="bg-green-400 h-1 rounded-full"
                      style={{ width: `${Math.round((count / maxAd) * 100)}%` }} />
                  </div>
                </div>
              ))}</div>
          }
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <h3 className="text-sm font-semibold flex-1">Assinantes</h3>
          <div className="flex gap-2 flex-wrap">
            <input
              className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 w-44"
              placeholder="Buscar nome ou email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            />
            <select className="text-sm bg-background border border-border rounded-lg px-3 py-1.5"
              value={filterPlan} onChange={(e) => { setFilterPlan(e.target.value); setPage(1); }}>
              <option value="">Todos os planos</option>
              <option value="monthly">Mensal</option>
              <option value="semester">Semestral</option>
              <option value="yearly">Anual</option>
            </select>
            <select className="text-sm bg-background border border-border rounded-lg px-3 py-1.5"
              value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
              {STATUS_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="text-sm bg-background border border-border rounded-lg px-3 py-1.5"
              value={filterMethod} onChange={(e) => { setFilterMethod(e.target.value); setPage(1); }}>
              <option value="">Todos os métodos</option>
              <option value="pix">PIX</option>
              <option value="credit_card">Cartão</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 pr-4 font-medium text-text-secondary">Creator</th>
                <th className="py-3 px-2 font-medium text-text-secondary">Plano</th>
                <th className="py-3 px-2 font-medium text-text-secondary">Método</th>
                <th className="py-3 px-2 font-medium text-text-secondary">Assinatura</th>
                <th className="py-3 px-2 font-medium text-text-secondary">Vence</th>
                <th className="py-3 px-2 font-medium text-text-secondary">Status</th>
                <th className="py-3 px-2 font-medium text-text-secondary">Origem / Campanha</th>
                <th className="py-3 px-2 font-medium text-text-secondary">Ren.</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-border/40">
              {(list?.data ?? []).map((r: Record<string, unknown>) => (
                <tr key={r.userId as string} className="hover:bg-surface/50">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{r.fullName as string}</p>
                    <p className="text-xs text-text-secondary">{r.email as string}</p>
                  </td>
                  <td className="py-3 px-2 font-medium">
                    {PLANS[r.plan as PlanId]?.name ?? r.plan as string}
                  </td>
                  <td className="py-3 px-2 text-text-secondary">{methodLabel(r.paymentMethod as string)}</td>
                  <td className="py-3 px-2 text-text-secondary text-xs">
                    {r.firstSubscribedAt ? new Date(r.firstSubscribedAt as string).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="py-3 px-2 text-xs">
                    {r.expiresAt ? (
                      <span className={
                        (r.daysLeft as number) !== null && (r.daysLeft as number) <= 7 && (r.daysLeft as number) >= 0
                          ? 'text-amber-400 font-medium' : 'text-text-secondary'
                      }>
                        {new Date(r.expiresAt as string).toLocaleDateString('pt-BR')}
                        {(r.daysLeft as number) !== null && (r.daysLeft as number) >= 0 && (r.daysLeft as number) <= 30
                          ? <span className="ml-1 opacity-60">({r.daysLeft as number}d)</span> : null}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-2">{statusBadge(r.status as string)}</td>
                  <td className="py-3 px-2">
                    <p className="text-xs text-text-secondary truncate max-w-[110px]">{(r.utmSource as string) ?? '—'}</p>
                    {r.utmCampaign ? (
                      <p className="text-[10px] text-text-secondary/60 truncate max-w-[110px]">{r.utmCampaign as string}</p>
                    ) : null}
                  </td>
                  <td className="py-3 px-2 text-center text-text-secondary">{r.renewalCount as number}</td>
                </tr>
              ))}
              {!list && <tr><td colSpan={8} className="py-8 text-center text-text-secondary text-sm">Carregando...</td></tr>}
              {list?.data?.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-text-secondary text-sm">Nenhum assinante encontrado.</td></tr>}
            </tbody>
          </table>
        </div>

        {list && list.total > 50 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-text-secondary">{list.total} registros</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
              <span className="flex items-center px-3 text-text-secondary">Pág {page} / {Math.ceil(list.total / 50)}</span>
              <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(list.total / 50)}>Próxima</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Próximos vencimentos / Expirados */}
      {(expiringSoon.length > 0 || expired.length > 0) && (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
              <button
                onClick={() => setVencimentoView('expiring')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  vencimentoView === 'expiring'
                    ? 'bg-popline-pink text-white'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                Prestes a expirar ({expiringSoon.length})
              </button>
              <button
                onClick={() => setVencimentoView('expired')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  vencimentoView === 'expired'
                    ? 'bg-popline-pink text-white'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                Expirados ({expired.length})
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-medium text-text-secondary">Creator</th>
                  <th className="py-2 px-2 font-medium text-text-secondary">Plano</th>
                  <th className="py-2 px-2 font-medium text-text-secondary">
                    {vencimentoView === 'expiring' ? 'Vence em' : 'Expirou'}
                  </th>
                  <th className="py-2 px-2 font-medium text-text-secondary">Método</th>
                  <th className="py-2 px-2 font-medium text-text-secondary">Status</th>
                  <th className="py-2 px-2 font-medium text-text-secondary">WhatsApp</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-b [&>tr]:border-border/40">
                {vencimentoRows.map((r: Record<string, unknown>) => {
                  const waUrl = whatsappLink(r.whatsapp as string | null);
                  const daysLeft = r.daysLeft as number | null;
                  return (
                    <tr key={r.userId as string}>
                      <td className="py-2 pr-4">
                        <p className="font-medium">{r.fullName as string}</p>
                        <p className="text-xs text-text-secondary">{r.email as string}</p>
                      </td>
                      <td className="py-2 px-2">{PLANS[r.plan as PlanId]?.name}</td>
                      <td className="py-2 px-2">
                        {daysLeft === null ? (
                          <span className="text-text-secondary/50">—</span>
                        ) : vencimentoView === 'expiring' ? (
                          <span className="text-amber-400 font-medium">{daysLeft}d</span>
                        ) : (
                          <span className="text-red-400 font-medium">há {Math.abs(daysLeft)}d</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-text-secondary">{methodLabel(r.paymentMethod as string)}</td>
                      <td className="py-2 px-2">{statusBadge(r.status as string)}</td>
                      <td className="py-2 px-2">
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            title={`Abrir conversa: ${r.whatsapp as string}`}
                          >
                            <WhatsAppIcon />
                          </a>
                        ) : (
                          <span className="text-text-secondary/50">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {vencimentoRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-text-secondary text-sm">
                      Nenhum {vencimentoView === 'expiring' ? 'vencimento próximo' : 'expirado'} nesta página.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.768.967-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  );
}
