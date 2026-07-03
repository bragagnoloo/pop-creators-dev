import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { PLANS } from '@/services/subscriptions';
import { sendCAPIEvents, sha256, digitsOnly } from '@/lib/meta-capi';
import type { PlanId } from '@/types';

// =============================================================================
// Webhook Hotmart (Postback 2.0) — ativação/renovação/reembolso de assinaturas.
// Coexiste com o webhook Kiwify (/api/checkout/webhook). Grava nas MESMAS
// colunas (kiwify_order_id ← transaction, kiwify_subscription_id ← subscriber),
// distinguindo a origem por provider='hotmart'. Eventos são normalizados para o
// vocabulário interno para que o admin/stats conte as vendas sem alteração.
// =============================================================================

type HotmartPayload = {
  event?: string;
  data?: {
    product?: { id?: number | string; name?: string };
    buyer?: { email?: string; name?: string; checkout_phone?: string };
    purchase?: {
      transaction?: string;
      status?: string;
      recurrence_number?: number;
      price?: { value?: number };
      payment?: { type?: string; method?: string };
      offer?: { code?: string };
    };
    subscription?: {
      subscriber?: { code?: string };
      plan?: { name?: string };
    };
  };
};

type ProfileRow = {
  id: string;
  email: string;
  whatsapp: string | null;
  full_name: string | null;
  meta_fbp: string | null;
  meta_fbc: string | null;
  meta_user_agent: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
};

// offer.code → PlanId. As chaves vêm das envs; entradas '' (env ausente) são inertes.
const OFFER_MAP: Record<string, PlanId> = {
  [process.env.HOTMART_OFFER_MONTHLY ?? '']:  'monthly',
  [process.env.HOTMART_OFFER_SEMESTER ?? '']: 'semester',
  [process.env.HOTMART_OFFER_YEARLY ?? '']:   'yearly',
};

function resolvePlan(payload: HotmartPayload): PlanId | null {
  const code = payload.data?.purchase?.offer?.code;
  if (code && OFFER_MAP[code]) return OFFER_MAP[code];
  return null;
}

