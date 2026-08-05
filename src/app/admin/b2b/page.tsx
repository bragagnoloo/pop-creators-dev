'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import B2BBigNumbers from '@/components/admin/b2b/B2BBigNumbers';
import B2BTriageBar from '@/components/admin/b2b/B2BTriageBar';
import B2BDetailPanel from '@/components/admin/b2b/B2BDetailPanel';
import B2BTable, {
  VIEW_MODES,
  type SortKey,
  type SortState,
  type ViewMode,
} from '@/components/admin/b2b/B2BTable';
import { useRequireMasterAdmin } from '@/lib/hooks/useRequireMasterAdmin';
import { assessRisk } from '@/lib/b2b-risk';
import { matchesAlert, type B2BAlertKey } from '@/lib/b2b-alerts';
import { formatBRDate } from '@/lib/date-br';
import {
  B2B_LIST_KEY,
  b2bFetcher,
  toB2BRow,
  toPlatformMeta,
  computeTotals,
  patchFinance,
  type B2BListResponse,
} from '@/services/b2b-finance';
import type {
  B2BCampaignType,
  Campaign,
  B2BFinancePatch,
  B2BFinanceRow,
  B2BFinanceStatus,
} from '@/types';

const SELECT_CLASS =
  'bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary ' +
  'focus:outline-none focus:border-popline-pink transition-colors';

const TYPE_LABEL: Record<B2BCampaignType, string> = {
  standard: 'Padrão',
  review: 'Review',
  invite: 'Convite',
};

