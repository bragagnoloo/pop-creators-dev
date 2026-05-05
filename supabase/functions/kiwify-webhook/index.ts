import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const KIWIFY_WEBHOOK_TOKEN = Deno.env.get('KIWIFY_WEBHOOK_TOKEN')!;
const META_PIXEL_ID = Deno.env.get('META_PIXEL_ID');
const META_CAPI_TOKEN = Deno.env.get('META_CAPI_TOKEN');
const META_TEST_EVENT_CODE = Deno.env.get('META_TEST_EVENT_CODE');
const KIWIFY_PLAN_ID_MONTHLY = Deno.env.get('KIWIFY_PLAN_ID_MONTHLY') ?? '';
const KIWIFY_PLAN_ID_SEMESTER = Deno.env.get('KIWIFY_PLAN_ID_SEMESTER') ?? '';
const KIWIFY_PLAN_ID_YEARLY = Deno.env.get('KIWIFY_PLAN_ID_YEARLY') ?? '';

// =============================================================================
// Helpers
// =============================================================================

async function hashSHA256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PLANS: Record<string, { name: string; priceTotal: number }> = {
  free:     { name: 'Explorar',   priceTotal: 0 },
  monthly:  { name: 'Mensal',     priceTotal: 49.90 },
  semester: { name: 'Semestral',  priceTotal: 239.40 },
  yearly:   { name: 'Anual',      priceTotal: 358.80 },
};

const KIWIFY_PLAN_MAP: Record<string, string> = {
  [KIWIFY_PLAN_ID_MONTHLY]:  'monthly',
  [KIWIFY_PLAN_ID_SEMESTER]: 'semester',
  [KIWIFY_PLAN_ID_YEARLY]:   'yearly',
};

const FREQUENCY_MAP: Record<string, string> = {
  monthly:    'monthly',
  semiannual: 'semester',
  annual:     'yearly',
};

// =============================================================================
// Meta CAPI
// =============================================================================

async function sendCAPIEvents(events: unknown[]): Promise<void> {
  if (!META_PIXEL_ID || !META_CAPI_TOKEN) return;
  const payload: Record<string, unknown> = { data: events };
  if (META_TEST_EVENT_CODE) payload.test_event_code = META_TEST_EVENT_CODE;
  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  } catch (err) {
    console.error('[capi] erro:', err);
  }
}

// =============================================================================
// E-mails simples via Resend
// =============================================================================

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = 'POPline Creators <noreply@poplinecreators.com.br>';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
  } catch (err) {
    console.error('[email] erro:', err);
  }
}

function emailPlanActivated(fullName: string, planName: string, expiresAt: string): string {
  return `<p>Olá, ${fullName.split(' ')[0]}!</p>
<p>Seu plano <strong>${planName}</strong> está ativo até ${expiresAt}.</p>
<p><a href="https://poplinecreators.com.br/dashboard/campanhas">Explorar campanhas →</a></p>`;
}

function emailSubscriptionCancelled(fullName: string, planName: string, accessUntil: string): string {
  return `<p>Olá, ${fullName.split(' ')[0]}!</p>
<p>A renovação automática do plano <strong>${planName}</strong> foi cancelada.
Você mantém acesso até ${accessUntil}.</p>`;
}

function emailRefundConfirmed(fullName: string, planName: string, amount: string): string {
  return `<p>Olá, ${fullName.split(' ')[0]}!</p>
<p>O reembolso de <strong>${amount}</strong> do plano <strong>${planName}</strong> foi confirmado.
O valor retorna em até 10 dias úteis.</p>`;
}

