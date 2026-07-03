import { Subscription, PlanId } from '@/types';
import { createClient } from '@/lib/supabase/client';

export const KIWIFY_PLAN_MAP: Record<string, PlanId> = {
  [process.env.KIWIFY_PLAN_ID_MONTHLY ?? '']:  'monthly',
  [process.env.KIWIFY_PLAN_ID_SEMESTER ?? '']: 'semester',
  [process.env.KIWIFY_PLAN_ID_YEARLY ?? '']:   'yearly',
};

export const KIWIFY_FREQUENCY_MAP: Record<string, PlanId> = {
  monthly:    'monthly',
  semiannual: 'semester',
  annual:     'yearly',
};

export interface PlanInfo {
  id: PlanId;
  name: string;
  priceTotal: number;
  durationMonths: number;
  monthlyEquivalent: number;
  modifier: number;
  prizes: boolean;
  tagline: string;
}

export const PLANS: Record<PlanId, PlanInfo> = {
  free: {
    id: 'free',
    name: 'Explorar',
    priceTotal: 0,
    durationMonths: 0,
    monthlyEquivalent: 0,
    modifier: 0,
    prizes: false,
    tagline: 'Acesso de visualização. Precisa assinar para usar.',
  },
  monthly: {
    id: 'monthly',
    name: 'Mensal',
    priceTotal: 49.9,
    durationMonths: 1,
    monthlyEquivalent: 49.9,
    modifier: 1,
    prizes: false,
    tagline: 'Acesso completo por 1 mês.',
  },
  semester: {
    id: 'semester',
    name: 'Semestral',
    priceTotal: 239.4,
    durationMonths: 6,
    monthlyEquivalent: 39.9,
    modifier: 2,
    prizes: true,
    tagline: '2x mais prioridade em campanhas + oportunidades exclusivas.',
  },
  yearly: {
    id: 'yearly',
    name: 'Anual',
    priceTotal: 358.8,
    durationMonths: 12,
    monthlyEquivalent: 29.9,
    modifier: 5,
    prizes: true,
    tagline: '5x mais prioridade em campanhas + oportunidades exclusivas.',
  },
};

export const PLAN_ORDER: PlanId[] = ['yearly', 'semester', 'monthly', 'free'];

// URLs do checkout Hotmart por plano (1 produto J106555340X, 3 ofertas).
// Sobrescritas por env quando definidas; senão usam a URL pública da oferta.
export const CHECKOUT_URLS: Record<PlanId, string> = {
  free:     '',
  monthly:  process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_MONTHLY  || 'https://pay.hotmart.com/J106555340X?off=hp9j1u5w',
  semester: process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_SEMESTER || 'https://pay.hotmart.com/J106555340X?off=9fs5f41h',
  yearly:   process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_YEARLY   || 'https://pay.hotmart.com/J106555340X?off=47tdmvul',
};

type Row = {
  user_id: string;
  plan: PlanId;
  started_at: string;
  expires_at: string | null;
  assigned_by: 'system' | 'admin' | 'payment';
  kiwify_subscription_id?: string | null;
  payment_method?: string | null;
};

function toSubscription(r: Row): Subscription {
  return {
    userId: r.user_id,
    plan: r.plan,
    startedAt: r.started_at,
    expiresAt: r.expires_at,
    assignedBy: r.assigned_by,
    kiwifySubscriptionId: r.kiwify_subscription_id ?? null,
    paymentMethod: (r.payment_method as 'pix' | 'credit_card') ?? null,
  };
}

export async function getUserSubscription(userId: string): Promise<Subscription> {
  const supabase = createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id, plan, started_at, expires_at, assigned_by, kiwify_subscription_id, payment_method')
    .eq('user_id', userId)
    .single();

  if (!data) {
    return {
      userId,
      plan: 'free',
      startedAt: new Date().toISOString(),
      expiresAt: null,
      assignedBy: 'system',
      kiwifySubscriptionId: null,
      paymentMethod: null,
    };
  }

  const sub = toSubscription(data as Row);
  // Expira em free se passou a data
  if (sub.expiresAt && new Date(sub.expiresAt).getTime() < Date.now()) {
    return { ...sub, plan: 'free' };
  }
  return sub;
}

export async function getUserPlan(userId: string): Promise<PlanId> {
  return (await getUserSubscription(userId)).plan;
}

/**
 * Batch — busca planos vigentes pra múltiplos users em uma query.
 * Considera expiração (retorna 'free' se a sub expirou).
 */
export async function getPlansForUsers(userIds: string[]): Promise<Map<string, PlanId>> {
  if (userIds.length === 0) return new Map();
  const supabase = createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id, plan, expires_at')
    .in('user_id', userIds);
  const map = new Map<string, PlanId>();
  const now = Date.now();
  for (const r of (data ?? []) as { user_id: string; plan: PlanId; expires_at: string | null }[]) {
    const expired = r.expires_at && new Date(r.expires_at).getTime() < now;
    map.set(r.user_id, expired ? 'free' : r.plan);
  }
  return map;
}

export async function isPaid(userId: string): Promise<boolean> {
  return (await getUserPlan(userId)) !== 'free';
}

export async function setUserPlan(
  userId: string,
  plan: PlanId,
  assignedBy: 'admin' | 'system' = 'admin'
): Promise<Subscription> {
  const supabase = createClient();
  const info = PLANS[plan];
  const now = new Date();
  const expiresAt =
    plan === 'free' || info.durationMonths === 0
      ? null
      : new Date(now.getTime() + info.durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan,
      started_at: now.toISOString(),
      expires_at: expiresAt,
      assigned_by: assignedBy,
    })
    .select('user_id, plan, started_at, expires_at, assigned_by, kiwify_subscription_id, payment_method')
    .single();

  return toSubscription(data as Row);
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getPlanModifier(plan: PlanId): number {
  return PLANS[plan].modifier;
}

export function getPlanRank(plan: PlanId): number {
  return PLAN_ORDER.length - PLAN_ORDER.indexOf(plan);
}
