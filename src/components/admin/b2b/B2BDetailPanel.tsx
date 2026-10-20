'use client';

import { useEffect, useState } from 'react';
import CampaignCategoryBadge from '@/components/ui/CampaignCategoryBadge';
import EditableCell from './EditableCell';
import RiskThermometer from './RiskThermometer';
import { assessRisk, pendingToRelease, daysOpenWithoutClosing } from '@/lib/b2b-risk';
import { rowAlerts } from '@/lib/b2b-alerts';
import {
  isRevenueExposed,
  moneyFlow,
  summarizePackage,
  summarizeComplements,
  campaignResult,
  campaignForecast,
  indexComplements,
  isTaxFreeRoute,
  PAYMENT_ROUTE_LABEL,
  MONEY_FLOW_LABEL,
  MONEY_FLOW_CLASS,
} from '@/services/b2b-finance';
import { formatBRL } from '@/services/wallet';
import { formatBRDate } from '@/lib/date-br';
import type {
  B2BFinancePatch,
  B2BFinanceRow,
  B2BMoneyFlow,
  B2BPackage,
  B2BPaymentRoute,
  B2BPaymentStatus,
} from '@/types';

interface Props {
  row: B2BFinanceRow;
  /** Todas as linhas: para somar as campanhas do pacote desta. */
  rows: B2BFinanceRow[];
  packages: B2BPackage[];
  onClose: () => void;
  onPatch: (campaignId: string, patch: B2BFinancePatch) => Promise<string | null>;
}

const CAMPAIGN_STATUS_LABEL: Record<B2BFinanceRow['campaignStatus'], string> = {
  open: 'Vagas Abertas',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
};

const SELECT =
  'w-full bg-background border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-popline-pink transition-colors';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
      <p className="text-[11px] uppercase tracking-wide text-text-secondary mb-3">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/** Campo editável com rótulo. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr] items-center gap-3">
      <label className="text-xs text-text-secondary">{label}</label>
      <div>
        {children}
        {hint && <div className="text-[10px] mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

/** Valor derivado, só leitura. */
function ReadOnly({
  label,
  value,
  valueClass = 'text-text-primary',
  hint,
}: {
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr] items-baseline gap-3">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className={`text-sm font-medium tabular-nums ${valueClass}`} title={hint}>
        {value}
      </span>
    </div>
  );
}

