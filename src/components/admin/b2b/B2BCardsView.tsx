'use client';

import { useMemo, useState } from 'react';
import CampaignCategoryBadge from '@/components/ui/CampaignCategoryBadge';
import { rowAlerts } from '@/lib/b2b-alerts';
import { formatBRL } from '@/services/wallet';
import { formatBRDate } from '@/lib/date-br';
import {
  campaignForecast,
  campaignResult,
  computeTotals,
  creditStatus,
  indexComplements,
  isContractCreditGenerated,
  CREDIT_STATUS_LABEL,
  type CreditStatus,
  type ComplementIndex,
  monthKey,
  moneyFlow,
  summarizePackage,
  MONEY_FLOW_LABEL,
} from '@/services/b2b-finance';
import type { B2BFinanceRow, B2BMoneyFlow, B2BPackage } from '@/types';

/**
 * Visão em cards: meses de abertura recolhíveis, pacotes como um card só que
 * abre as campanhas dele. Cada card mostra só o essencial; o resto fica no
 * painel lateral (onOpen).
 */

interface Props {
  /** Linhas já filtradas. */
  rows: B2BFinanceRow[];
  /** Todas as linhas: para a conferência do pacote não depender do filtro. */
  allRows: B2BFinanceRow[];
  packages: B2BPackage[];
  titles: Record<string, string>;
  selectedId: string | null;
  onOpen: (campaignId: string) => void;
}

const MONTHS_LONG = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function monthTitle(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTHS_LONG[Number(m) - 1]} de ${y}`;
}

const FLOW_CHIP: Record<B2BMoneyFlow, string> = {
  aguardando_contratante: 'bg-white/5 text-text-secondary border-border',
  na_popline: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  recebido_pc: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  direto_pc: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

function FlowChip({ flow }: { flow: B2BMoneyFlow }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${FLOW_CHIP[flow]}`}
    >
      {MONEY_FLOW_LABEL[flow]}
    </span>
  );
}

const CREDIT_CLASS: Record<CreditStatus, string> = {
  gerado: 'text-emerald-400',
  parcial: 'text-amber-400',
  nao_gerado: 'text-text-secondary',
  sem_cache: 'text-text-secondary',
};

const CREDIT_ICON: Record<CreditStatus, string> = {
  gerado: '✓',
  parcial: '◐',
  nao_gerado: '○',
  sem_cache: '–',
};

function CreditLine({ row }: { row: B2BFinanceRow }) {
  const st = creditStatus(row);
  return (
    <p
      className={`text-[11px] mt-0.5 ${CREDIT_CLASS[st]}`}
      title={`Creditado ${formatBRL(row.creditedTotal)} de ${formatBRL(row.totalDueCreators)} (aptos × cachê)`}
    >
      {CREDIT_ICON[st]} {CREDIT_STATUS_LABEL[st]}
      {st === 'parcial' &&
        ` · ${formatBRL(row.creditedTotal)} de ${formatBRL(row.totalDueCreators)}`}
    </p>
  );
}

function Margin({ value, pct }: { value: number | null; pct?: number | null }) {
  if (value === null) return <span className="text-text-secondary">—</span>;
  return (
    <span className={`font-medium ${value < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
      {formatBRL(value)}
      {pct !== null && pct !== undefined && (
        <span className="text-text-secondary font-normal"> · {pct.toFixed(0)}%</span>
      )}
    </span>
  );
}

/**
 * Resultado (recebido − imposto − custo) quando a marca já pagou; senão a
 * margem prevista, apagada, para não parecer dinheiro que entrou.
 */
function ResultLine({
  result,
  resultPct,
  forecast,
}: {
  result: number | null;
  resultPct?: number | null;
  forecast: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border text-xs">
      {result !== null ? (
        <>
          <span className="text-text-secondary">Resultado</span>
          <Margin value={result} pct={resultPct} />
        </>
      ) : (
        <>
          <span className="text-text-secondary">Previsto</span>
          <span className="text-text-secondary">
            {forecast === null ? '—' : formatBRL(forecast)}
            <span className="text-[10px]"> · ainda não recebido</span>
          </span>
        </>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-block text-text-secondary transition-transform ${open ? 'rotate-90' : ''}`}
      aria-hidden
    >
      ›
    </span>
  );
}

