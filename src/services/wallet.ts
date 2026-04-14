import { BalanceCredit, Withdrawal, PixKeyType } from '@/types';
import { createClient } from '@/lib/supabase/client';

type CreditRow = {
  id: string;
  user_id: string;
  campaign_id: string;
  amount: number;
  status: BalanceCredit['status'];
  consumed_amount: number;
  created_at: string;
  released_at: string | null;
};

type WithdrawalRow = {
  id: string;
  user_id: string;
  amount: number;
  pix_key: string;
  pix_key_type: PixKeyType;
  status: Withdrawal['status'];
  created_at: string;
  paid_at: string | null;
  consumed_credits: { creditId: string; amount: number }[];
};

function toCredit(r: CreditRow): BalanceCredit {
  return {
    id: r.id,
    userId: r.user_id,
    campaignId: r.campaign_id,
    amount: Number(r.amount),
    status: r.status,
    consumedAmount: Number(r.consumed_amount),
    createdAt: r.created_at,
    releasedAt: r.released_at,
  };
}

function toWithdrawal(r: WithdrawalRow): Withdrawal {
  return {
    id: r.id,
    userId: r.user_id,
    amount: Number(r.amount),
    pixKey: r.pix_key,
    pixKeyType: r.pix_key_type,
    status: r.status,
    createdAt: r.created_at,
    paidAt: r.paid_at,
    consumedCredits: r.consumed_credits || [],
  };
}

const C_SELECT = 'id, user_id, campaign_id, amount, status, consumed_amount, created_at, released_at';
const W_SELECT = 'id, user_id, amount, pix_key, pix_key_type, status, created_at, paid_at, consumed_credits';

// ---------- Credits ----------

export async function getCreditForUserCampaign(userId: string, campaignId: string): Promise<BalanceCredit | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('balance_credits')
    .select(C_SELECT)
    .eq('user_id', userId)
    .eq('campaign_id', campaignId)
    .maybeSingle();
  return data ? toCredit(data as CreditRow) : null;
}

export async function getUserCredits(userId: string): Promise<BalanceCredit[]> {
  const supabase = createClient();
  const { data } = await supabase.from('balance_credits').select(C_SELECT).eq('user_id', userId);
  if (!data) return [];
  return (data as CreditRow[]).map(toCredit);
}

export async function getCampaignCredits(campaignId: string): Promise<BalanceCredit[]> {
  const supabase = createClient();
  const { data } = await supabase.from('balance_credits').select(C_SELECT).eq('campaign_id', campaignId);
  if (!data) return [];
  return (data as CreditRow[]).map(toCredit);
}

export async function getAllCredits(): Promise<BalanceCredit[]> {
  const supabase = createClient();
  const { data } = await supabase.from('balance_credits').select(C_SELECT);
  if (!data) return [];
  return (data as CreditRow[]).map(toCredit);
}

export async function createCredit(
  userId: string,
  campaignId: string,
  amount: number
): Promise<BalanceCredit | null> {
  const existing = await getCreditForUserCampaign(userId, campaignId);
  if (existing) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from('balance_credits')
    .insert({ user_id: userId, campaign_id: campaignId, amount, status: 'processing' })
    .select(C_SELECT)
    .single();
  return data ? toCredit(data as CreditRow) : null;
}

export async function releaseCredit(creditId: string): Promise<BalanceCredit | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('balance_credits')
    .update({ status: 'available', released_at: new Date().toISOString() })
    .eq('id', creditId)
    .eq('status', 'processing')
    .select(C_SELECT)
    .single();
  return data ? toCredit(data as CreditRow) : null;
}

// ---------- Balance summary ----------

export interface WalletSummary {
  available: number;
  processing: number;
  totalWithdrawn: number;
}

export async function getUserWalletSummary(userId: string): Promise<WalletSummary> {
  const [credits, withdrawals] = await Promise.all([
    getUserCredits(userId),
    getUserWithdrawals(userId),
  ]);
  let available = 0;
  let processing = 0;
  for (const c of credits) {
    if (c.status === 'processing') processing += c.amount;
    if (c.status === 'available') available += c.amount - c.consumedAmount;
  }
  const totalWithdrawn = withdrawals.filter(w => w.status === 'paid').reduce((acc, w) => acc + w.amount, 0);
  return { available, processing, totalWithdrawn };
}

// ---------- Withdrawals ----------

export async function getUserWithdrawals(userId: string): Promise<Withdrawal[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('withdrawals')
    .select(W_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (!data) return [];
  return (data as WithdrawalRow[]).map(toWithdrawal);
}

export async function getAllWithdrawals(): Promise<Withdrawal[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('withdrawals')
    .select(W_SELECT)
    .order('created_at', { ascending: false });
  if (!data) return [];
  return (data as WithdrawalRow[]).map(toWithdrawal);
}

export async function requestWithdrawal(
  userId: string,
  amount: number,
  pixKey: string,
  pixKeyType: PixKeyType
): Promise<{ success: true; withdrawal: Withdrawal } | { success: false; error: string }> {
  if (amount <= 0) return { success: false, error: 'Valor inválido.' };
  const supabase = createClient();

  const summary = await getUserWalletSummary(userId);
  if (amount > summary.available) {
    return { success: false, error: 'Saldo disponível insuficiente.' };
  }

  // Pega créditos disponíveis FIFO
  const credits = (await getUserCredits(userId))
    .filter(c => c.status === 'available' && c.amount - c.consumedAmount > 0)
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

  // Persiste consumo por crédito
  for (const { creditId, amount: amt } of consumed) {
    const credit = credits.find(c => c.id === creditId);
    if (!credit) continue;
    const newConsumed = credit.consumedAmount + amt;
    const fullyConsumed = newConsumed >= credit.amount;
    await supabase
      .from('balance_credits')
      .update({
        consumed_amount: newConsumed,
        status: fullyConsumed ? 'withdrawn' : credit.status,
      })
      .eq('id', creditId);
  }

  // Cria o saque
  const { data, error } = await supabase
    .from('withdrawals')
    .insert({
      user_id: userId,
      amount,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
      consumed_credits: consumed,
    })
    .select(W_SELECT)
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Falha ao criar saque.' };
  }
  return { success: true, withdrawal: toWithdrawal(data as WithdrawalRow) };
}

export async function markWithdrawalPaid(withdrawalId: string): Promise<Withdrawal | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('withdrawals')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', withdrawalId)
    .eq('status', 'requested')
    .select(W_SELECT)
    .single();
  return data ? toWithdrawal(data as WithdrawalRow) : null;
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
