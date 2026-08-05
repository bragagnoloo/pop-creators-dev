import type {
  B2BFinanceRow,
  B2BFinancePatch,
  B2BFinanceTotals,
  B2BPlatformMeta,
  B2BCampaignType,
  B2BClosedSource,
  B2BFinanceStatus,
  B2BPaymentStatus,
  Campaign,
  CampaignStage,
} from '@/types';

/**
 * Serviço da aba B2B.
 *
 * Diferente dos outros serviços do projeto, este NÃO fala com o Supabase pelo
 * browser: campaign_finance e as views b2b_* são service_role-only (RLS sem
 * policies + revoke). Todo acesso passa pelas rotas /api/admin/b2b/*, no mesmo
 * espírito de requestWithdrawal/flagWithdrawal em services/wallet.ts.
 */

export const B2B_LIST_KEY = '/api/admin/b2b/list';

export interface B2BListResponse {
  data: B2BFinanceRowDTO[];
  meta: B2BPlatformMetaDTO;
}

/** Linha crua da view (snake_case, numéricos como string). */
export interface B2BFinanceRowDTO {
  campaign_id: string;
  title: string;
  campaign_status: string;
  current_stage: number;
  delivery_count: number;
  campaign_type: string;
  paying_company: string | null;
  agreed_value: string | number | null;
  contracted_creators: number | null;
  agreed_payment_due_date: string | null;
  company_payment_estimate: string | null;
  company_payment_status: string;
  company_paid_value: string | number | null;
  tax_rate: string | number | null;
  closed_at_override: string | null;
  finance_status: string;
  notes: string | null;
  finance_updated_at: string | null;
  has_cache: boolean;
  cache: string | number | null;
  opened_on: string;
  closed_on: string | null;
  closed_source: string | null;
  creator_payment_deadline: string | null;
  eligible_participants: number;
  creators_gap: number | null;
  credited_total: string | number | null;
  processing_total: string | number | null;
  wallet_total: string | number | null;
  paid_total: string | number | null;
  total_due_creators: string | number | null;
  pending_to_generate: string | number | null;
  net_revenue: string | number | null;
  company_outstanding: string | number | null;
  margin_value: string | number | null;
  margin_pct: string | number | null;
  company_paid_pct: string | number | null;
  company_payment_mismatch: boolean;
  days_to_creator_deadline: number | null;
  days_since_closed: number | null;
  days_to_company_estimate: number | null;
  days_to_agreed_due: number | null;
}

export interface B2BPlatformMetaDTO {
  paid_total_all: string | number | null;
  paid_attributed: string | number | null;
  paid_unattributed: string | number | null;
}

/**
 * O PostgREST serializa `numeric` como STRING. Sem esta coerção, somar viraria
 * concatenação de string silenciosamente — o bug mais provável desta feature.
 */
