'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import B2BBigNumbers from '@/components/admin/b2b/B2BBigNumbers';
import B2BTriageBar from '@/components/admin/b2b/B2BTriageBar';
import B2BDetailPanel from '@/components/admin/b2b/B2BDetailPanel';
import B2BPackagesPanel from '@/components/admin/b2b/B2BPackagesPanel';
import B2BCardsView from '@/components/admin/b2b/B2BCardsView';
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
import { formatBRL } from '@/services/wallet';
import { CAMPAIGN_CATEGORIES, CAMPAIGN_CATEGORY_ORDER } from '@/lib/campaign-categories';
import {
  B2B_LIST_KEY,
  b2bFetcher,
  toB2BRow,
  toPlatformMeta,
  toB2BPackage,
  computeTotals,
  patchFinance,
  createPackage,
  updatePackage,
  deletePackage,
  summarizePackage,
  moneyFlow,
  monthKey,
  formatMonthKey,
  MONEY_FLOW_LABEL,
  PAYMENT_ROUTE_LABEL,
  type B2BListResponse,
} from '@/services/b2b-finance';
import type {
  B2BCampaignType,
  Campaign,
  B2BFinancePatch,
  B2BFinanceRow,
  B2BFinanceStatus,
  B2BPackagePatch,
} from '@/types';

/** Valor do filtro de pacote para "campanhas sem pacote". */
const NO_PACKAGE = '__avulsa';

const SELECT_CLASS =
  'bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary ' +
  'focus:outline-none focus:border-popline-pink transition-colors';

