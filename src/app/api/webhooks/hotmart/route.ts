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
      full_price?: { value?: number };
      payment?: { type?: string; method?: string };
      offer?: { code?: string };
    };
    subscription?: {
      subscriber?: { code?: string };
      plan?: { name?: string };
    };
    // Estrutura do SUBSCRIPTION_CANCELLATION (difere dos eventos de compra)
    subscriber?: { code?: string; email?: string };
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

// offer.code → PlanId. Padrões = o `off=` de cada oferta (público); env sobrescreve.
// ⚠️ Confirmar no 1º payload real que data.purchase.offer.code == estes códigos.
const OFFER_MAP: Record<string, PlanId> = {
  [process.env.HOTMART_OFFER_MONTHLY  || 'hp9j1u5w']: 'monthly',
  [process.env.HOTMART_OFFER_SEMESTER || '9fs5f41h']: 'semester',
  [process.env.HOTMART_OFFER_YEARLY   || '47tdmvul']: 'yearly',
  // Ofertas da promo "20 anos" (cupom 20% OFF). Mantidas permanentemente para
  // que compras via cupom liberem o plano correto — o preço com desconto NÃO
  // casaria com o fallback de preço de tabela. Reconhecer códigos a mais é
  // inofensivo mesmo após a promo terminar.
  qe0i73w3: 'monthly',
  pcg3ywkl: 'semester',
  rxeqtcod: 'yearly',
};

