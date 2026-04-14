import { Subscription, PlanId } from '@/types';
import { getItem, setItem } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

export interface PlanInfo {
  id: PlanId;
  name: string;
  priceTotal: number; // total paid upfront
  durationMonths: number;
  monthlyEquivalent: number;
  modifier: number; // 1x, 2x, 5x approval modifier
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

function getAll(): Subscription[] {
  return getItem<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS) || [];
}

function saveAll(list: Subscription[]): void {
  setItem(STORAGE_KEYS.SUBSCRIPTIONS, list);
}

export function getUserSubscription(userId: string): Subscription {
  const sub = getAll().find(s => s.userId === userId);
  if (!sub) {
    return {
      userId,
      plan: 'free',
      startedAt: new Date().toISOString(),
      expiresAt: null,
      assignedBy: 'system',
    };
  }
  // Expire if past expiresAt
  if (sub.expiresAt && new Date(sub.expiresAt).getTime() < Date.now()) {
    return { ...sub, plan: 'free', expiresAt: sub.expiresAt };
  }
  return sub;
}

export function getUserPlan(userId: string): PlanId {
  return getUserSubscription(userId).plan;
}

export function isPaid(userId: string): boolean {
  return getUserPlan(userId) !== 'free';
}

export function setUserPlan(userId: string, plan: PlanId, assignedBy: 'admin' | 'system' = 'admin'): Subscription {
  const all = getAll();
  const now = new Date();
  const info = PLANS[plan];
  const expiresAt =
    plan === 'free' || info.durationMonths === 0
      ? null
      : new Date(now.getTime() + info.durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

  const record: Subscription = {
    userId,
    plan,
    startedAt: now.toISOString(),
    expiresAt,
    assignedBy,
  };
  const idx = all.findIndex(s => s.userId === userId);
  if (idx === -1) all.push(record);
  else all[idx] = record;
  saveAll(all);
  return record;
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
