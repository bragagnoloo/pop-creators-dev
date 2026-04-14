import { Subscription, PlanId } from '@/types';
import { createClient } from '@/lib/supabase/client';

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
    tagline: '2x mais chance em campanhas + prêmios exclusivos.',
  },
  yearly: {
    id: 'yearly',
    name: 'Anual',
    priceTotal: 358.8,
    durationMonths: 12,
    monthlyEquivalent: 29.9,
    modifier: 5,
    prizes: true,
    tagline: '5x mais chance em campanhas + prêmios VIP.',
  },
};

export const PLAN_ORDER: PlanId[] = ['yearly', 'semester', 'monthly', 'free'];

type Row = {
  user_id: string;
  plan: PlanId;
  started_at: string;
  expires_at: string | null;
  assigned_by: 'system' | 'admin';
};

function toSubscription(r: Row): Subscription {
  return {
    userId: r.user_id,
    plan: r.plan,
    startedAt: r.started_at,
    expiresAt: r.expires_at,
    assignedBy: r.assigned_by,
  };
}

export async function getUserSubscription(userId: string): Promise<Subscription> {
  const supabase = createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id, plan, started_at, expires_at, assigned_by')
    .eq('user_id', userId)
    .single();

  if (!data) {
    return {
      userId,
      plan: 'free',
      startedAt: new Date().toISOString(),
      expiresAt: null,
      assignedBy: 'system',
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
    .select('user_id, plan, started_at, expires_at, assigned_by')
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
