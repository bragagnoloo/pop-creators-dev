'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LineChart from '@/components/ui/LineChart';
import { PLANS } from '@/services/subscriptions';
import type { PlanId } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusBadge(status: string) {
  const map: Record<string, { variant: 'success' | 'warning' | 'default' | 'pink'; label: string }> = {
    active:            { variant: 'success', label: 'Ativo' },
    expiring_soon:     { variant: 'warning',  label: 'Vence em breve' },
    expired:           { variant: 'default',  label: 'Expirado' },
    cancelled_pending: { variant: 'default',  label: 'Cancelado' },
  };
  const s = map[status] ?? { variant: 'default', label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function methodLabel(method: string | null) {
  if (method === 'pix') return 'PIX';
  if (method === 'credit_card') return 'Cartão';
  return '—';
}

const PERIOD_OPTIONS = [
  { label: '7 dias',  value: 7  },
  { label: '14 dias', value: 14 },
  { label: '30 dias', value: 30 },
  { label: '60 dias', value: 60 },
  { label: '90 dias', value: 90 },
];

export default function AdminAssinaturasPage() {
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [filterPlan, setFilterPlan] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: stats } = useSWR(`/api/admin/subscriptions/stats?days=${days}`, fetcher);

  const listParams = new URLSearchParams({ page: String(page), limit: '50' });
  if (filterPlan)   listParams.set('plan', filterPlan);
  if (filterMethod) listParams.set('payment_method', filterMethod);
  if (search)       listParams.set('search', search);
  const { data: list } = useSWR(`/api/admin/subscriptions/list?${listParams}`, fetcher);

  const totalActive = stats?.activeCount ?? 0;
  const byPlan = stats?.byPlan ?? { monthly: 0, semester: 0, yearly: 0 };
  const bySource: { source: string; count: number }[] = stats?.bySource ?? [];
  const byCampaign: { campaign: string; count: number }[] = stats?.byCampaign ?? [];
  const churnBySource: { source: string; count: number }[] = stats?.churnBySource ?? [];
  const maxSource = bySource[0]?.count ?? 1;
  const maxCampaign = byCampaign[0]?.count ?? 1;

  const expiringSoon = (list?.data ?? []).filter(
    (r: Record<string, unknown>) => r.status === 'expiring_soon'
  );

  function exportCSV() {
    const rows = list?.data ?? [];
    const headers = ['Nome','Email','Plano','Método','Cadastro','Assinatura','Vence','Status','Origem','Campanha','Renovações'];
    const lines = rows.map((r: Record<string, unknown>) => [
      r.fullName, r.email, r.plan, r.paymentMethod,
      r.createdAt ? new Date(r.createdAt as string).toLocaleDateString('pt-BR') : '',
      r.firstSubscribedAt ? new Date(r.firstSubscribedAt as string).toLocaleDateString('pt-BR') : '',
      r.expiresAt ? new Date(r.expiresAt as string).toLocaleDateString('pt-BR') : '',
      r.status, r.utmSource ?? '', r.utmCampaign ?? '', r.renewalCount,
    ].join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `assinantes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-8 py-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Assinaturas</h1>
        <div className="flex items-center gap-3">
          {/* Filtro de período */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  days === opt.value
                    ? 'bg-popline-pink text-white'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={exportCSV}>Exportar CSV</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-text-secondary mb-1">Ativos agora</p>
          <p className="text-3xl font-bold">{totalActive}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary mb-1">Novos ({days}d)</p>
          <p className="text-3xl font-bold">{stats?.newInPeriod ?? '—'}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary mb-1">Churn ({days}d)</p>
          <p className="text-3xl font-bold">
            {stats?.churnInPeriod ?? '—'}
            {stats?.churnRate != null && (
              <span className="text-sm font-normal text-text-secondary ml-1">({stats.churnRate}%)</span>
            )}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary mb-1">MRR</p>
          <p className="text-3xl font-bold">{stats ? formatBRL(stats.mrr) : '—'}</p>
        </Card>
      </div>

      {/* Gráfico + distribuição por plano */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <h3 className="text-sm font-semibold mb-4">
            Assinantes por dia — últimos {days} dias
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
            {(['monthly', 'semester', 'yearly'] as PlanId[]).map((plan) => {
              const count = byPlan[plan] ?? 0;
              const pct = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
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
            <div className="pt-2 border-t border-border text-xs text-text-secondary">
              Renovações no período: <span className="text-text-primary font-medium">{stats?.renewalsInPeriod ?? '—'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ANÁLISE DE ORIGEM (UTM)                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* Conversões por fonte */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Conversões por origem</h3>
          {bySource.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-4">Sem dados no período</p>
          ) : (
            <div className="space-y-2.5">
              {bySource.map(({ source, count }) => (
                <div key={source}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{source}</span>
                    <span className="text-text-secondary ml-2 shrink-0">{count}</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1">
                    <div
                      className="bg-popline-pink h-1 rounded-full"
                      style={{ width: `${Math.round((count / maxSource) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Conversões por campanha */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Conversões por campanha</h3>
          {byCampaign.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-4">Sem dados no período</p>
          ) : (
            <div className="space-y-2.5">
              {byCampaign.map(({ campaign, count }) => (
                <div key={campaign}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate text-xs">{campaign}</span>
                    <span className="text-text-secondary ml-2 shrink-0">{count}</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1">
                    <div
                      className="bg-violet-500 h-1 rounded-full"
                      style={{ width: `${Math.round((count / maxCampaign) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Churn por fonte */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Churn por origem</h3>
          {churnBySource.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-4">Sem churn no período</p>
          ) : (
            <div className="space-y-2.5">
              {churnBySource.map(({ source, count }) => (
                <div key={source}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{source}</span>
                    <span className="text-amber-400 ml-2 shrink-0">{count}</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1">
                    <div
                      className="bg-amber-400 h-1 rounded-full"
                      style={{ width: `${Math.round((count / (churnBySource[0]?.count ?? 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Tabela de assinantes */}
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
            <select
              className="text-sm bg-background border border-border rounded-lg px-3 py-1.5"
              value={filterPlan}
              onChange={(e) => { setFilterPlan(e.target.value); setPage(1); }}
            >
              <option value="">Todos os planos</option>
              <option value="monthly">Mensal</option>
              <option value="semester">Semestral</option>
              <option value="yearly">Anual</option>
            </select>
            <select
              className="text-sm bg-background border border-border rounded-lg px-3 py-1.5"
              value={filterMethod}
              onChange={(e) => { setFilterMethod(e.target.value); setPage(1); }}
            >
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
                <th className="py-3 px-2 font-medium text-text-secondary">Auto</th>
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
                  <td className="py-3 px-2 text-text-secondary text-xs">
                    {r.expiresAt ? new Date(r.expiresAt as string).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="py-3 px-2">{statusBadge(r.status as string)}</td>
                  <td className="py-3 px-2">
                    <p className="text-xs text-text-secondary truncate max-w-[120px]">
                      {(r.utmSource as string) ?? '—'}
                    </p>
                    {r.utmCampaign ? (
                      <p className="text-[10px] text-text-secondary/60 truncate max-w-[120px]">
                        {r.utmCampaign as string}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3 px-2 text-center text-text-secondary">{r.renewalCount as number}</td>
                  <td className="py-3 px-2 text-center">
                    {r.kiwifySubscriptionId
                      ? <span className="text-green-400 text-xs">✓</span>
                      : <span className="text-text-secondary/40 text-xs">—</span>}
                  </td>
                </tr>
              ))}
              {!list && (
                <tr><td colSpan={9} className="py-8 text-center text-text-secondary text-sm">Carregando...</td></tr>
              )}
              {list?.data?.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-text-secondary text-sm">Nenhum assinante encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {list && list.total > 50 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-text-secondary">{list.total} assinantes</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
              <span className="flex items-center px-3 text-text-secondary">Pág {page} / {Math.ceil(list.total / 50)}</span>
              <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(list.total / 50)}>Próxima</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Próximos vencimentos */}
      {expiringSoon.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-4">Próximos vencimentos — 7 dias ({expiringSoon.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-medium text-text-secondary">Creator</th>
                  <th className="py-2 px-2 font-medium text-text-secondary">Plano</th>
                  <th className="py-2 px-2 font-medium text-text-secondary">Vence em</th>
                  <th className="py-2 px-2 font-medium text-text-secondary">Método</th>
                  <th className="py-2 px-2 font-medium text-text-secondary">Auto-renova</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-b [&>tr]:border-border/40">
                {expiringSoon.map((r: Record<string, unknown>) => {
                  const daysLeft = r.expiresAt
                    ? Math.ceil((new Date(r.expiresAt as string).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <tr key={r.userId as string}>
                      <td className="py-2 pr-4">
                        <p className="font-medium">{r.fullName as string}</p>
                        <p className="text-xs text-text-secondary">{r.email as string}</p>
                      </td>
                      <td className="py-2 px-2">{PLANS[r.plan as PlanId]?.name}</td>
                      <td className="py-2 px-2">
                        <span className="text-yellow-400 font-medium">{daysLeft != null ? `${daysLeft}d` : '—'}</span>
                      </td>
                      <td className="py-2 px-2 text-text-secondary">{methodLabel(r.paymentMethod as string)}</td>
                      <td className="py-2 px-2">
                        {r.kiwifySubscriptionId
                          ? <span className="text-green-400 text-xs">✓ Sim</span>
                          : <span className="text-yellow-400 text-xs">⚠ Não</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
