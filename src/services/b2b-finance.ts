import type {
  B2BMoneyFlow,
  B2BPackage,
  B2BPackagePatch,
  B2BPaymentRoute,
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
  packages: B2BPackageDTO[];
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
  package_id: string | null;
  payment_route: string;
  nf_issued_at: string | null;
  repasse_due_date: string | null;
  repasse_done_at: string | null;
  repasse_transferred: boolean;
  company_last_payment_at: string | null;
  complements_campaign_id: string | null;
  repasse_net_value: string | number | null;
}

/** Linha crua de b2b_packages. */
export interface B2BPackageDTO {
  id: string;
  name: string;
  contracting_company: string | null;
  total_value: string | number | null;
  notes: string | null;
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
    packageId: dto.package_id,
    paymentRoute:
      dto.payment_route === 'direto' || dto.payment_route === 'interna'
        ? dto.payment_route
        : 'popline',
    nfIssuedAt: dto.nf_issued_at,
    repasseDueDate: dto.repasse_due_date,
    repasseDoneAt: dto.repasse_done_at,
    repasseTransferred: Boolean(dto.repasse_transferred),
    companyLastPaymentAt: dto.company_last_payment_at,
    complementsCampaignId: dto.complements_campaign_id,

    repasseNetValue: num(dto.repasse_net_value),
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

export function toB2BPackage(dto: B2BPackageDTO): B2BPackage {
  return {
    id: dto.id,
    name: dto.name,
    contractingCompany: dto.contracting_company,
    totalValue: numOrNull(dto.total_value),
    notes: dto.notes,
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

type PackageResult =
  | { success: true; data: B2BPackageDTO }
  | { success: false; error: string };

async function packageRequest(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: B2BPackagePatch
): Promise<PackageResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.data) {
      return { success: false, error: payload?.error || 'Falha ao salvar o pacote.' };
    }
    return { success: true, data: payload.data as B2BPackageDTO };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro de rede.';
    return { success: false, error: msg };
  }
}

export const createPackage = (body: B2BPackagePatch) =>
  packageRequest('/api/admin/b2b/packages', 'POST', body);

export const updatePackage = (id: string, body: B2BPackagePatch) =>
  packageRequest(`/api/admin/b2b/packages/${id}`, 'PATCH', body);

/** Apaga só o pacote: as campanhas ficam avulsas, com os valores intactos. */
export const deletePackage = (id: string) =>
  packageRequest(`/api/admin/b2b/packages/${id}`, 'DELETE');

// ---------------------------------------------------------------------------
// Caminho do dinheiro
// ---------------------------------------------------------------------------

export function moneyFlow(row: B2BFinanceRow): B2BMoneyFlow {
  if (row.companyPaidValue <= 0) return 'aguardando_contratante';
  if (row.paymentRoute === 'direto') return 'direto_pc';
  return row.repasseTransferred ? 'recebido_pc' : 'na_popline';
}

export const MONEY_FLOW_LABEL: Record<B2BMoneyFlow, string> = {
  aguardando_contratante: 'Aguardando contratante',
  na_popline: 'No POPline, a repassar',
  recebido_pc: 'Recebido no PC',
  direto_pc: 'Direto no PC',
};

export const MONEY_FLOW_CLASS: Record<B2BMoneyFlow, string> = {
  aguardando_contratante: 'text-text-secondary',
  na_popline: 'text-amber-400',
  recebido_pc: 'text-emerald-400',
  direto_pc: 'text-emerald-400',
};

export const PAYMENT_ROUTE_LABEL: Record<B2BPaymentRoute, string> = {
  popline: 'Via POPline (com imposto)',
  direto: 'Direto no POPline Creators (sem imposto)',
  interna: 'Campanha do POPline (sem imposto)',
};

/** Rotas em que não há imposto — espelha campaign_finance_rota_sem_imposto. */
export function isTaxFreeRoute(route: B2BPaymentRoute): boolean {
  return route !== 'popline';
}

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

