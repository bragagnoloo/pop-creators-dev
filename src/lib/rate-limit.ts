/**
 * Rate limit persistente em Postgres (via função SECURITY DEFINER).
 *
 * Funciona em serverless (compartilhado entre lambdas). Falha-aberto em caso de
 * erro do banco (preferimos não bloquear usuário legítimo a 500; monitorar via logs).
 */

import { createAdminClient } from '@/lib/supabase/server';

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_max: max,
      p_window_ms: windowMs,
    });

    if (error) {
      console.error('[rate-limit] rpc error', error);
      return { allowed: true };
    }

    const result = data as { allowed: boolean; retry_after_ms?: number } | null;
    if (!result) return { allowed: true };

    if (result.allowed) return { allowed: true };
    return {
      allowed: false,
      retryAfterMs: Number(result.retry_after_ms ?? windowMs),
    };
  } catch (err) {
    console.error('[rate-limit] unexpected', err);
    return { allowed: true };
  }
}