function CampaignCard({
  row,
  idx,
  complementOf,
  selected,
  onOpen,
}: {
  row: B2BFinanceRow;
  idx: ComplementIndex;
  complementOf: string | null;
  selected: boolean;
  onOpen: (id: string) => void;
}) {
  const alerts = rowAlerts(row);
  const result = campaignResult(row, idx);
  const complements = idx.get(row.campaignId) ?? [];
  const eligibleTotal =
    row.eligibleParticipants + complements.reduce((s, c) => s + c.eligibleParticipants, 0);
  return (
    <button
      type="button"
      onClick={() => onOpen(row.campaignId)}
      className={`text-left w-full rounded-xl border bg-surface p-3.5 transition-colors hover:border-popline-pink/50 ${
        selected ? 'border-popline-pink/70' : alerts.length > 0 ? 'border-red-500/40' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-primary leading-snug line-clamp-2">
          {row.title.trim()}
        </p>
        <CampaignCategoryBadge category={row.campaignType} />
      </div>
      <p className="text-[11px] text-text-secondary mt-0.5 truncate">
        {row.payingCompany ?? 'Sem contratante'} · aberta em {formatBRDate(row.openedOn)}
      </p>
      {complementOf && (
        <p className="text-[11px] text-sky-400 mt-0.5 truncate">↳ complemento de {complementOf.trim()}</p>
      )}
      <CreditLine row={row} />

      <div className="flex items-end justify-between gap-2 mt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-secondary">Valor</p>
          <p className="text-lg font-bold text-text-primary leading-tight">
            {row.agreedValue !== null ? formatBRL(row.agreedValue) : complementOf ? 'da matriz' : '—'}
          </p>
        </div>
        <FlowChip flow={moneyFlow(row)} />
      </div>

      {complements.length > 0 && (
        <p className="text-[11px] text-sky-400 mt-1">
          + {complements.length} complemento{complements.length === 1 ? '' : 's'} · {eligibleTotal}{' '}
          aptos somados
        </p>
      )}
      {complementOf ? (
        <p className="mt-2 pt-2 border-t border-border text-[11px] text-text-secondary">
          Valor, pagamento e resultado ficam na matriz
        </p>
      ) : (
        <ResultLine
          result={result}
          resultPct={result === null ? null : (result / row.companyPaidValue) * 100}
          forecast={campaignForecast(row, idx)}
        />
      )}

      {alerts.length > 0 && (
        <p className="text-[11px] text-red-400 mt-1.5">
          ⚠ {alerts[0].label}
          {alerts.length > 1 && ` (+${alerts.length - 1})`}
        </p>
      )}
    </button>
  );
}

function PackageCard({
  pkg,
  rows,
  allRows,
  titles,
  selectedId,
  onOpen,
}: {
  pkg: B2BPackage;
  rows: B2BFinanceRow[];
  allRows: B2BFinanceRow[];
  titles: Record<string, string>;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const idx = indexComplements(allRows);
  const summary = summarizePackage(pkg, allRows);
  const t = computeTotals(rows, allRows);
  const alertCount = rows.filter(r => rowAlerts(r).length > 0).length;
  const flows = new Set(rows.map(moneyFlow));
  const flow: B2BMoneyFlow | null = flows.size === 1 ? [...flows][0] : null;

  return (
    <div className={`rounded-xl border bg-surface ${open ? 'sm:col-span-2 xl:col-span-3 border-popline-pink/40' : 'border-border'}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-left w-full p-3.5"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-text-primary leading-snug">
            <Chevron open={open} /> 📦 {pkg.name}
          </p>
          <span className="text-[11px] text-text-secondary whitespace-nowrap">
            {summary.campaigns.length} campanha{summary.campaigns.length === 1 ? '' : 's'}
          </span>
        </div>
        <p className="text-[11px] text-text-secondary mt-0.5">
          Pacote · {pkg.contractingCompany ?? 'Sem contratante'}
        </p>

        <div className="flex items-end justify-between gap-2 mt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-text-secondary">Valor do pacote</p>
            <p className="text-lg font-bold text-text-primary leading-tight">
              {pkg.totalValue === null ? formatBRL(summary.campaignsTotal) : formatBRL(pkg.totalValue)}
            </p>
          </div>
          {flow ? (
            <FlowChip flow={flow} />
          ) : (
            <span className="text-[11px] text-text-secondary">situações mistas</span>
          )}
        </div>

        <ResultLine
          result={t.companyPaidTotal > 0 ? t.resultTotal : null}
          resultPct={t.resultPct}
          forecast={t.agreedTotal > 0 ? t.marginTotal : null}
        />

        {summary.difference !== null && summary.difference !== 0 && (
          <p className="text-[11px] text-amber-400 mt-1.5">
            ⚠ soma das campanhas {summary.difference > 0 ? 'abaixo' : 'acima'} do pacote em{' '}
            {formatBRL(Math.abs(summary.difference))}
          </p>
        )}
        {alertCount > 0 && (
          <p className="text-[11px] text-red-400 mt-1">
            ⚠ {alertCount} campanha{alertCount === 1 ? '' : 's'} precisa{alertCount === 1 ? '' : 'm'} de ação
          </p>
        )}
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 border-t border-border pt-3">
          {rows.map(r => (
            <CampaignCard
              key={r.campaignId}
              row={r}
              idx={idx}
              complementOf={r.complementsCampaignId ? (titles[r.complementsCampaignId] ?? null) : null}
              selected={selectedId === r.campaignId}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type Item =
  | { kind: 'campaign'; row: B2BFinanceRow; sortKey: string }
  | { kind: 'package'; pkg: B2BPackage; rows: B2BFinanceRow[]; sortKey: string };

interface MonthGroup {
  key: string;
  rows: B2BFinanceRow[];
  items: Item[];
}

export default function B2BCardsView({ rows, allRows, packages, titles, selectedId, onOpen }: Props) {
  const idx = useMemo(() => indexComplements(allRows), [allRows]);
  const groups = useMemo<MonthGroup[]>(() => {
    const pkgById = new Map(packages.map(p => [p.id, p]));

    // Pacote entra no mês da sua primeira campanha (entre as visíveis).
    const pkgRows = new Map<string, B2BFinanceRow[]>();
    for (const r of rows) {
      if (r.packageId && pkgById.has(r.packageId)) {
        const list = pkgRows.get(r.packageId) ?? [];
        list.push(r);
        pkgRows.set(r.packageId, list);
      }
    }

    const byMonth = new Map<string, MonthGroup>();
    const month = (key: string) => {
      let g = byMonth.get(key);
      if (!g) {
        g = { key, rows: [], items: [] };
        byMonth.set(key, g);
      }
      return g;
    };

    for (const r of rows) {
      if (r.packageId && pkgRows.has(r.packageId)) continue;
      const g = month(monthKey(r.openedOn));
      g.rows.push(r);
      g.items.push({ kind: 'campaign', row: r, sortKey: r.openedOn });
    }
    for (const [id, list] of pkgRows) {
      const sorted = [...list].sort((a, b) => a.openedOn.localeCompare(b.openedOn));
      const g = month(monthKey(sorted[0].openedOn));
      g.rows.push(...sorted);
      g.items.push({ kind: 'package', pkg: pkgById.get(id)!, rows: sorted, sortKey: sorted[0].openedOn });
    }

    for (const g of byMonth.values()) {
      g.items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    }
    return [...byMonth.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [rows, packages]);

  // Só o mês mais recente começa aberto.
  const [openMonths, setOpenMonths] = useState<Set<string> | null>(null);
  const isOpen = (key: string) =>
    openMonths ? openMonths.has(key) : groups.length > 0 && groups[0].key === key;
  const toggle = (key: string) => {
    const next = new Set(openMonths ?? (groups[0] ? [groups[0].key] : []));
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpenMonths(next);
  };

  if (groups.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-text-secondary rounded-2xl border border-border">
        Nenhuma campanha encontrada com os filtros atuais.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(g => {
        const open = isOpen(g.key);
        const t = computeTotals(g.rows, allRows);
        // Mesmo resumo, só com os contratos cujo cachê já foi todo creditado.
        const generatedRows = g.rows.filter(r => isContractCreditGenerated(r, idx));
        const tg = computeTotals(generatedRows, allRows);
        const alertCount = g.rows.filter(r => rowAlerts(r).length > 0).length;
        return (
          <section key={g.key} className="rounded-2xl border border-border bg-surface/40">
            <button
              type="button"
              onClick={() => toggle(g.key)}
              className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-1"
              aria-expanded={open}
            >
              <span className="text-base font-semibold text-text-primary capitalize min-w-[170px]">
                <Chevron open={open} /> {monthTitle(g.key)}
              </span>
              <span className="text-xs text-text-secondary">
                {g.rows.length} campanha{g.rows.length === 1 ? '' : 's'}
              </span>
              <span className="text-xs text-text-secondary">
                Valor <span className="text-text-primary font-medium">{formatBRL(t.agreedTotal)}</span>
              </span>
              <span className="text-xs text-text-secondary">
                Recebido{' '}
                <span className="text-emerald-400 font-medium">{formatBRL(t.companyPaidTotal)}</span>
              </span>
              <span className="text-xs text-text-secondary">
                Resultado <Margin value={t.companyPaidTotal > 0 ? t.resultTotal : null} />
              </span>
              <span className="text-xs text-text-secondary">
                Previsto {t.agreedTotal > 0 ? formatBRL(t.marginTotal) : '—'}
              </span>
              {alertCount > 0 && (
                <span className="text-xs text-red-400">⚠ {alertCount} precisa{alertCount === 1 ? '' : 'm'} de ação</span>
              )}
              <span className="basis-full flex flex-wrap items-center gap-x-5 gap-y-1 mt-1 pt-1.5 border-t border-border/60 text-xs text-text-secondary">
                <span className="min-w-[170px] text-emerald-400/90">✓ Com saldo gerado</span>
                {generatedRows.length === 0 ? (
                  <span>nenhuma campanha com o cachê todo creditado ainda</span>
                ) : (
                  <>
                    <span>
                      {generatedRows.length} campanha{generatedRows.length === 1 ? '' : 's'}
                    </span>
                    <span>
                      Valor{' '}
                      <span className="text-text-primary font-medium">{formatBRL(tg.agreedTotal)}</span>
                    </span>
                    <span>
                      Recebido{' '}
                      <span className="text-emerald-400 font-medium">{formatBRL(tg.companyPaidTotal)}</span>
                    </span>
                    <span>
                      Resultado <Margin value={tg.companyPaidTotal > 0 ? tg.resultTotal : null} />
                    </span>
                  </>
                )}
              </span>
            </button>

            {open && (
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {g.items.map(item =>
                  item.kind === 'campaign' ? (
                    <CampaignCard
                      key={item.row.campaignId}
                      row={item.row}
                      idx={idx}
                      complementOf={
                        item.row.complementsCampaignId
                          ? (titles[item.row.complementsCampaignId] ?? null)
                          : null
                      }
                      selected={selectedId === item.row.campaignId}
                      onOpen={onOpen}
                    />
                  ) : (
                    <PackageCard
                      key={item.pkg.id}
                      pkg={item.pkg}
                      rows={item.rows}
                      allRows={allRows}
                      titles={titles}
                      selectedId={selectedId}
                      onOpen={onOpen}
                    />
                  )
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