/**
 * Contrato = campanha matriz + as campanhas que a complementam. O complemento
 * usa o valor acordado e o pagamento da matriz; os aptos e o custo somam.
 * Por isso receita, resultado e margem só existem na matriz, já descontando
 * o custo dos complementos — e o complemento não tem resultado próprio.
 */
export type ComplementIndex = Map<string, B2BFinanceRow[]>;

/** matriz → complementos, a partir de TODAS as linhas (não só as filtradas). */
export function indexComplements(rows: B2BFinanceRow[]): ComplementIndex {
  const idx: ComplementIndex = new Map();
  for (const r of rows) {
    if (!r.complementsCampaignId) continue;
    const list = idx.get(r.complementsCampaignId) ?? [];
    list.push(r);
    idx.set(r.complementsCampaignId, list);
  }
  return idx;
}

/** Custo com creators do contrato: matriz + complementos (aptos × cachê). */
export function contractCost(row: B2BFinanceRow, idx: ComplementIndex): number {
  const complements = idx.get(row.campaignId) ?? [];
  return row.totalDueCreators + complements.reduce((s, c) => s + c.totalDueCreators, 0);
}

/**
 * Resultado: recebido líquido (pago − imposto) menos o custo do contrato. Só
 * existe quando a marca já pagou algo — antes disso há só a margem prevista.
 *
 * O custo entra inteiro mesmo em pagamento parcial: postura conservadora, o
 * cachê é devido aos creators independente de quanto a marca já pagou.
 */
