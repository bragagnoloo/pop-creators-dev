import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// REC_Plano Anual: oferta de recuperação de carrinho que libera o plano anual,
// mas é cobrada mês a mês pela Hotmart. O vencimento acompanha a parcela; os
// recursos são os do anual. Os demais planos não passam por aqui.
// =============================================================================

/** Plano da assinatura na Hotmart (não muda com cupom ou oferta nova). */
const REC_HOTMART_PLAN_IDS = new Set(['1343032']);

/** Folga depois da data da parcela antes de o acesso vencer. */
export const REC_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isRecAnnualPlan(plan: { id?: number | string; name?: string } | undefined): boolean {
  if (!plan) return false;
  if (plan.id !== undefined && REC_HOTMART_PLAN_IDS.has(String(plan.id))) return true;
  return (plan.name ?? '').toUpperCase().startsWith('REC_');
}

/**
 * Próxima parcela informada pela Hotmart. O campo vem de fora, então só vale se
 * estiver no futuro e dentro de um ciclo mensal; senão assume 30 dias.
 */
export function recNextCharge(dateNextCharge: number | undefined): Date {
  const now = Date.now();
  if (typeof dateNextCharge === 'number' && Number.isFinite(dateNextCharge)
      && dateNextCharge > now && dateNextCharge <= now + 45 * DAY_MS) {
    return new Date(dateNextCharge);
  }
  return new Date(now + 30 * DAY_MS);
}

/** Acesso até a próxima parcela + folga. */
export function recExpiresAt(nextCharge: Date): string {
  return new Date(nextCharge.getTime() + REC_GRACE_MS).toISOString();
}

/** Parcela paga: registra a próxima cobrança e zera o aviso. */
export async function recordRecPayment(
  admin: SupabaseClient,
  userId: string,
  subscriberCode: string | null,
  nextCharge: Date,
): Promise<void> {
  const { error } = await admin.from('rec_annual_billing').upsert({
    user_id:          userId,
    subscriber_code:  subscriberCode,
    next_charge_at:   nextCharge.toISOString(),
    warned_charge_at: null,
    warned_at:        null,
    updated_at:       new Date().toISOString(),
  });
  if (error) console.error('[rec-annual] falha ao registrar parcela', userId, error);
}
