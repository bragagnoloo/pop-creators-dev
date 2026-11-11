import { PLANS } from '@/services/subscriptions';
import type { PlanId } from '@/types';

// =============================================================================
// De qual plano é uma compra da Hotmart. Do mais específico para o mais geral:
//
//   1. código da oferta (exato, ou com sufixo: 'rxeqtcodJWT' → 'rxeqtcod')
//   2. id do plano da assinatura na Hotmart
//   3. nome do plano da assinatura na Hotmart
//   4. preço de tabela
//
// Cupom, oferta nova e afiliado mudam o código da oferta e o preço, mas não o
// plano da assinatura. Sem o passo 2, os cupons de 10% de setembro/2026
// ('fot5sdtt', '1trweb9t') não ativaram a assinatura.
// =============================================================================

type PlanSource = {
  data?: {
    purchase?: {
      offer?: { code?: string };
      price?: { value?: number };
      full_price?: { value?: number };
    };
    subscription?: { plan?: { id?: number | string; name?: string } };
  };
};

// offer.code → PlanId. Padrões = o `off=` de cada oferta (público); env sobrescreve.
const OFFER_MAP: Record<string, PlanId> = {
  [process.env.HOTMART_OFFER_MONTHLY  || 'hp9j1u5w']: 'monthly',
  [process.env.HOTMART_OFFER_SEMESTER || '9fs5f41h']: 'semester',
  [process.env.HOTMART_OFFER_YEARLY   || '47tdmvul']: 'yearly',
  // Ofertas da promo "20 anos" (cupom 20% OFF). Mantidas permanentemente para
  // que compras via cupom liberem o plano correto — o preço com desconto NÃO
  // casaria com o fallback de preço de tabela. Reconhecer códigos a mais é
  // inofensivo mesmo após a promo terminar.
  qe0i73w3: 'monthly',
  pcg3ywkl: 'semester',
  rxeqtcod: 'yearly',
  // Oferta Black Friday 2026 (30% OFF no Anual).
  axbmz79q: 'yearly',
};

// Plano da assinatura na Hotmart (produto 8038052). REC_Plano Anual é a
// recuperação de carrinho do anual: libera o anual (ver lib/rec-annual).
const HOTMART_PLAN_IDS: Record<string, PlanId> = {
  '1343034': 'monthly',  // Plano Mensal
  '1343031': 'semester', // Plano Semestral
  '1343033': 'yearly',   // Plano Anual
  '1343032': 'yearly',   // REC_Plano Anual
};

const HOTMART_PLAN_NAMES: Record<string, PlanId> = {
  'PLANO MENSAL':    'monthly',
  'PLANO SEMESTRAL': 'semester',
  'PLANO ANUAL':     'yearly',
};

export function resolvePlan(payload: PlanSource): PlanId | null {
  const purchase = payload.data?.purchase;

  const code = purchase?.offer?.code;
  if (code) {
    if (OFFER_MAP[code]) return OFFER_MAP[code];
    const byPrefix = Object.keys(OFFER_MAP).find(k => k && code.startsWith(k));
    if (byPrefix) return OFFER_MAP[byPrefix];
  }

  const hotmartPlan = payload.data?.subscription?.plan;
  if (hotmartPlan?.id !== undefined && HOTMART_PLAN_IDS[String(hotmartPlan.id)]) {
    return HOTMART_PLAN_IDS[String(hotmartPlan.id)];
  }
  // "REC_" = recuperação de carrinho do mesmo plano.
  const name = (hotmartPlan?.name ?? '').trim().toUpperCase().replace(/^REC_/, '');
  if (HOTMART_PLAN_NAMES[name]) return HOTMART_PLAN_NAMES[name];

  // Último recurso: preço de tabela (os 3 planos têm valores distintos).
  const listValue = purchase?.full_price?.value ?? purchase?.price?.value;
  if (typeof listValue === 'number') {
    const match = (['monthly', 'semester', 'yearly'] as PlanId[]).find(
      p => Math.abs(PLANS[p].priceTotal - listValue) < 0.01,
    );
    if (match) return match;
  }
  return null;
}
