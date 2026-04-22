/**
 * Cota mensal de chamadas à IA por plano. O plano 'free' é bloqueado antes
 * (requirePaidUser), então o valor é apenas fallback defensivo.
 */

import { createAdminClient, createClient } from '@/lib/supabase/server';

export const AI_CALLS_PER_MONTH: Record<string, number> = {
  free: 0,
  monthly: 100,
  semester: 300,
  yearly: 600,
};

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  exceeded: boolean;
}

export async function getQuotaStatus(userId: string, plan: string, role: string): Promise<QuotaStatus> {
  // Admin tem cota "ilimitada" para evitar bloqueio acidental em suporte.
  const limit = role === 'admin' ? Number.MAX_SAFE_INTEGER : (AI_CALLS_PER_MONTH[plan] ?? 0);

  const supabase = await createClient();
  const { data } = await supabase.rpc('get_ai_usage_current_month', { p_user_id: userId });
  const used = Number(data ?? 0);

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    exceeded: used >= limit,
  };
}

export async function recordAiCall(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.rpc('record_ai_call', { p_user_id: userId });
  } catch (err) {
    console.error('[ai-quota] failed to record call', err);
  }
}