function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Igual a num(), mas preserva null (para campos genuinamente opcionais). */
function numOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toB2BRow(dto: B2BFinanceRowDTO): B2BFinanceRow {
  return {
    campaignId: dto.campaign_id,
    title: dto.title,
    campaignStatus: dto.campaign_status as Campaign['status'],
    currentStage: dto.current_stage as CampaignStage,
    deliveryCount: dto.delivery_count,
    campaignType: dto.campaign_type as B2BCampaignType,

    payingCompany: dto.paying_company,
    agreedValue: numOrNull(dto.agreed_value),
    contractedCreators: dto.contracted_creators === null ? null : Number(dto.contracted_creators),
    agreedPaymentDueDate: dto.agreed_payment_due_date,
    companyPaymentEstimate: dto.company_payment_estimate,
    companyPaymentStatus: dto.company_payment_status as B2BPaymentStatus,
    companyPaidValue: num(dto.company_paid_value),
    taxRate: num(dto.tax_rate),
    closedAtOverride: dto.closed_at_override,
    financeStatus: dto.finance_status as B2BFinanceStatus,
    notes: dto.notes,
    financeUpdatedAt: dto.finance_updated_at,

    hasCache: dto.has_cache,
    cache: num(dto.cache),
    openedOn: dto.opened_on,
    closedOn: dto.closed_on,
    closedSource: (dto.closed_source as B2BClosedSource | null) ?? null,
    creatorPaymentDeadline: dto.creator_payment_deadline,
    eligibleParticipants: Number(dto.eligible_participants) || 0,
    creatorsGap: dto.creators_gap === null ? null : Number(dto.creators_gap),
    creditedTotal: num(dto.credited_total),
    processingTotal: num(dto.processing_total),
    walletTotal: num(dto.wallet_total),
    paidTotal: num(dto.paid_total),
    totalDueCreators: num(dto.total_due_creators),
    pendingToGenerate: num(dto.pending_to_generate),
    netRevenue: numOrNull(dto.net_revenue),
    companyOutstanding: num(dto.company_outstanding),
    marginValue: numOrNull(dto.margin_value),
    marginPct: numOrNull(dto.margin_pct),
    companyPaidPct: numOrNull(dto.company_paid_pct),
    companyPaymentMismatch: Boolean(dto.company_payment_mismatch),

    daysToCreatorDeadline: dto.days_to_creator_deadline,
    daysSinceClosed: dto.days_since_closed,
    daysToCompanyEstimate: dto.days_to_company_estimate,
    daysToAgreedDue: dto.days_to_agreed_due,
  };
}

export function toPlatformMeta(dto: B2BPlatformMetaDTO | null | undefined): B2BPlatformMeta {
  return {
    paidTotalAll: num(dto?.paid_total_all),
    paidAttributed: num(dto?.paid_attributed),
    paidUnattributed: num(dto?.paid_unattributed),
  };
}

/**
 * Fetcher próprio, obrigatório aqui.
 *
 * O fetcher global (providers/SWRProvider) é `fetch(url).then(r => r.json())` —
 * ele NÃO lança em resposta não-2xx. Num 403 a rota devolve `{ error }`, o
 * `data.data` fica undefined e a aba renderiza uma tabela vazia como se não
 * existisse campanha nenhuma. Num painel financeiro esse é o pior modo de
 * falha possível: parece "nada a pagar" quando na verdade é "sem permissão".
 */
export async function b2bFetcher(url: string): Promise<B2BListResponse> {
  const res = await fetch(url);
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error ?? 'Falha ao carregar os dados financeiros.');
  }
  return payload as B2BListResponse;
}

