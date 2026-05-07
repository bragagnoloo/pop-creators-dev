import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { KIWIFY_PLAN_MAP, PLANS } from '@/services/subscriptions';
import type { PlanId } from '@/types';

type KiwifyPayload = {
  webhook_event_type: string;
  order_id: string;
  subscription_id?: string;
  checkout_link?: string;
  payment_method?: string;
  Subscription?: {
    plan?: {
      id?: string;
      frequency?: string;
    };
  };
  Customer?: {
    email?: string;
    full_name?: string;
    mobile?: string;
    ip?: string;
  };
  TrackingParameters?: {
    src?: string;
    sck?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
  Commissions?: {
    charge_amount?: number;
    product_base_price?: number;
  };
};

const FREQUENCY_MAP: Record<string, PlanId> = {
  monthly:      'monthly',
  semiannually: 'semester',
  semiannual:   'semester',
  annually:     'yearly',
  annual:       'yearly',
};

function resolvePlan(payload: KiwifyPayload): PlanId | null {
  // checkout_link bate com KIWIFY_PLAN_ID_* (ex: "G2MKaHm")
  if (payload.checkout_link && KIWIFY_PLAN_MAP[payload.checkout_link]) {
    return KIWIFY_PLAN_MAP[payload.checkout_link];
  }
  const freq = payload.Subscription?.plan?.frequency;
  if (freq && FREQUENCY_MAP[freq]) return FREQUENCY_MAP[freq];
  return null;
}

function expiresAt(plan: PlanId): string {
  const months = PLANS[plan].durationMonths;
  return new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  let payload: KiwifyPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { webhook_event_type, order_id } = payload;
  const email = payload.Customer?.email?.toLowerCase().trim();
  const tracking = payload.TrackingParameters;

  const supabase = createAdminClient();

  // Log raw event regardless of outcome
  await supabase.from('subscription_events').insert({
    event_type:             webhook_event_type,
    kiwify_order_id:        order_id,
    kiwify_subscription_id: payload.subscription_id ?? null,
    plan:                   resolvePlan(payload),
    amount:                 payload.Commissions?.charge_amount
                              ? payload.Commissions.charge_amount / 100
                              : null,
    payment_method:         payload.payment_method ?? null,
    utm_source:             tracking?.utm_source ?? null,
    utm_medium:             tracking?.utm_medium ?? null,
    utm_campaign:           tracking?.utm_campaign ?? null,
    utm_content:            tracking?.utm_content ?? null,
    utm_term:               tracking?.utm_term ?? null,
    kiwify_src:             tracking?.src ?? null,
    kiwify_sck:             tracking?.sck ?? null,
    raw_payload:            payload as unknown as Record<string, unknown>,
  });

  if (!email) {
    return NextResponse.json({ ok: true, skipped: 'no_email' });
  }

  // Find user by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  const userId = profile?.id ?? null;

  if (userId) {
    await supabase
      .from('subscription_events')
      .update({ user_id: userId })
      .eq('kiwify_order_id', order_id);
  }

  if (webhook_event_type === 'order_approved' || webhook_event_type === 'subscription_renewed') {
    const plan = resolvePlan(payload);
    if (!plan) {
      console.error('[webhook/kiwify] unresolvable plan', payload.checkout_link, payload.Subscription?.plan);
      return NextResponse.json({ ok: true, skipped: 'unresolved_plan' });
    }

    // Idempotency
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('kiwify_order_id', order_id)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, skipped: 'duplicate' });
    }

    if (!userId) {
      console.warn('[webhook/kiwify] user not found for email', email);
      return NextResponse.json({ ok: true, skipped: 'user_not_found' });
    }

    const exp = expiresAt(plan);
    const amount = payload.Commissions?.charge_amount
      ? payload.Commissions.charge_amount / 100
      : 0;

    await supabase.from('subscriptions').upsert({
      user_id:                userId,
      plan,
      started_at:             new Date().toISOString(),
      expires_at:             exp,
      assigned_by:            'payment',
      subscription_status:    'active',
      kiwify_subscription_id: payload.subscription_id ?? null,
      payment_method:         payload.payment_method ?? null,
    });

    await supabase.from('payments').insert({
      user_id:         userId,
      kiwify_order_id: order_id,
      plan,
      amount,
      status:          'CONFIRMED',
      payment_method:  payload.payment_method ?? null,
      client_ip:       payload.Customer?.ip ?? null,
      utm_source:      tracking?.utm_source ?? null,
      utm_medium:      tracking?.utm_medium ?? null,
      utm_campaign:    tracking?.utm_campaign ?? null,
      utm_content:     tracking?.utm_content ?? null,
      utm_term:        tracking?.utm_term ?? null,
      kiwify_src:      tracking?.src ?? null,
      kiwify_sck:      tracking?.sck ?? null,
    });

    await supabase
      .from('profiles')
      .update({
        kiwify_subscription_id: payload.subscription_id ?? null,
        first_subscribed_at:    new Date().toISOString(),
        first_utm_source:       tracking?.utm_source ?? null,
        first_utm_campaign:     tracking?.utm_campaign ?? null,
      })
      .eq('id', userId)
      .is('first_subscribed_at', null);

    fetch('https://poplinecreators.com.br/api/email/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'plan-subscribed', data: { userId, planName: PLANS[plan].name, expiresAt: exp } }),
    }).catch(() => {});
  }

  if (webhook_event_type === 'order_refunded' || webhook_event_type === 'chargeback') {
    if (!userId) return NextResponse.json({ ok: true, skipped: 'user_not_found' });

    await supabase.from('subscriptions').update({
      plan:                   'free',
      expires_at:             null,
      subscription_status:    webhook_event_type === 'chargeback' ? 'chargeback' : 'refunded',
      kiwify_subscription_id: null,
    }).eq('user_id', userId);
  }

  if (webhook_event_type === 'subscription_cancelled') {
    if (!userId) return NextResponse.json({ ok: true, skipped: 'user_not_found' });

    await supabase.from('subscriptions').update({
      kiwify_subscription_id: null,
    }).eq('user_id', userId);
  }

  return NextResponse.json({ ok: true });
}