function expiresAt(plan: PlanId): string {
  const months = PLANS[plan].durationMonths;
  return new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  // 1. Autenticação via hottok (header, no Next.js chega lowercased)
  const hottok = req.headers.get('x-hotmart-hottok');
  if (!process.env.HOTMART_HOTTOK || hottok !== process.env.HOTMART_HOTTOK) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: HotmartPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const event          = payload.event ?? '';
  const purchase       = payload.data?.purchase;
  const transaction    = purchase?.transaction ?? null;
  const subscriberCode = payload.data?.subscription?.subscriber?.code ?? null;
  const email          = payload.data?.buyer?.email?.toLowerCase().trim();
  const rawMethod      = purchase?.payment?.type ?? purchase?.payment?.method ?? null;
  const paymentMethod  = rawMethod ? rawMethod.toLowerCase() : null;
  const plan           = resolvePlan(payload);

  // Localiza o usuário por email (dados completos para o CAPI)
  let profile: ProfileRow | null = null;
  if (email) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, whatsapp, full_name, meta_fbp, meta_fbc, meta_user_agent, city, state, cep')
      .eq('email', email)
      .single();
    profile = (data as ProfileRow | null) ?? null;
  }
  const userId = profile?.id ?? null;

  // Loga o evento normalizado (nome cru preservado em raw_payload)
  async function logEvent(eventType: string) {
    await supabase.from('subscription_events').insert({
      event_type:             eventType,
      provider:               'hotmart',
      kiwify_order_id:        transaction,
      kiwify_subscription_id: subscriberCode,
      user_id:                userId,
      plan,
      amount:                 purchase?.price?.value ?? null,
      payment_method:         paymentMethod,
      raw_payload:            payload as unknown as Record<string, unknown>,
    });
  }

  // ------------------------------------------------------------------ APPROVED
  if (event === 'PURCHASE_APPROVED') {
    if (!plan) {
      await logEvent('order_approved');
      console.error('[webhook/hotmart] unresolved plan for offer', purchase?.offer?.code);
      return NextResponse.json({ ok: true, skipped: 'unresolved_plan' });
    }

    // Idempotência por transaction (evita dupla ativação e dupla contagem)
    if (transaction) {
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('kiwify_order_id', transaction)
        .single();
      if (existing) return NextResponse.json({ ok: true, skipped: 'duplicate' });
    }

    if (!userId || !profile) {
      await logEvent('order_approved');
      console.warn('[webhook/hotmart] user not found for email', email);
      return NextResponse.json({ ok: true, skipped: 'user_not_found' });
    }

    // Novo vs renovação: recorrência Hotmart > 1 OU já tem histórico de pagamento
    const recurrence = purchase?.recurrence_number ?? 1;
    let isRenewal = recurrence > 1;
    if (!isRenewal) {
      const { count } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      isRenewal = (count ?? 0) > 0;
    }
    await logEvent(isRenewal ? 'subscription_renewed' : 'order_approved');

    const exp    = expiresAt(plan);
    const amount = purchase?.price?.value ?? PLANS[plan].priceTotal;

    await supabase.from('subscriptions').upsert({
      user_id:                userId,
      plan,
      started_at:             new Date().toISOString(),
      expires_at:             exp,
      assigned_by:            'payment',
      subscription_status:    'active',
      provider:               'hotmart',
      kiwify_subscription_id: subscriberCode,
      payment_method:         paymentMethod,
    });

    await supabase.from('payments').insert({
      user_id:         userId,
      kiwify_order_id: transaction,
      plan,
      amount,
      status:          'CONFIRMED',
      provider:        'hotmart',
      payment_method:  paymentMethod,
      capi_event_id:   transaction,
    });

    // CAPI — Purchase + Subscribe (event_id = transaction ⇒ dedup com o Pixel)
    if (transaction) {
      const names     = (profile.full_name ?? '').trim().split(' ').filter(Boolean);
      const cepDigits = profile.cep ? digitsOnly(profile.cep) : '';
      const userData = {
        em:                sha256(profile.email),
        ph:                profile.whatsapp ? sha256(digitsOnly(profile.whatsapp)) : undefined,
        fn:                names[0]         ? sha256(names[0].toLowerCase())                : undefined,
        ln:                names.length > 1 ? sha256(names[names.length - 1].toLowerCase()) : undefined,
        ct:                profile.city  ? sha256(profile.city)  : undefined,
        st:                profile.state ? sha256(profile.state) : undefined,
        zp:                cepDigits     ? sha256(cepDigits)     : undefined,
        country:           sha256('br'),
        external_id:       sha256(userId),
        fbp:               profile.meta_fbp ?? undefined,
        fbc:               profile.meta_fbc ?? undefined,
        client_user_agent: profile.meta_user_agent ?? undefined,
      };

      const eventTime = Math.floor(Date.now() / 1000);
      sendCAPIEvents([
        {
          event_name:       'Purchase',
          event_time:       eventTime,
          event_id:         transaction,
          event_source_url: 'https://poplinecreators.com.br/obrigado',
          action_source:    'website',
          user_data:        userData,
          custom_data: {
            currency:     'BRL',
            value:        amount,
            content_name: PLANS[plan].name,
            content_ids:  [plan],
            content_type: 'product',
            order_id:     transaction,
          },
        },
        {
          event_name:       'Subscribe',
          event_time:       eventTime,
          event_id:         `${transaction}_sub`,
          event_source_url: 'https://poplinecreators.com.br/obrigado',
          action_source:    'website',
          user_data:        userData,
          custom_data: {
            currency:      'BRL',
            value:         amount,
            content_name:  PLANS[plan].name,
            content_ids:   [plan],
            content_type:  'product',
            order_id:      transaction,
            predicted_ltv: amount * (PLANS[plan].durationMonths >= 12 ? 1 : 12 / PLANS[plan].durationMonths),
          },
        },
      ]).catch(err => console.error('[capi] Purchase/Subscribe error:', err));
    }

    // Marca a primeira assinatura (preserva a data original em quem já assinou)
    await supabase
      .from('profiles')
      .update({
        kiwify_subscription_id: subscriberCode,
        first_subscribed_at:    new Date().toISOString(),
      })
      .eq('id', userId)
      .is('first_subscribed_at', null);

    fetch('https://poplinecreators.com.br/api/email/notify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ event: 'plan-subscribed', data: { userId, planName: PLANS[plan].name, expiresAt: exp } }),
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  }

  // ------------------------------------------------- REFUND / CHARGEBACK
  if (event === 'PURCHASE_REFUNDED' || event === 'PURCHASE_CHARGEBACK') {
    const isChargeback = event === 'PURCHASE_CHARGEBACK';
    await logEvent(isChargeback ? 'chargeback' : 'order_refunded');

    if (!userId) return NextResponse.json({ ok: true, skipped: 'user_not_found' });

    await supabase.from('subscriptions').update({
      plan:                   'free',
      expires_at:             null,
      subscription_status:    isChargeback ? 'chargeback' : 'refunded',
      kiwify_subscription_id: null,
    }).eq('user_id', userId);

    if (transaction) {
      await supabase.from('payments')
        .update({ status: isChargeback ? 'CHARGEBACK' : 'REFUNDED' })
        .eq('kiwify_order_id', transaction);
    }

    return NextResponse.json({ ok: true });
  }

  // ------------------------------------------------- CANCELAMENTO DE RENOVAÇÃO
  if (event === 'SUBSCRIPTION_CANCELLATION') {
    await logEvent('subscription_cancelled');
    if (userId) {
      await supabase.from('subscriptions')
        .update({ kiwify_subscription_id: null })
        .eq('user_id', userId);
    }
    return NextResponse.json({ ok: true });
  }

  // ------------------------------------------------- OUTROS EVENTOS (só log)
  await logEvent(event || 'unknown');
  return NextResponse.json({ ok: true });
}