export async function patchFinance(
  campaignId: string,
  patch: B2BFinancePatch
): Promise<{ success: true; row: B2BFinanceRowDTO } | { success: false; error: string }> {
  try {
    const res = await fetch(`/api/admin/b2b/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.data) {
      return { success: false, error: payload?.error || 'Falha ao salvar.' };
    }
    return { success: true, row: payload.data as B2BFinanceRowDTO };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro de rede.';
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Exposição de caixa
// ---------------------------------------------------------------------------

/**
 * A campanha já custou dinheiro ao POPline (o cachê virou crédito na carteira
 * dos creators) mas a marca ainda não pagou. É o pior cenário de fluxo de
 * caixa: saiu sem ter entrado.
 *
 * Diferente de "a receber", que inclui campanhas ainda sem custo nenhum.
 */
export function isRevenueExposed(row: B2BFinanceRow): boolean {
  return row.creditedTotal > 0 && row.companyOutstanding > 0;
}

// ---------------------------------------------------------------------------
// Totais (big numbers)
// ---------------------------------------------------------------------------

export function computeTotals(rows: B2BFinanceRow[]): B2BFinanceTotals {
  const t: B2BFinanceTotals = {
    campaigns: rows.length,
    finalizadas: 0,
    emAberto: 0,
    creditedTotal: 0,
    processingTotal: 0,
    walletTotal: 0,
    paidTotal: 0,
    agreedTotal: 0,
    netRevenueTotal: 0,
    companyPaidTotal: 0,
    companyOutstandingTotal: 0,
    paymentPago: 0,
    paymentParcial: 0,
    paymentPendente: 0,
    paymentOverdue: 0,
    exposedRevenueTotal: 0,
    exposedCampaigns: 0,
    exposedCommittedTotal: 0,
    eligibleTotal: 0,
    contractedTotal: 0,
    dueCreatorsTotal: 0,
    pendingToGenerateTotal: 0,
    pendingToGenerateCampaigns: 0,
    marginTotal: 0,
    marginPct: null,
    companyPaidPct: null,
    realizedNetRevenueTotal: 0,
    realizedMarginTotal: 0,
    realizedMarginPct: null,
    creditedPct: null,
  };

  for (const r of rows) {
    if (r.financeStatus === 'finalizada') t.finalizadas += 1;
    else t.emAberto += 1;

    t.creditedTotal += r.creditedTotal;
    t.processingTotal += r.processingTotal;
    t.walletTotal += r.walletTotal;
    t.paidTotal += r.paidTotal;

    t.agreedTotal += r.agreedValue ?? 0;
    t.netRevenueTotal += r.netRevenue ?? 0;
    t.companyPaidTotal += r.companyPaidValue;
    t.companyOutstandingTotal += r.companyOutstanding;

    if (r.companyPaymentStatus === 'pago') t.paymentPago += 1;
    else if (r.companyPaymentStatus === 'parcial') t.paymentParcial += 1;
    else t.paymentPendente += 1;

    // Atrasado = ainda falta receber e o prazo contratual já passou.
    if (
      r.companyOutstanding > 0 &&
      r.daysToAgreedDue !== null &&
      r.daysToAgreedDue < 0
    ) {
      t.paymentOverdue += 1;
    }

    if (isRevenueExposed(r)) {
      t.exposedCampaigns += 1;
      t.exposedRevenueTotal += r.companyOutstanding;
      t.exposedCommittedTotal += r.creditedTotal;
    }

    t.eligibleTotal += r.eligibleParticipants;
    t.contractedTotal += r.contractedCreators ?? 0;
    t.dueCreatorsTotal += r.totalDueCreators;
    if (r.pendingToGenerate > 0) {
      t.pendingToGenerateTotal += r.pendingToGenerate;
      t.pendingToGenerateCampaigns += 1;
    }
    t.marginTotal += r.marginValue ?? 0;

    // Concretizado: o imposto incide sobre o que foi efetivamente recebido,
    // por isso a alíquota é aplicada linha a linha e não sobre o total.
    t.realizedNetRevenueTotal += r.companyPaidValue * (1 - r.taxRate / 100);
  }

  // Postura conservadora: conta a receita só quando entra, mas o custo assim
  // que vira crédito — uma vez creditado, o POPline deve e não tem como voltar
  // atrás. É o número que responde "estou ganhando dinheiro de fato?".
  t.realizedMarginTotal = t.realizedNetRevenueTotal - t.creditedTotal;

  // Divisão por zero: sem base, o percentual é indefinido — nunca Infinity/NaN.
  if (t.agreedTotal > 0) {
    t.marginPct = (t.marginTotal / t.agreedTotal) * 100;
    t.companyPaidPct = (t.companyPaidTotal / t.agreedTotal) * 100;
  }
  if (t.companyPaidTotal > 0) {
    t.realizedMarginPct = (t.realizedMarginTotal / t.companyPaidTotal) * 100;
  }
  if (t.dueCreatorsTotal > 0) {
    t.creditedPct = (t.creditedTotal / t.dueCreatorsTotal) * 100;
  }

  return t;
}

// ---------------------------------------------------------------------------
// Entrada/saída de moeda
// ---------------------------------------------------------------------------

/** Aceita "1234,56", "1.234,56" e "1234.56". Devolve null se não for número. */
export function parseBRLInput(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  let normalized = trimmed.replace(/[R$\s]/g, '');
  const hasComma = normalized.includes(',');
  if (hasComma) {
    // Formato pt-BR: ponto é separador de milhar, vírgula é decimal.
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/** Valor cru para edição no input (sem símbolo, decimal com vírgula). */
export function formatBRLInput(value: number | null): string {
  if (value === null) return '';
  return value.toFixed(2).replace('.', ',');
}