// =============================================================================
// Handler principal
// =============================================================================

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Autenticação
  if (body.signature !== KIWIFY_WEBHOOK_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const order = body.order as Record<string, unknown> | undefined;
  if (!order) return new Response(JSON.stringify({ ok: true }), { status: 200 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const eventType = String(order.webhook_event_type ?? '');
  const email = String((order.Customer as Record<string, unknown>)?.email ?? '').toLowerCase().trim();
  const orderId = String(order.order_id ?? '');
  const planId = String((order.Subscription as Record<string, unknown>)?.plan?.id ?? '');
  const planFrequency = String((order.Subscription as Record<string, unknown>)?.plan?.frequency ?? '');
  const accessUntil = String((order.Subscription as Record<string, unknown>)?.customer_access?.access_until ?? '');
  const subscriptionId = String(order.subscription_id ?? '');
  const paymentMethod = String(order.payment_method ?? '');
  const tracking = (order.TrackingParameters as Record<string, unknown>) ?? {};
  const commissions = (order.Commissions as Record<string, unknown>) ?? {};
  const customer = (order.Customer as Record<string, unknown>) ?? {};

  if (!email) return new Response(JSON.stringify({ ok: true }), { status: 200 });

  // Lookup do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, meta_fbp, meta_fbc, first_subscribed_at, state, city, cep, whatsapp')
    .eq('email', email)
    .single();

  // Identifica o plano
  const plan: string | undefined =
    KIWIFY_PLAN_MAP[planId] ?? FREQUENCY_MAP[planFrequency];

  // Registra TODOS os eventos para analytics (await — Edge Function termina antes de void resolver)
  await supabase.from('subscription_events').insert({
    user_id: profile?.id ?? null,
    event_type: eventType,
    kiwify_order_id: orderId || null,
    kiwify_subscription_id: subscriptionId || null,
    plan: plan ?? null,
    amount: commissions.charge_amount ? Number(commissions.charge_amount) / 100 : null,
    payment_method: paymentMethod || null,
    utm_source:   tracking.utm_source   ?? null,
    utm_medium:   tracking.utm_medium   ?? null,
    utm_campaign: tracking.utm_campaign ?? null,
    utm_content:  tracking.utm_content  ?? null,
    utm_term:     tracking.utm_term     ?? null,
    kiwify_src:   tracking.src          ?? null,
    kiwify_sck:   tracking.sck          ?? null,
    raw_payload:  order,
  });

  if (!profile) return new Response(JSON.stringify({ ok: true }), { status: 200 });

  const userId = profile.id;

  // ---------------------------------------------------------------------------
  // order_approved / subscription_renewed — ativa ou renova plano
  // ---------------------------------------------------------------------------
  if (eventType === 'order_approved' || eventType === 'subscription_renewed') {
    // Idempotência
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('kiwify_order_id', orderId)
      .maybeSingle();

    if (existing) return new Response(JSON.stringify({ ok: true }), { status: 200 });
    if (!plan || !accessUntil) return new Response(JSON.stringify({ ok: true }), { status: 200 });

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      plan,
      started_at: new Date().toISOString(),
      expires_at: accessUntil,
      assigned_by: 'payment',
      kiwify_subscription_id: subscriptionId || null,
      payment_method: paymentMethod || null,
      subscription_status: 'active',
    });

    await supabase.from('payments').insert({
      user_id: userId,
      kiwify_order_id: orderId,
      plan,
      amount: commissions.charge_amount ? Number(commissions.charge_amount) / 100 : 0,
      status: 'CONFIRMED',
      payment_method: paymentMethod || null,
      client_ip: String(customer.ip ?? ''),
      capi_event_id: orderId,
      utm_source:   tracking.utm_source   ?? null,
      utm_medium:   tracking.utm_medium   ?? null,
      utm_campaign: tracking.utm_campaign ?? null,
      utm_content:  tracking.utm_content  ?? null,
      utm_term:     tracking.utm_term     ?? null,
      kiwify_src:   tracking.src          ?? null,
      kiwify_sck:   tracking.sck          ?? null,
    });

    // Primeira assinatura no profile
    if (!profile.first_subscribed_at) {
      await supabase.from('profiles').update({
        first_subscribed_at: new Date().toISOString(),
        first_utm_source:   tracking.utm_source   ?? null,
        first_utm_campaign: tracking.utm_campaign ?? null,
      }).eq('id', userId);
    }

    // CAPI Purchase server-side
    const phone = digitsOnly(String(customer.mobile ?? '') || String(profile.whatsapp ?? ''));
    const names = String(profile.full_name ?? '').trim().split(' ').filter(Boolean);
    const amount = commissions.charge_amount ? Number(commissions.charge_amount) / 100 : 0;

    const city  = String(profile.city  ?? '').trim().toLowerCase();
    const state = String(profile.state ?? '').trim().toLowerCase();
    const cep   = digitsOnly(String(profile.cep ?? ''));

    const [em, ph, fn, ln, extId, ct, st, zp] = await Promise.all([
      hashSHA256(email),
      phone ? hashSHA256(phone) : Promise.resolve(undefined),
      names[0] ? hashSHA256(names[0].toLowerCase()) : Promise.resolve(undefined),
      names.length > 1 ? hashSHA256(names[names.length - 1].toLowerCase()) : Promise.resolve(undefined),
      hashSHA256(userId),
      city  ? hashSHA256(city)  : Promise.resolve(undefined),
      state ? hashSHA256(state) : Promise.resolve(undefined),
      cep   ? hashSHA256(cep)   : Promise.resolve(undefined),
    ]);

    void sendCAPIEvents([{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: orderId,
      event_source_url: 'https://poplinecreators.com.br/dashboard/planos',
      action_source: 'website',
      user_data: {
        em,
        ...(ph && { ph }),
        ...(fn && { fn }),
        ...(ln && { ln }),
        external_id: extId,
        ...(ct && { ct }),
        ...(st && { st }),
        ...(zp && { zp }),
        ...(profile.meta_fbp && { fbp: profile.meta_fbp }),
        ...(profile.meta_fbc && { fbc: profile.meta_fbc }),
        ...(customer.ip && { client_ip_address: String(customer.ip) }),
      },
      custom_data: {
        currency: 'BRL',
        value: amount,
        content_name: PLANS[plan]?.name ?? plan,
        content_ids: [plan],
        content_type: 'product',
        order_id: orderId,
      },
    }]);

    // E-mail de confirmação
    void sendEmail(
      email,
      `Plano ${PLANS[plan]?.name ?? plan} ativado na POPline Creators`,
      emailPlanActivated(
        profile.full_name ?? '',
        PLANS[plan]?.name ?? plan,
        new Date(accessUntil).toLocaleDateString('pt-BR'),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // subscription_canceled — limpa renovação, mantém acesso até expires_at
  // ---------------------------------------------------------------------------
  if (eventType === 'subscription_canceled') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, expires_at')
      .eq('user_id', userId)
      .single();

    await supabase
      .from('subscriptions')
      .update({ kiwify_subscription_id: null })
      .eq('user_id', userId);

    if (sub && sub.plan !== 'free' && sub.expires_at) {
      void sendEmail(
        email,
        `Renovação do plano ${PLANS[sub.plan]?.name ?? sub.plan} cancelada`,
        emailSubscriptionCancelled(
          profile.full_name ?? '',
          PLANS[sub.plan]?.name ?? sub.plan,
          new Date(sub.expires_at).toLocaleDateString('pt-BR'),
        ),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // order_refunded / chargeback — downgrade imediato
  // ---------------------------------------------------------------------------
  if (
    eventType === 'order_refunded' ||
    eventType === 'compra_reembolsada' ||
    eventType === 'chargeback'
  ) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .single();

    const newStatus = eventType === 'chargeback' ? 'chargeback' : 'refunded';
    await supabase.from('subscriptions').upsert({
      user_id: userId,
      plan: 'free',
      expires_at: null,
      kiwify_subscription_id: null,
      payment_method: null,
      assigned_by: 'system',
      subscription_status: newStatus,
    });

    if (orderId) {
      void supabase
        .from('payments')
        .update({ status: eventType === 'chargeback' ? 'CHARGEBACK' : 'REFUNDED' })
        .eq('kiwify_order_id', orderId);
    }

    const refundAmount = commissions.charge_amount
      ? formatBRL(Number(commissions.charge_amount) / 100)
      : 'o valor pago';

    void sendEmail(
      email,
      `Reembolso de ${refundAmount} confirmado`,
      emailRefundConfirmed(
        profile.full_name ?? '',
        PLANS[sub?.plan ?? 'monthly']?.name ?? 'plano',
        refundAmount,
      ),
    );
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