export default function B2BDetailPanel({ row, rows, packages, onClose, onPatch }: Props) {
  const patch = (p: B2BFinancePatch) => onPatch(row.campaignId, p);
  const flow = moneyFlow(row);
  const direto = row.paymentRoute === 'direto';
  const semImposto = isTaxFreeRoute(row.paymentRoute);
  const complementIdx = indexComplements(rows);
  const result = campaignResult(row, complementIdx);
  const forecast = campaignForecast(row, complementIdx);
  const original = row.complementsCampaignId
    ? (rows.find(r => r.campaignId === row.complementsCampaignId) ?? null)
    : null;
  const compl = summarizeComplements(row, rows);
  // Candidatas a original: qualquer outra campanha que não complemente esta
  // (evita ciclo A→B→A), mais recentes primeiro.
  const originalOptions = rows
    .filter(r => r.campaignId !== row.campaignId && r.complementsCampaignId !== row.campaignId)
    .sort((a, b) => b.openedOn.localeCompare(a.openedOn));
  const pkg = row.packageId ? (packages.find(p => p.id === row.packageId) ?? null) : null;
  const pkgSummary = pkg ? summarizePackage(pkg, rows) : null;
  const [flowError, setFlowError] = useState<string | null>(null);

  /**
   * Escolher onde o dinheiro está preenche os campos que definem isso
   * (valor pago, recebimento e status do repasse) — o status continua sendo
   * derivado deles, então tabela, totais e CSV ficam coerentes.
   */
  const changeFlow = async (next: B2BMoneyFlow) => {
    setFlowError(null);
    let p: B2BFinancePatch;
    if (next === 'aguardando_contratante') {
      if (
        row.companyPaidValue > 0 &&
        !window.confirm(
          `Isso zera o valor pago (${formatBRL(row.companyPaidValue)}) e volta o pagamento para pendente. Continuar?`
        )
      ) {
        return;
      }
      p = { companyPaidValue: 0, companyPaymentStatus: 'pendente', repasseTransferred: false };
    } else {
      p = {
        paymentRoute:
          next === 'direto_pc'
            ? 'direto'
            : row.paymentRoute === 'interna'
              ? 'interna'
              : 'popline',
        repasseTransferred: next === 'recebido_pc',
      };
      // Sem pagamento registrado, assume que a marca pagou o valor acordado.
      if (row.companyPaidValue <= 0) {
        if (!row.agreedValue) {
          setFlowError('Preencha o valor acordado ou o valor pago primeiro.');
          return;
        }
        p.companyPaidValue = row.agreedValue;
        p.companyPaymentStatus = 'pago';
      }
    }
    const err = await patch(p);
    if (err) setFlowError(err);
  };
  const risk = assessRisk(row);
  const alerts = rowAlerts(row);
  const exposta = isRevenueExposed(row);
  const diasAberta = daysOpenWithoutClosing(row);
  const prazoQuitado = pendingToRelease(row) === 0;

  // Fecha com Escape, igual ao Modal do design system.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const commitPaidValue = async (value: string | number | null) => {
    const paid = value === null ? 0 : Number(value);
    const p: B2BFinancePatch = { companyPaidValue: paid };
    const acordado = row.agreedValue;
    if (acordado && acordado > 0) {
      const sugerido: B2BPaymentStatus =
        paid <= 0 ? 'pendente' : paid >= acordado ? 'pago' : 'parcial';
      if (sugerido !== row.companyPaymentStatus) p.companyPaymentStatus = sugerido;
    }
    return patch(p);
  };

  return (
    <>
      {/* Overlay: clicar fora fecha */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <aside className="fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] bg-surface border-l border-border overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-border px-5 py-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-text-primary leading-tight">
                  {row.title}
                </h2>
                <CampaignCategoryBadge category={row.campaignType} />
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {CAMPAIGN_STATUS_LABEL[row.campaignStatus]} · etapa {row.currentStage} de 8
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary text-xl leading-none px-1 shrink-0"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <RiskThermometer risk={risk} />
            <span className="text-[10px] text-text-secondary">risco {risk.score}/100</span>
          </div>
        </div>

        <div className="px-5 py-4">
          {alerts.length > 0 && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3">
              <p className="text-[11px] uppercase tracking-wide text-red-400 mb-1.5">
                ⚠ Precisa de ação
              </p>
              <ul className="space-y-1">
                {alerts.map(a => (
                  <li key={a.key} className="text-xs text-text-primary">
                    • {a.label}
                    <span className="block text-[10px] text-text-secondary">
                      {a.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Section title="Receita B2B">
            <Field label="Empresa responsável">
              <EditableCell
                kind="text"
                value={row.payingCompany}
                placeholder="Nome da empresa"
                onCommit={v => patch({ payingCompany: v as string | null })}
              />
            </Field>
            <Field
              label="Pacote"
              hint={
                pkgSummary ? (
                  <span
                    className={
                      pkgSummary.difference !== null && pkgSummary.difference !== 0
                        ? 'text-amber-400'
                        : 'text-text-secondary'
                    }
                  >
                    {pkgSummary.campaigns.length} campanha
                    {pkgSummary.campaigns.length === 1 ? '' : 's'} ·{' '}
                    {formatBRL(pkgSummary.campaignsTotal)}
                    {pkg?.totalValue !== null && pkg?.totalValue !== undefined
                      ? ` de ${formatBRL(pkg.totalValue)}`
                      : ' · pacote sem valor total'}
                    {pkgSummary.difference !== null &&
                      pkgSummary.difference !== 0 &&
                      ` · ⚠ ${pkgSummary.difference > 0 ? 'faltam' : 'sobram'} ${formatBRL(Math.abs(pkgSummary.difference))}`}
                  </span>
                ) : undefined
              }
            >
              <select
                value={row.packageId ?? ''}
                onChange={e => void patch({ packageId: e.target.value || null })}
                className={`${SELECT} ${pkg ? 'text-text-primary border-border' : 'text-text-secondary border-border'}`}
              >
                <option value="">Avulsa (sem pacote)</option>
                {packages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.contractingCompany ? ` · ${p.contractingCompany}` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={pkg ? 'Valor desta campanha' : 'Valor acordado'}
              hint={
                original ? (
                  <span className={row.agreedValue ? 'text-amber-400' : 'text-text-secondary'}>
                    {row.agreedValue
                      ? '⚠ complemento usa o valor da matriz — deixe vazio para não contar duas vezes'
                      : `usa o valor de ${original.title.trim()}`}
                  </span>
                ) : undefined
              }
            >
              <EditableCell
                kind="currency"
                value={row.agreedValue}
                placeholder="R$ 0,00"
                onCommit={v => patch({ agreedValue: v as number | null })}
              />
            </Field>
            <Field
              label="Prazo de pagamento"
              hint={
                row.daysToAgreedDue !== null &&
                row.daysToAgreedDue < 0 &&
                row.companyOutstanding > 0 ? (
                  <span className="text-red-400">
                    vencido há {Math.abs(row.daysToAgreedDue)} dias
                  </span>
                ) : undefined
              }
            >
              <EditableCell
                kind="date"
                value={row.agreedPaymentDueDate}
                onCommit={v => patch({ agreedPaymentDueDate: v as string | null })}
              />
            </Field>
            <Field label="Estimativa de pagamento">
              <EditableCell
                kind="date"
                value={row.companyPaymentEstimate}
                onCommit={v => patch({ companyPaymentEstimate: v as string | null })}
              />
            </Field>
            <Field label="Status do pagamento">
              <select
                value={row.companyPaymentStatus}
                onChange={e =>
                  void patch({ companyPaymentStatus: e.target.value as B2BPaymentStatus })
                }
                className={`${SELECT} ${
                  row.companyPaymentStatus === 'pago'
                    ? 'text-emerald-400 border-emerald-500/30'
                    : row.companyPaymentStatus === 'parcial'
                      ? 'text-amber-400 border-amber-500/30'
                      : 'text-text-secondary border-border'
                }`}
              >
                <option value="pendente">Pendente</option>
                <option value="parcial">Parcial</option>
                <option value="pago">Pago</option>
              </select>
            </Field>
            <Field
              label="Valor pago pela empresa"
              hint={
                row.companyPaidPct !== null ? (
                  <span
                    className={row.companyPaymentMismatch ? 'text-amber-400' : 'text-text-secondary'}
                  >
                    {row.companyPaidPct.toFixed(0)}% · falta{' '}
                    {formatBRL(row.companyOutstanding)}
                    {row.companyPaymentMismatch && ' ⚠ status não bate com o valor'}
                  </span>
                ) : (
                  <span className="text-text-secondary">sem valor acordado</span>
                )
              }
            >
              <EditableCell
                kind="currency"
                value={row.companyPaidValue}
                placeholder="R$ 0,00"
                onCommit={commitPaidValue}
              />
            </Field>
            <Field label="Pagamento realizado em">
              <EditableCell
                kind="date"
                value={row.companyLastPaymentAt}
                onCommit={v => patch({ companyLastPaymentAt: v as string | null })}
              />
            </Field>
            <Field label="Recebimento">
              <select
                value={row.paymentRoute}
                onChange={e => void patch({ paymentRoute: e.target.value as B2BPaymentRoute })}
                className={`${SELECT} text-text-primary border-border`}
              >
                {(Object.keys(PAYMENT_ROUTE_LABEL) as B2BPaymentRoute[]).map(k => (
                  <option key={k} value={k}>
                    {PAYMENT_ROUTE_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Emissão da NF">
              <EditableCell
                kind="date"
                value={row.nfIssuedAt}
                onCommit={v => patch({ nfIssuedAt: v as string | null })}
              />
            </Field>
            {!direto && (
              <>
                <ReadOnly
                  label="Repasse líquido ao PC"
                  value={formatBRL(row.repasseNetValue)}
                  valueClass={row.repasseNetValue > 0 ? 'text-text-primary' : 'text-text-secondary'}
                  hint="Valor pago menos o imposto"
                />
                <Field label="Data limite do repasse">
                  <EditableCell
                    kind="date"
                    value={row.repasseDueDate}
                    onCommit={v => patch({ repasseDueDate: v as string | null })}
                  />
                </Field>
                <Field label="Status do repasse">
                  <select
                    value={row.repasseTransferred ? 'sim' : 'nao'}
                    onChange={e => void patch({ repasseTransferred: e.target.value === 'sim' })}
                    className={`${SELECT} ${
                      row.repasseTransferred
                        ? 'text-emerald-400 border-emerald-500/30'
                        : 'text-text-secondary border-border'
                    }`}
                  >
                    <option value="nao">Não transferido</option>
                    <option value="sim">Transferido ao PC</option>
                  </select>
                </Field>
                <Field label="Data efetiva do repasse">
                  <EditableCell
                    kind="date"
                    value={row.repasseDoneAt}
                    // Data efetiva preenchida implica transferido.
                    onCommit={v =>
                      patch(
                        v && !row.repasseTransferred
                          ? { repasseDoneAt: v as string, repasseTransferred: true }
                          : { repasseDoneAt: v as string | null }
                      )
                    }
                  />
                </Field>
              </>
            )}
            <Field
              label="Onde está o dinheiro"
              hint={
                flowError ? (
                  <span className="text-red-400">{flowError}</span>
                ) : row.paymentRoute === 'popline' &&
                  (flow === 'na_popline' || flow === 'recebido_pc') &&
                  row.taxRate === 0 ? (
                  <span className="text-amber-400">imposto em 0% — confira em Resultado</span>
                ) : undefined
              }
            >
              <select
                value={flow}
                onChange={e => void changeFlow(e.target.value as B2BMoneyFlow)}
                className={`${SELECT} ${MONEY_FLOW_CLASS[flow]} border-border`}
              >
                {(Object.keys(MONEY_FLOW_LABEL) as B2BMoneyFlow[]).map(k => (
                  <option key={k} value={k}>
                    {MONEY_FLOW_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
            {exposta && (
              <p className="text-[11px] text-red-400">
                ⚠ {formatBRL(row.creditedTotal)} de cachê já saiu do caixa e a empresa
                ainda deve {formatBRL(row.companyOutstanding)}.
              </p>
            )}
          </Section>

          <Section title="Creators">
            <Field
              label="Complemento de"
              hint={
                original ? (
                  <span className="text-text-secondary">
                    o custo desta campanha conta na original
                  </span>
                ) : undefined
              }
            >
              <select
                value={row.complementsCampaignId ?? ''}
                onChange={e => void patch({ complementsCampaignId: e.target.value || null })}
                className={`${SELECT} ${original ? 'text-text-primary' : 'text-text-secondary'} border-border`}
              >
                <option value="">Não é complemento</option>
                {originalOptions.map(r => (
                  <option key={r.campaignId} value={r.campaignId}>
                    {r.title.trim()} · {formatBRDate(r.openedOn)}
                  </option>
                ))}
              </select>
            </Field>
            {compl.complements.length > 0 && (
              <div className="rounded-lg border border-border p-2.5 space-y-1">
                <p className="text-[11px] text-text-secondary">
                  Complementada por {compl.complements.length} campanha
                  {compl.complements.length === 1 ? '' : 's'}:
                </p>
                {compl.complements.map(c => (
                  <p key={c.campaignId} className="text-xs text-text-primary flex justify-between gap-2">
                    <span className="truncate">↳ {c.title.trim()}</span>
                    <span className="tabular-nums text-text-secondary shrink-0">
                      {c.eligibleParticipants} aptos · {formatBRL(c.totalDueCreators)}
                    </span>
                  </p>
                ))}
                <p className="text-xs text-text-secondary pt-1 border-t border-border">
                  Aptos somados:{' '}
                  <span className="text-text-primary font-medium">{compl.eligibleTotal}</span>
                  {row.contractedCreators !== null && ` de ${row.contractedCreators} contratados`}
                  {compl.gap !== null && compl.gap !== 0 && (
                    <span className={compl.gap > 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {' '}
                      ({compl.gap > 0 ? `faltam ${compl.gap}` : `${Math.abs(compl.gap)} a mais`})
                    </span>
                  )}
                </p>
              </div>
            )}
            <Field
              label="Creators contratados"
              hint={
                row.creatorsGap !== null && row.creatorsGap !== 0 ? (
                  <span className={row.creatorsGap > 0 ? 'text-red-400' : 'text-emerald-400'}>
                    {row.creatorsGap > 0
                      ? `${row.creatorsGap} a menos que o contratado`
                      : `${Math.abs(row.creatorsGap)} a mais que o contratado`}
                  </span>
                ) : undefined
              }
            >
              <EditableCell
                kind="integer"
                value={row.contractedCreators}
                placeholder="—"
                onCommit={v => patch({ contractedCreators: v as number | null })}
              />
            </Field>
            <ReadOnly
              label="Aptos para pagamento"
              value={String(row.eligibleParticipants)}
              hint="Aprovados e não desclassificados"
            />
            <ReadOnly
              label="Cachê por creator"
              value={row.hasCache ? formatBRL(row.cache) : '— (permuta/comissão)'}
            />
            <ReadOnly
              label="Total a pagar"
              value={formatBRL(row.totalDueCreators)}
              hint="Aptos × cachê"
            />
            {row.pendingToGenerate > 0 && (
              <ReadOnly
                label="Falta gerar"
                value={formatBRL(row.pendingToGenerate)}
                valueClass="text-red-400"
                hint="Campanha concluída e cachê ainda não creditado"
              />
            )}
            <ReadOnly
              label="Em carteira"
              value={formatBRL(row.walletTotal)}
              valueClass="text-amber-400"
            />
            <ReadOnly
              label="Pago aos creators"
              value={formatBRL(row.paidTotal)}
              valueClass="text-emerald-400"
            />
          </Section>

          <Section title="Prazos">
            <ReadOnly
              label="Abertura"
              value={formatBRDate(row.openedOn)}
              valueClass={
                diasAberta !== null && diasAberta > 90 ? 'text-red-400' : 'text-text-primary'
              }
              hint={diasAberta !== null ? `Aberta há ${diasAberta} dias` : undefined}
            />
            <Field
              label="Encerramento"
              hint={
                row.closedAtOverride ? (
                  <span className="text-text-secondary">definido manualmente</span>
                ) : row.closedOn ? (
                  <span className="text-text-secondary italic">
                    {formatBRDate(row.closedOn)} — automático das etapas
                  </span>
                ) : (
                  <span className="text-text-secondary italic">campanha não encerrada</span>
                )
              }
            >
              <EditableCell
                kind="date"
                value={row.closedAtOverride}
                min={row.openedOn}
                onCommit={v => patch({ closedAtOverride: v as string | null })}
              />
            </Field>
            <ReadOnly
              label="Prazo dos creators"
              value={formatBRDate(row.creatorPaymentDeadline)}
              valueClass={
                row.daysToCreatorDeadline === null || prazoQuitado
                  ? 'text-text-secondary'
                  : row.daysToCreatorDeadline < 0
                    ? 'text-red-400'
                    : row.daysToCreatorDeadline <= 15
                      ? 'text-amber-400'
                      : 'text-text-primary'
              }
              hint="60 dias após o encerramento"
            />
            {prazoQuitado && row.creatorPaymentDeadline && (
              <p className="text-[11px] text-emerald-400/80">
                ✓ Cachê integralmente liberado — prazo cumprido.
              </p>
            )}
          </Section>

          <Section title="Resultado">
            {semImposto ? (
              <ReadOnly
                label="Imposto"
                value={direto ? '0% · direto no PC' : '0% · campanha do POPline'}
                valueClass="text-text-secondary"
                hint={
                  direto
                    ? 'Pagamento direto na conta do POPline Creators não tem imposto'
                    : 'Campanha do próprio POPline não tem imposto'
                }
              />
            ) : (
              <Field label="Imposto">
                <EditableCell
                  kind="percent"
                  value={row.taxRate}
                  onCommit={v => patch({ taxRate: v as number | null })}
                />
              </Field>
            )}
            <ReadOnly
              label="Receita líquida"
              value={row.netRevenue === null ? '—' : formatBRL(row.netRevenue)}
            />
            {original ? (
              <p className="text-[11px] text-text-secondary">
                Complemento de <span className="text-text-primary">{original.title.trim()}</span>:
                usa o valor e o pagamento de lá, e os aptos e o custo desta campanha entram no
                resultado da matriz.
              </p>
            ) : (
              <>
                <ReadOnly
                  label="Resultado"
                  value={
                    result === null
                      ? '— · marca ainda não pagou'
                      : `${formatBRL(result)} · ${((result / row.companyPaidValue) * 100).toFixed(1)}%`
                  }
                  valueClass={
                    result === null
                      ? 'text-text-secondary'
                      : result < 0
                        ? 'text-red-400'
                        : 'text-emerald-400'
                  }
                  hint={
                    compl.complements.length > 0
                      ? `Recebido sem imposto menos o custo desta campanha e dos complementos (${formatBRL(compl.costTotal)})`
                      : 'Recebido sem imposto menos o custo com creators (aptos × cachê)'
                  }
                />
                <ReadOnly
                  label="Margem prevista"
                  value={
                    forecast === null
                      ? '—'
                      : `${formatBRL(forecast)}${
                          row.agreedValue ? ` · ${((forecast / row.agreedValue) * 100).toFixed(1)}%` : ''
                        }`
                  }
                  valueClass={
                    forecast === null
                      ? 'text-text-secondary'
                      : forecast < 0
                        ? 'text-red-400'
                        : 'text-emerald-400'
                  }
                  hint="Se todo o valor acordado for pago"
                />
              </>
            )}
            <Field label="Status financeiro">
              <select
                value={row.financeStatus}
                onChange={e =>
                  void patch({
                    financeStatus: e.target.value as B2BFinanceRow['financeStatus'],
                  })
                }
                className={`${SELECT} ${
                  row.financeStatus === 'finalizada'
                    ? 'text-emerald-400 border-emerald-500/30'
                    : 'text-amber-400 border-amber-500/30'
                }`}
              >
                <option value="em_aberto">Em Aberto</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </Field>
          </Section>

          <Section title="Observações">
            <textarea
              defaultValue={row.notes ?? ''}
              key={`${row.campaignId}-notes-${row.notes ?? ''}`}
              placeholder="Anotações internas sobre o financeiro desta campanha..."
              rows={3}
              onBlur={e => {
                const v = e.target.value.trim();
                if (v !== (row.notes ?? '')) void patch({ notes: v || null });
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink transition-colors resize-y"
            />
          </Section>

          <p className="text-[10px] text-text-secondary mt-4 pb-4">
            Os campos salvam sozinhos ao sair do campo. Última alteração:{' '}
            {row.financeUpdatedAt ? formatBRDate(row.financeUpdatedAt) : 'nunca'}.
          </p>
        </div>
      </aside>
    </>
  );
}