function resolvePlan(payload: HotmartPayload): PlanId | null {
  const purchase = payload.data?.purchase;
  const code = purchase?.offer?.code;
  if (code) {
    if (OFFER_MAP[code]) return OFFER_MAP[code];
    // A Hotmart pode enviar o código com sufixo (visto em produção:
    // 'rxeqtcodJWT' para a oferta 'rxeqtcod'), o que derrubava a ativação —
    // o preço com cupom também não casa com a tabela, então caía em null.
    // Casar por prefixo cobre esse caso e sufixos futuros.
    const byPrefix = Object.keys(OFFER_MAP).find(k => k && code.startsWith(k));
    if (byPrefix) return OFFER_MAP[byPrefix];
  }
  // Rede de segurança: casa pelo preço de tabela (os 3 planos têm valores
  // distintos), caso o offer.code real difira do configurado.
  const listValue = purchase?.full_price?.value ?? purchase?.price?.value;
  if (typeof listValue === 'number') {
    const match = (['monthly', 'semester', 'yearly'] as PlanId[]).find(
      p => Math.abs(PLANS[p].priceTotal - listValue) < 0.01,
    );
    if (match) return match;
  }
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
  // Compra: data.subscription.subscriber.code + data.buyer.email
  // Cancelamento: data.subscriber.code + data.subscriber.email
  const subscriberCode = payload.data?.subscription?.subscriber?.code ?? payload.data?.subscriber?.code ?? null;
  const email          = (payload.data?.buyer?.email ?? payload.data?.subscriber?.email)?.toLowerCase().trim();
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

  /**
   * Assinatura vigente do usuário, para decidir se o evento pode mexer no acesso.
   *
   * Contexto: `subscriptions` tem UMA linha por usuário, mas um assinante pode ter
   * VÁRIAS assinaturas na Hotmart — quem compra um plano novo sem cancelar o antigo
   * fica com duas. Sem comparar o subscriber code, um evento da assinatura antiga
   * (renovação, cancelamento, estorno) atropela o plano que está valendo.
   */
  async function loadCurrentSubscription() {
    if (!userId) return null;
    const { data } = await supabase
      .from('subscriptions')
      .select('plan, expires_at, kiwify_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();
    return (data as {
      plan: PlanId;
      expires_at: string | null;
      kiwify_subscription_id: string | null;
    } | null) ?? null;
  }

  /** Há direito de acesso vigente? null ou data no passado = não. */
  function coversNow(expiresAt: string | null | undefined): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() > Date.now();
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

    // Guarda contra rebaixamento: a cobrança de uma assinatura ANTIGA não pode
    // sobrescrever um plano vigente melhor. Aplica quando (a) é a própria
    // assinatura registrada renovando, ou (b) o novo vencimento realmente estende
    // a cobertura — o que cobre primeira compra, renovação e upgrade de verdade.
    const current         = await loadCurrentSubscription();
    const sameSubscription = !!subscriberCode
      && current?.kiwify_subscription_id === subscriberCode;
    // `plan === 'free'` conta como sem cobertura mesmo que expires_at esteja no futuro.
    const hasCoverage      = current?.plan !== 'free' && coversNow(current?.expires_at);
    const extendsCoverage  = !hasCoverage
      || new Date(exp).getTime() > new Date(current!.expires_at!).getTime();
    const applyToSubscription = sameSubscription || extendsCoverage;

    if (applyToSubscription) {
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
    } else {
      // O pagamento abaixo é registrado de qualquer forma: o dinheiro foi cobrado.
      console.warn('[webhook/hotmart] compra nao aplicada ao acesso (nao estende a cobertura vigente)', {
        userId,
        eventSubscription:  subscriberCode,
        storedSubscription: current?.kiwify_subscription_id,
        incomingPlan:       plan,
        incomingExpires:    exp,
        currentPlan:        current?.plan,
        currentExpires:     current?.expires_at,
      });
    }

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

    // Só avisa quando o plano realmente mudou. Mandar "seu plano mensal foi
    // ativado" para quem segue no anual seria pior que não mandar nada.
    if (applyToSubscription) {
      fetch('https://poplinecreators.com.br/api/email/notify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ event: 'plan-subscribed', data: { userId, planName: PLANS[plan].name, expiresAt: exp } }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, applied: applyToSubscription });
  }

  // ------------------------------------------------- REFUND / CHARGEBACK
  if (event === 'PURCHASE_REFUNDED' || event === 'PURCHASE_CHARGEBACK') {
    const isChargeback = event === 'PURCHASE_CHARGEBACK';
    await logEvent(isChargeback ? 'chargeback' : 'order_refunded');

    if (!userId) return NextResponse.json({ ok: true, skipped: 'user_not_found' });

    // Guarda: só revoga o acesso se o estorno for da assinatura que o concede.
    // Quem tem duas assinaturas na Hotmart (comprou plano novo sem cancelar o
    // antigo) teria o plano vigente derrubado pelo estorno da assinatura antiga.
    const current = await loadCurrentSubscription();
    let revoke: boolean;

    if (current?.kiwify_subscription_id && subscriberCode) {
      revoke = current.kiwify_subscription_id === subscriberCode;
    } else if (!current?.kiwify_subscription_id) {
      // Sem código armazenado não há o que comparar (acontece depois de um
      // cancelamento). Cai para o plano do pagamento estornado: se ele não é o
      // plano vigente, o estorno é de outra assinatura e não deve revogar.
      const { data: refunded } = transaction
        ? await supabase.from('payments').select('plan').eq('kiwify_order_id', transaction).maybeSingle()
        : { data: null };
      revoke = !refunded || (refunded as { plan: PlanId }).plan === current?.plan;
    } else {
      // Há código armazenado, mas o evento veio sem código: não dá para atribuir.
      // Mantém o comportamento anterior para não deixar estorno sem efeito.
      revoke = true;
    }

    if (revoke) {
      await supabase.from('subscriptions').update({
        plan:                   'free',
        expires_at:             null,
        subscription_status:    isChargeback ? 'chargeback' : 'refunded',
        kiwify_subscription_id: null,
      }).eq('user_id', userId);
    } else {
      console.warn('[webhook/hotmart] estorno de outra assinatura: acesso preservado', {
        userId,
        eventSubscription:  subscriberCode,
        storedSubscription: current?.kiwify_subscription_id,
        currentPlan:        current?.plan,
        transaction,
      });
    }

    // Independente da decisão acima: o pagamento estornado é marcado como tal.
    // Filtro por transação, então nunca atinge outro pagamento do mesmo usuário.
    if (transaction) {
      await supabase.from('payments')
        .update({ status: isChargeback ? 'CHARGEBACK' : 'REFUNDED' })
        .eq('kiwify_order_id', transaction);
    }

    return NextResponse.json({ ok: true, revoked: revoke });
  }

  // ------------------------------------------------- CANCELAMENTO DE RENOVAÇÃO
  if (event === 'SUBSCRIPTION_CANCELLATION') {
    await logEvent('subscription_cancelled');
    // Prioriza o usuário (PK, via email da conta em data.subscriber.email);
    // fallback pelo código da assinatura se o email não casar com um perfil.
    if (userId) {
      // Guarda: só limpa se a assinatura cancelada for a registrada. Cancelar a
      // assinatura ANTIGA de quem tem duas marcava o usuário como "Cancelando" no
      // admin, mesmo com a renovação automática da vigente intacta.
      const current = await loadCurrentSubscription();
      if (!subscriberCode || current?.kiwify_subscription_id === subscriberCode) {
        await supabase.from('subscriptions')
          .update({ kiwify_subscription_id: null })
          .eq('user_id', userId);
      } else {
        console.warn('[webhook/hotmart] cancelamento de outra assinatura: renovacao preservada', {
          userId,
          eventSubscription:  subscriberCode,
          storedSubscription: current?.kiwify_subscription_id,
        });
      }
    } else if (subscriberCode) {
      await supabase.from('subscriptions')
        .update({ kiwify_subscription_id: null })
        .eq('kiwify_subscription_id', subscriberCode);
    }
    return NextResponse.json({ ok: true });
  }

  // ------------------------------------------------- OUTROS EVENTOS (só log)
  await logEvent(event || 'unknown');
  return NextResponse.json({ ok: true });
}
