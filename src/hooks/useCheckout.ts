'use client';

import { useCallback, useState } from 'react';
import { pixelInitiateCheckout } from '@/lib/pixel';
import { createClient } from '@/lib/supabase/client';
import { PLANS, CHECKOUT_URLS } from '@/services/subscriptions';
import type { PlanId } from '@/types';

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : '';
}

interface User {
  id: string;
  email: string;
}

/**
 * Encapsula a lógica de redirecionamento ao checkout Kiwify com tracking
 * Meta (Pixel + CAPI) idêntico ao da página /dashboard/planos. Reutilizado
 * pelo Paywall e pela própria página de planos.
 */
export function useCheckout(user: User | null | undefined): {
  subscribeTo: (planId: PlanId) => Promise<void>;
  busy: boolean;
} {
  const [busy, setBusy] = useState(false);

  const subscribeTo = useCallback(async (plan: PlanId) => {
    if (!user || plan === 'free' || busy) return;
    const checkoutUrl = CHECKOUT_URLS[plan];
    if (!checkoutUrl) {
      console.error('[checkout] URL de checkout não configurada para:', plan);
      return;
    }
    setBusy(true);

    // UUID compartilhado entre pixel e CAPI → Meta deduplica como 1 evento
    const eventId = crypto.randomUUID();

    pixelInitiateCheckout({
      value: PLANS[plan].priceTotal,
      currency: 'BRL',
      content_name: PLANS[plan].name,
    }, eventId);

    // Captura fbp/fbc/user-agent antes de sair do domínio (fire-and-forget)
    const fbp = getCookie('_fbp');
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    const fbc = getCookie('_fbc') || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : '');
    const userAgent = navigator.userAgent;
    fetch('/api/tracking/meta-params', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fbp: fbp || undefined,
        fbc: fbc || undefined,
        userAgent,
      }),
    }).catch(() => {});

    // CAPI InitiateCheckout server-side com mesmo eventId para deduplicação
    fetch('/api/tracking/initiate-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, eventId }),
    }).catch(() => {});

    const params = new URLSearchParams({ email: user.email });

    // Busca nome e telefone do profile — se falhar, redireciona mesmo assim
    try {
      const { data } = await createClient()
        .from('profiles')
        .select('full_name, whatsapp')
        .eq('id', user.id)
        .single();
      if (data?.full_name) params.set('name', data.full_name);
      if (data?.whatsapp) params.set('phone', data.whatsapp.replace(/\D/g, ''));
    } catch {
      // Redireciona com apenas o email se o fetch falhar
    }

    window.location.href = `${checkoutUrl}?${params.toString()}`;
  }, [user, busy]);

  return { subscribeTo, busy };
}
