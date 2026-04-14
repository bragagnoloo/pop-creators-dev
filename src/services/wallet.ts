import { BalanceCredit, Withdrawal, PixKeyType } from '@/types';
import { getItem, setItem, generateId } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

function getCredits(): BalanceCredit[] {
  return getItem<BalanceCredit[]>(STORAGE_KEYS.CREDITS) || [];
}

function saveCredits(c: BalanceCredit[]): void {
  setItem(STORAGE_KEYS.CREDITS, c);
}

function getWithdrawalsRaw(): Withdrawal[] {
  return getItem<Withdrawal[]>(STORAGE_KEYS.WITHDRAWALS) || [];
}

function saveWithdrawals(w: Withdrawal[]): void {
  setItem(STORAGE_KEYS.WITHDRAWALS, w);
}

// ---------- Credits ----------

export function getCreditForUserCampaign(userId: string, campaignId: string): BalanceCredit | null {
  return getCredits().find(c => c.userId === userId && c.campaignId === campaignId) || null;
}

export function getUserCredits(userId: string): BalanceCredit[] {
  return getCredits().filter(c => c.userId === userId);
}

export function getCampaignCredits(campaignId: string): BalanceCredit[] {
  return getCredits().filter(c => c.campaignId === campaignId);
}

export function getAllCredits(): BalanceCredit[] {
  return getCredits();
}

export function createCredit(userId: string, campaignId: string, amount: number): BalanceCredit | null {
  const existing = getCreditForUserCampaign(userId, campaignId);
  if (existing) return null;
  const credit: BalanceCredit = {
    id: generateId(),
    userId,
    campaignId,
    amount,
    status: 'processing',
    createdAt: new Date().toISOString(),
    releasedAt: null,
    consumedAmount: 0,
  };
  saveCredits([...getCredits(), credit]);
  return credit;
}

export function releaseCredit(creditId: string): BalanceCredit | null {
  const credits = getCredits();
  const idx = credits.findIndex(c => c.id === creditId);
  if (idx === -1) return null;
  if (credits[idx].status !== 'processing') return credits[idx];
  credits[idx] = { ...credits[idx], status: 'available', releasedAt: new Date().toISOString() };
  saveCredits(credits);
  return credits[idx];
}

// ---------- Balances ----------

export interface WalletSummary {
  available: number;
  processing: number;
  totalWithdrawn: number;
}

export function getUserWalletSummary(userId: string): WalletSummary {
  const credits = getUserCredits(userId);
  let available = 0;
  let processing = 0;
  for (const c of credits) {
    if (c.status === 'processing') processing += c.amount;
    if (c.status === 'available') available += c.amount - c.consumedAmount;
  }
  const totalWithdrawn = getWithdrawalsRaw()
    .filter(w => w.userId === userId && w.status === 'paid')
    .reduce((acc, w) => acc + w.amount, 0);
  return { available, processing, totalWithdrawn };
}

// ---------- Withdrawals ----------

export function getUserWithdrawals(userId: string): Withdrawal[] {
  return getWithdrawalsRaw()
    .filter(w => w.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAllWithdrawals(): Withdrawal[] {
  return getWithdrawalsRaw().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function requestWithdrawal(
  userId: string,
  amount: number,
  pixKey: string,
  pixKeyType: PixKeyType
): { success: true; withdrawal: Withdrawal } | { success: false; error: string } {
  if (amount <= 0) return { success: false, error: 'Valor inválido.' };
  const summary = getUserWalletSummary(userId);
  if (amount > summary.available) {
    return { success: false, error: 'Saldo disponível insuficiente.' };
  }

  // FIFO consume
  const credits = getCredits()
    .filter(c => c.userId === userId && c.status === 'available' && c.amount - c.consumedAmount > 0)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let remaining = amount;
  const consumed: { creditId: string; amount: number }[] = [];
  for (const credit of credits) {
    if (remaining <= 0) break;
    const free = credit.amount - credit.consumedAmount;
    const take = Math.min(free, remaining);
    consumed.push({ creditId: credit.id, amount: take });
    remaining -= take;
  }

  // Persist credit consumption
  const all = getCredits();
  for (const { creditId, amount: amt } of consumed) {
    const idx = all.findIndex(c => c.id === creditId);
    if (idx === -1) continue;
    const newConsumed = all[idx].consumedAmount + amt;
    const fullyConsumed = newConsumed >= all[idx].amount;
    all[idx] = {
      ...all[idx],
      consumedAmount: newConsumed,
      status: fullyConsumed ? 'withdrawn' : all[idx].status,
    };
  }
  saveCredits(all);

  const withdrawal: Withdrawal = {
    id: generateId(),
    userId,
    amount,
    pixKey,
    pixKeyType,
    status: 'requested',
    createdAt: new Date().toISOString(),
    paidAt: null,
    consumedCredits: consumed,
  };
  saveWithdrawals([...getWithdrawalsRaw(), withdrawal]);
  return { success: true, withdrawal };
}

export function markWithdrawalPaid(withdrawalId: string): Withdrawal | null {
  const all = getWithdrawalsRaw();
  const idx = all.findIndex(w => w.id === withdrawalId);
  if (idx === -1) return null;
  if (all[idx].status === 'paid') return all[idx];
  all[idx] = { ...all[idx], status: 'paid', paidAt: new Date().toISOString() };
  saveWithdrawals(all);
  return all[idx];
}

// ---------- Formatting ----------

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const pixKeyTypeLabels: Record<PixKeyType, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  random: 'Chave aleatória',
};