export function campaignResult(row: B2BFinanceRow, idx: ComplementIndex): number | null {
  if (row.complementsCampaignId) return null;
  if (row.companyPaidValue <= 0) return null;
  return Math.round((row.repasseNetValue - contractCost(row, idx)) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Saldo gerado (cachê creditado na carteira dos creators)
// ---------------------------------------------------------------------------

/**
 * - gerado:     todo o cachê devido (aptos × cachê) já virou crédito;
 * - parcial:    parte já virou crédito;
 * - nao_gerado: nada creditado ainda;
 * - sem_cache:  campanha sem cachê (permuta/comissão), nada a gerar.
 */
export type CreditStatus = 'gerado' | 'parcial' | 'nao_gerado' | 'sem_cache';

export function creditStatus(row: B2BFinanceRow): CreditStatus {
  if (row.totalDueCreators <= 0) return row.creditedTotal > 0 ? 'gerado' : 'sem_cache';
  // Tolerância de meio centavo contra arredondamento de numeric.
  if (row.creditedTotal >= row.totalDueCreators - 0.005) return 'gerado';
  return row.creditedTotal > 0 ? 'parcial' : 'nao_gerado';
}

export const CREDIT_STATUS_LABEL: Record<CreditStatus, string> = {
  gerado: 'Saldo gerado',
  parcial: 'Saldo parcial',
  nao_gerado: 'Saldo não gerado',
  sem_cache: 'Sem cachê',
};

/**
 * Saldo gerado no contrato inteiro: a campanha e todos os complementos dela.
 * Campanha sem cachê nenhum não conta como gerada (não há o que gerar).
 */
export function isContractCreditGenerated(row: B2BFinanceRow, idx: ComplementIndex): boolean {
  if (creditStatus(row) !== 'gerado') return false;
  return (idx.get(row.campaignId) ?? []).every(c => {
    const st = creditStatus(c);
    return st === 'gerado' || st === 'sem_cache';
  });
}

/** Margem prevista (se tudo for pago): receita líquida − custo do contrato. */
export function campaignForecast(row: B2BFinanceRow, idx: ComplementIndex): number | null {
  if (row.complementsCampaignId) return null;
  if (row.netRevenue === null) return null;
  return Math.round((row.netRevenue - contractCost(row, idx)) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Complementos
// ---------------------------------------------------------------------------

export interface ComplementSummary {
  complements: B2BFinanceRow[];
  /** Aptos da original + complementos. */
  eligibleTotal: number;
  /** Contratados − aptos somados. Null se a original não tem contratados. */
  gap: number | null;
  /** Custo com creators da original + complementos. */
  costTotal: number;
  /** Receita líquida da original − custo somado. Null sem valor acordado. */
  contractMargin: number | null;
}

/** Soma a campanha original com as campanhas que a complementam. */
export function summarizeComplements(
  original: B2BFinanceRow,
  rows: B2BFinanceRow[]
): ComplementSummary {
  const idx = indexComplements(rows);
  const complements = idx.get(original.campaignId) ?? [];
  const eligibleTotal =
    original.eligibleParticipants + complements.reduce((s, r) => s + r.eligibleParticipants, 0);
  return {
    complements,
    eligibleTotal,
    gap: original.contractedCreators === null ? null : original.contractedCreators - eligibleTotal,
    costTotal: contractCost(original, idx),
    contractMargin: campaignForecast(original, idx),
  };
}

// ---------------------------------------------------------------------------
// Pacotes
// ---------------------------------------------------------------------------

export interface PackageSummary {
  pkg: B2BPackage;
  campaigns: B2BFinanceRow[];
  /** Soma do valor acordado de cada campanha do pacote. */
  campaignsTotal: number;
  /** total do pacote − soma das campanhas. Null se o pacote não tem total. */
  difference: number | null;
}

export function summarizePackage(pkg: B2BPackage, rows: B2BFinanceRow[]): PackageSummary {
  const campaigns = rows.filter(r => r.packageId === pkg.id);
  const campaignsTotal =
    Math.round(campaigns.reduce((s, r) => s + (r.agreedValue ?? 0), 0) * 100) / 100;
  const difference =
    pkg.totalValue === null ? null : Math.round((pkg.totalValue - campaignsTotal) * 100) / 100;
  return { pkg, campaigns, campaignsTotal, difference };
}

// ---------------------------------------------------------------------------
// Meses de abertura
// ---------------------------------------------------------------------------

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** '2026-07-24' → '2026-07'. */
export function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

/** '2026-07' → 'jul/26'. */
export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTHS_PT[Number(m) - 1]}/${y.slice(2)}`;
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

/**
 * `allRows` (todas as linhas, não só as filtradas) alimenta o índice de
 * complementos: o custo de um complemento entra na matriz mesmo que ele esteja
 * em outro mês ou fora do filtro.
 */
export function computeTotals(
  rows: B2BFinanceRow[],
  allRows: B2BFinanceRow[] = rows
): B2BFinanceTotals {
  const idx = indexComplements(allRows);
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
    poplineHoldingTotal: 0,
    pcReceivedTotal: 0,
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
    resultCostTotal: 0,
    resultTotal: 0,
    resultPct: null,
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

    const flow = moneyFlow(r);
    if (flow === 'na_popline') t.poplineHoldingTotal += r.repasseNetValue;
    else if (flow === 'recebido_pc' || flow === 'direto_pc') t.pcReceivedTotal += r.repasseNetValue;

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
    t.marginTotal += campaignForecast(r, idx) ?? 0;

    // Resultado: o imposto incide sobre o que foi efetivamente recebido, por
    // isso a alíquota é aplicada linha a linha e não sobre o total.
    if (r.companyPaidValue > 0 && !r.complementsCampaignId) {
      t.realizedNetRevenueTotal += r.repasseNetValue;
      t.resultCostTotal += contractCost(r, idx);
    }
  }

  t.resultTotal = t.realizedNetRevenueTotal - t.resultCostTotal;

  // Divisão por zero: sem base, o percentual é indefinido — nunca Infinity/NaN.
  if (t.agreedTotal > 0) {
    t.marginPct = (t.marginTotal / t.agreedTotal) * 100;
    t.companyPaidPct = (t.companyPaidTotal / t.agreedTotal) * 100;
  }
  if (t.companyPaidTotal > 0) {
    t.resultPct = (t.resultTotal / t.companyPaidTotal) * 100;
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