const CAMPAIGN_STATUS_LABEL: Record<Campaign['status'], string> = {
  open: 'Vagas Abertas',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
};

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export default function AdminB2BPage() {
  useRequireMasterAdmin();

  const { data, error, isLoading, mutate } = useSWR<B2BListResponse>(
    B2B_LIST_KEY,
    b2bFetcher,
    { keepPreviousData: true }
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('receita');
  const [alertFilter, setAlertFilter] = useState<B2BAlertKey | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | B2BCampaignType>('');
  const [statusFilter, setStatusFilter] = useState<'' | B2BFinanceStatus>('');
  // Risco decrescente por padrão: problema sempre no topo.
  const [sort, setSort] = useState<SortState>({ key: 'risk', dir: 'desc' });

  const rows = useMemo(() => (data?.data ?? []).map(toB2BRow), [data]);
  const meta = useMemo(() => (data?.meta ? toPlatformMeta(data.meta) : null), [data]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = rows.filter(r => {
      if (typeFilter && r.campaignType !== typeFilter) return false;
      if (statusFilter && r.financeStatus !== statusFilter) return false;
      if (alertFilter && !matchesAlert(r, alertFilter)) return false;
      if (term) {
        const haystack = `${r.title} ${r.payingCompany ?? ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    const dir = sort.dir === 'asc' ? 1 : -1;
    const value = (r: B2BFinanceRow): string | number | null => {
      if (sort.key === 'risk') return assessRisk(r).score;
      return r[sort.key] as string | number | null;
    };

    return [...filtered].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      // Nulos sempre no fim, independente da direção.
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'pt-BR') * dir;
    });
  }, [rows, search, typeFilter, statusFilter, alertFilter, sort]);

  // O painel aberto é também o filtro dos indicadores: uma interação, dois efeitos.
  const openRow = openId ? (rows.find(r => r.campaignId === openId) ?? null) : null;

  const totals = useMemo(
    () => computeTotals(openRow ? [openRow] : visible),
    [visible, openRow]
  );

  const handleSort = (key: SortKey) => {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'title' || key === 'payingCompany' ? 'asc' : 'desc' }
    );
  };

  /**
   * Grava e substitui SÓ a linha alterada no cache do SWR.
   *
   * Um mutate() simples refaria a busca da lista inteira a cada campo editado,
   * e o dedupingInterval global de 30s poderia devolver dado velho logo após a
   * gravação. A rota já devolve a linha recalculada.
   */
  const handlePatch = async (
    campaignId: string,
    patch: B2BFinancePatch
  ): Promise<string | null> => {
    const result = await patchFinance(campaignId, patch);
    if (!result.success) return result.error;

    await mutate(
      prev =>
        prev
          ? {
              ...prev,
              data: prev.data.map(r => (r.campaign_id === campaignId ? result.row : r)),
            }
          : prev,
      { revalidate: false }
    );
    return null;
  };

  const exportCSV = () => {
    const headers = [
      'Campanha', 'Tipo', 'Status da campanha', 'Empresa', 'Valor acordado',
      'Prazo pagamento', 'Estimativa pagamento', 'Status pagamento', 'Valor pago',
      'A receber', 'Creators contratados', 'Aptos', 'Abertura', 'Encerramento',
      'Prazo creators', 'Cache', 'Total a creators', 'A gerar', 'Imposto %',
      'Margem R$', 'Margem %', 'Em carteira', 'Pago aos creators',
      'Status financeiro', 'Risco',
    ];
    const lines = visible.map(r =>
      [
        r.title, TYPE_LABEL[r.campaignType], CAMPAIGN_STATUS_LABEL[r.campaignStatus],
        r.payingCompany ?? '', r.agreedValue ?? '', r.agreedPaymentDueDate ?? '',
        r.companyPaymentEstimate ?? '', r.companyPaymentStatus,
        r.companyPaidValue, r.companyOutstanding,
        r.contractedCreators ?? '', r.eligibleParticipants,
        formatBRDate(r.openedOn), formatBRDate(r.closedOn),
        formatBRDate(r.creatorPaymentDeadline), r.cache, r.totalDueCreators,
        r.pendingToGenerate, r.taxRate, r.marginValue ?? '', r.marginPct ?? '',
        r.walletTotal, r.paidTotal, r.financeStatus, assessRisk(r).score,
      ].map(csvEscape).join(';')
    );
    const csv = '﻿' + [headers.map(csvEscape).join(';'), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `b2b-financeiro-${formatBRDate(new Date().toISOString()).replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">B2B</h1>
        <Card>
          <p className="text-red-400 mb-4">{error.message}</p>
          <Button variant="secondary" onClick={() => mutate()}>
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-popline-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeMode = VIEW_MODES.find(m => m.key === viewMode)!;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">B2B</h1>
          <p className="text-sm text-text-secondary mt-1">
            Controle financeiro das campanhas. Clique numa linha para ver e editar.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCSV}>
          Exportar CSV
        </Button>
      </div>

      <B2BBigNumbers
        totals={totals}
        meta={meta}
        selectedTitle={openRow?.title ?? null}
        onClearSelection={() => setOpenId(null)}
      />

      <B2BTriageBar rows={rows} active={alertFilter} onToggle={setAlertFilter} />

      {/* Modos de visão */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="inline-flex bg-surface border border-border rounded-lg p-1">
          {VIEW_MODES.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => setViewMode(m.key)}
              title={m.description}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === m.key
                  ? 'bg-popline-pink text-white font-medium'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-secondary">{activeMode.description}</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar campanha ou empresa..."
          className={`${SELECT_CLASS} flex-1 min-w-[200px]`}
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as '' | B2BCampaignType)}
          className={SELECT_CLASS}
        >
          <option value="">Todos os tipos</option>
          <option value="standard">Padrão</option>
          <option value="review">Review</option>
          <option value="invite">Convite</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as '' | B2BFinanceStatus)}
          className={SELECT_CLASS}
        >
          <option value="">Todos os status</option>
          <option value="em_aberto">Em Aberto</option>
          <option value="finalizada">Finalizada</option>
        </select>
      </div>

      <B2BTable
        rows={visible}
        mode={viewMode}
        selectedId={openId}
        sort={sort}
        onSort={handleSort}
        onOpen={setOpenId}
      />

      <p className="mt-3 text-xs text-text-secondary">
        {visible.length} de {rows.length} campanha{rows.length === 1 ? '' : 's'} · sem
        paginação · datas no fuso de Brasília
      </p>

      {openRow && (
        <B2BDetailPanel row={openRow} onClose={() => setOpenId(null)} onPatch={handlePatch} />
      )}
    </div>
  );
}