// shortLabel, e não adminLabel: este rótulo vai para o CSV exportado (ver
// handleExportCsv), então tem que continuar saindo 'Padrão'/'Convite'/'Review'
// como sempre saiu — o rótulo longo é só do form de campanhas.
const TYPE_LABEL = (type: B2BCampaignType) => CAMPAIGN_CATEGORIES[type].shortLabel;

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
  // Cards por mês é a visão padrão; a tabela fica para conferência detalhada.
  const [layout, setLayout] = useState<'cards' | 'tabela'>('cards');
  const [alertFilter, setAlertFilter] = useState<B2BAlertKey | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | B2BCampaignType>('');
  const [statusFilter, setStatusFilter] = useState<'' | B2BFinanceStatus>('');
  const [monthFilter, setMonthFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [packagesOpen, setPackagesOpen] = useState(false);
  // Risco decrescente por padrão: problema sempre no topo.
  const [sort, setSort] = useState<SortState>({ key: 'risk', dir: 'desc' });

  const rows = useMemo(() => (data?.data ?? []).map(toB2BRow), [data]);
  const meta = useMemo(() => (data?.meta ? toPlatformMeta(data.meta) : null), [data]);
  const packages = useMemo(() => (data?.packages ?? []).map(toB2BPackage), [data]);
  const packageById = useMemo(() => new Map(packages.map(p => [p.id, p])), [packages]);
  const packageNames = useMemo(
    () => Object.fromEntries(packages.map(p => [p.id, p.name])),
    [packages]
  );

  const titles = useMemo(
    () => Object.fromEntries(rows.map(r => [r.campaignId, r.title])),
    [rows]
  );
  const complementCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.complementsCampaignId) {
        counts[r.complementsCampaignId] = (counts[r.complementsCampaignId] ?? 0) + 1;
      }
    }
    return counts;
  }, [rows]);

  // Meses de abertura existentes, do mais recente para o mais antigo.
  const months = useMemo(
    () => [...new Set(rows.map(r => monthKey(r.openedOn)))].sort().reverse(),
    [rows]
  );

  // Contratante = empresa da campanha ou contratante do pacote dela.
  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.payingCompany) set.add(r.payingCompany);
    for (const p of packages) if (p.contractingCompany) set.add(p.contractingCompany);
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [rows, packages]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = rows.filter(r => {
      if (typeFilter && r.campaignType !== typeFilter) return false;
      if (statusFilter && r.financeStatus !== statusFilter) return false;
      if (alertFilter && !matchesAlert(r, alertFilter)) return false;
      if (monthFilter && monthKey(r.openedOn) !== monthFilter) return false;
      const pkg = r.packageId ? packageById.get(r.packageId) : undefined;
      if (packageFilter) {
        if (packageFilter === NO_PACKAGE ? Boolean(pkg) : r.packageId !== packageFilter) {
          return false;
        }
      }
      if (
        companyFilter &&
        r.payingCompany !== companyFilter &&
        pkg?.contractingCompany !== companyFilter
      ) {
        return false;
      }
      if (term) {
        const haystack =
          `${r.title} ${r.payingCompany ?? ''} ${pkg?.name ?? ''} ${pkg?.contractingCompany ?? ''}`.toLowerCase();
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
  }, [
    rows,
    search,
    typeFilter,
    statusFilter,
    alertFilter,
    monthFilter,
    companyFilter,
    packageFilter,
    packageById,
    sort,
  ]);

  const filteredPackage =
    packageFilter && packageFilter !== NO_PACKAGE ? (packageById.get(packageFilter) ?? null) : null;
  const filteredPackageSummary = filteredPackage ? summarizePackage(filteredPackage, rows) : null;

  // O painel aberto é também o filtro dos indicadores: uma interação, dois efeitos.
  const openRow = openId ? (rows.find(r => r.campaignId === openId) ?? null) : null;

  const totals = useMemo(
    () => computeTotals(openRow ? [openRow] : visible, rows),
    [visible, openRow, rows]
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

  /** Atualiza só a lista de pacotes no cache, sem refazer a busca. */
  const handlePackageResult = async (
    result: Awaited<ReturnType<typeof createPackage>>,
    mode: 'upsert' | 'delete'
  ): Promise<string | null> => {
    if (!result.success) return result.error;
    const saved = result.data;
    if (mode === 'delete') {
      if (packageFilter === saved.id) setPackageFilter('');
      // O banco desligou as campanhas do pacote (on delete set null): recarrega.
      await mutate();
      return null;
    }
    await mutate(
      prev => {
        if (!prev) return prev;
        const others = (prev.packages ?? []).filter(p => p.id !== saved.id);
        const list = [...others, saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        return { ...prev, packages: list };
      },
      { revalidate: false }
    );
    return null;
  };

  const handleCreatePackage = async (body: B2BPackagePatch) =>
    handlePackageResult(await createPackage(body), 'upsert');
  const handleUpdatePackage = async (id: string, body: B2BPackagePatch) =>
    handlePackageResult(await updatePackage(id, body), 'upsert');
  const handleDeletePackage = async (id: string) =>
    handlePackageResult(await deletePackage(id), 'delete');

  const exportCSV = () => {
    const headers = [
      'Campanha', 'Tipo', 'Status da campanha', 'Mês de abertura', 'Pacote',
      'Contratante do pacote', 'Empresa', 'Valor acordado',
      'Prazo pagamento', 'Estimativa pagamento', 'Status pagamento', 'Valor pago',
      'A receber', 'Creators contratados', 'Aptos', 'Abertura', 'Encerramento',
      'Prazo creators', 'Cache', 'Total a creators', 'A gerar', 'Imposto %',
      'Margem R$', 'Margem %', 'Em carteira', 'Pago aos creators',
      'Status financeiro', 'Risco', 'Recebimento', 'Complemento de', 'Emissão NF', 'Pagamento realizado',
      'Repasse líquido PC', 'Limite repasse', 'Status repasse', 'Repasse efetivo',
      'Onde está o dinheiro',
    ];
    const lines = visible.map(r =>
      [
        r.title, TYPE_LABEL(r.campaignType), CAMPAIGN_STATUS_LABEL[r.campaignStatus],
        formatMonthKey(monthKey(r.openedOn)),
        r.packageId ? (packageById.get(r.packageId)?.name ?? '') : '',
        r.packageId ? (packageById.get(r.packageId)?.contractingCompany ?? '') : '',
        r.payingCompany ?? '', r.agreedValue ?? '', r.agreedPaymentDueDate ?? '',
        r.companyPaymentEstimate ?? '', r.companyPaymentStatus,
        r.companyPaidValue, r.companyOutstanding,
        r.contractedCreators ?? '', r.eligibleParticipants,
        formatBRDate(r.openedOn), formatBRDate(r.closedOn),
        formatBRDate(r.creatorPaymentDeadline), r.cache, r.totalDueCreators,
        r.pendingToGenerate, r.taxRate, r.marginValue ?? '', r.marginPct ?? '',
        r.walletTotal, r.paidTotal, r.financeStatus, assessRisk(r).score,
        PAYMENT_ROUTE_LABEL[r.paymentRoute],
        r.complementsCampaignId ? (titles[r.complementsCampaignId] ?? '') : '',
        formatBRDate(r.nfIssuedAt), formatBRDate(r.companyLastPaymentAt), r.repasseNetValue,
        formatBRDate(r.repasseDueDate), r.repasseTransferred ? 'Transferido' : 'Não transferido',
        formatBRDate(r.repasseDoneAt), MONEY_FLOW_LABEL[moneyFlow(r)],
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
            Controle financeiro das campanhas. Clique numa campanha para ver e editar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPackagesOpen(true)}>
            Pacotes{packages.length > 0 ? ` (${packages.length})` : ''}
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            Exportar CSV
          </Button>
        </div>
      </div>

      <B2BBigNumbers
        totals={totals}
        meta={meta}
        selectedTitle={openRow?.title ?? null}
        onClearSelection={() => setOpenId(null)}
      />

      <B2BTriageBar rows={rows} active={alertFilter} onToggle={setAlertFilter} />

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="inline-flex bg-surface border border-border rounded-lg p-1">
          {(['cards', 'tabela'] as const).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLayout(l);
                // Mês e pacote viram seções/cards na visão por cards.
                if (l === 'cards') {
                  setMonthFilter('');
                  setPackageFilter('');
                  setTypeFilter('');
                }
              }}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                layout === l
                  ? 'bg-popline-pink text-white font-medium'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {l === 'cards' ? 'Por mês' : 'Tabela'}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar campanha ou empresa..."
          className={`${SELECT_CLASS} flex-1 min-w-[200px]`}
        />
        {layout === 'tabela' && (
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as '' | B2BCampaignType)}
          className={SELECT_CLASS}
        >
          <option value="">Todos os tipos</option>
          {CAMPAIGN_CATEGORY_ORDER.map(id => (
            <option key={id} value={id}>
              {CAMPAIGN_CATEGORIES[id].shortLabel}
            </option>
          ))}
        </select>
        )}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as '' | B2BFinanceStatus)}
          className={SELECT_CLASS}
        >
          <option value="">Todos os status</option>
          <option value="em_aberto">Em Aberto</option>
          <option value="finalizada">Finalizada</option>
        </select>
        {layout === 'tabela' && (
        <select
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          className={SELECT_CLASS}
          title="Mês de abertura da campanha"
        >
          <option value="">Todos os meses</option>
          {months.map(m => (
            <option key={m} value={m}>
              {formatMonthKey(m)}
            </option>
          ))}
        </select>
        )}
        <select
          value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value)}
          className={`${SELECT_CLASS} max-w-[200px]`}
        >
          <option value="">Todos os contratantes</option>
          {companies.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {layout === 'tabela' && (
        <select
          value={packageFilter}
          onChange={e => setPackageFilter(e.target.value)}
          className={`${SELECT_CLASS} max-w-[220px]`}
        >
          <option value="">Todos os pacotes</option>
          <option value={NO_PACKAGE}>Sem pacote (avulsas)</option>
          {packages.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        )}
      </div>

      {layout === 'tabela' && (
        <div>
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
        </div>
      )}

      {layout === 'tabela' && filteredPackageSummary && (
        <Card className="p-3 mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="font-medium text-text-primary">
            📦 {filteredPackageSummary.pkg.name}
            {filteredPackageSummary.pkg.contractingCompany &&
              ` · ${filteredPackageSummary.pkg.contractingCompany}`}
          </span>
          <span className="text-text-secondary">
            Total do pacote:{' '}
            <span className="text-text-primary tabular-nums">
              {filteredPackageSummary.pkg.totalValue === null
                ? '—'
                : formatBRL(filteredPackageSummary.pkg.totalValue)}
            </span>
          </span>
          <span className="text-text-secondary">
            Soma das {filteredPackageSummary.campaigns.length} campanhas:{' '}
            <span className="text-text-primary tabular-nums">
              {formatBRL(filteredPackageSummary.campaignsTotal)}
            </span>
          </span>
          {filteredPackageSummary.difference !== null && (
            <span
              className={
                filteredPackageSummary.difference === 0 ? 'text-emerald-400' : 'text-amber-400'
              }
            >
              {filteredPackageSummary.difference === 0
                ? '✓ bate com o total'
                : `⚠ ${filteredPackageSummary.difference > 0 ? 'faltam' : 'sobram'} ${formatBRL(
                    Math.abs(filteredPackageSummary.difference)
                  )}`}
            </span>
          )}
        </Card>
      )}

      {layout === 'cards' ? (
        <B2BCardsView
          rows={visible}
          allRows={rows}
          packages={packages}
          titles={titles}
          selectedId={openId}
          onOpen={setOpenId}
        />
      ) : (
        <B2BTable
          rows={visible}
          packageNames={packageNames}
          titles={titles}
          complementCounts={complementCounts}
          mode={viewMode}
          selectedId={openId}
          sort={sort}
          onSort={handleSort}
          onOpen={setOpenId}
        />
      )}

      <p className="mt-3 text-xs text-text-secondary">
        {visible.length} de {rows.length} campanha{rows.length === 1 ? '' : 's'} · datas no
        fuso de Brasília
      </p>

      {openRow && (
        <B2BDetailPanel
          row={openRow}
          rows={rows}
          packages={packages}
          onClose={() => setOpenId(null)}
          onPatch={handlePatch}
        />
      )}

      {packagesOpen && (
        <B2BPackagesPanel
          packages={packages}
          rows={rows}
          onClose={() => setPackagesOpen(false)}
          onCreate={handleCreatePackage}
          onUpdate={handleUpdatePackage}
          onDelete={handleDeletePackage}
          onShow={id => {
            setPackageFilter(id);
            setPackagesOpen(false);
          }}
        />
      )}
    </div>
  );
}
