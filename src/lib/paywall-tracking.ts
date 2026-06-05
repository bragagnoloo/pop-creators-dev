import { pixelCustom } from './pixel';

/**
 * Dispara o evento PaywallShown nos dois lados:
 * - Pixel client-side (fbq trackCustom) com eventID UUID
 * - CAPI server-side com o mesmo eventID para deduplicação
 *
 * userId é opcional: paywall pode aparecer pra user anônimo. Quando ele é
 * passado, o endpoint enriquece o user_data com profile (em/ph/fn/ln + fbp/fbc/UA),
 * maximizando EMQ (Event Match Quality) do Meta.
 *
 * Fire-and-forget: nunca rejeita. Erros são logados no console e ignorados.
 */
export function trackPaywallShown(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;

  const eventId = crypto.randomUUID();

  // Pixel client-side (custom_data vazio: PaywallShown não é transação,
  // EMQ é maximizado via user_data no CAPI). {} em vez de undefined para
  // garantir que o fbq não trate como malformado quando o 4º arg é eventID.
  pixelCustom('PaywallShown', {}, eventId);

  // CAPI server-side com mesmo eventId
  fetch('/api/tracking/paywall-shown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userId ?? null,
      eventId,
      eventSourceUrl: window.location.href,
    }),
  }).catch(() => {});
}
