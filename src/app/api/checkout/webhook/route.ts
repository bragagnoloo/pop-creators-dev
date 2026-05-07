import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { KIWIFY_PLAN_MAP, KIWIFY_FREQUENCY_MAP, PLANS } from '@/services/subscriptions';
import type { PlanId } from '@/types';

type KiwifyPayload = {
  webhook_event_type: string;
  order_id: string;
  amount?: number;
  payment_method?: string;
  subscription?: {
    id?: string;
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
  tracking?: {
    src?: string;
    sck?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
};

function resolvePlan(payload: KiwifyPayload): PlanId | null {
  const planId   = payload.subscription?.plan?.id;
  const freq     = payload.subscription?.plan?.frequency;

  if (planId && KIWIFY_PLAN_MAP[planId]) return KIWIFY_PLAN_MAP[planId];
  if (freq   && KIWIFY_FREQUENCY_MAP[freq]) return KIWIFY_FREQUENCY_MAP[freq];
  return null;
}

function expiresAt(plan: PlanId): string {
  const months = PLANS[plan].durationMonths;
  return new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  // Token validation
  const token = req.nextUrl.searchParams.get('token');
  if (!token || token !== process.env.KIWIFY_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: KiwifyPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { webhook_event_type, order_id } = payload;
  const email = payload.Customer?.email?.toLowerCase().trim();

  const supabase = createAdminClient();

  // Log raw event regardless of outcome
  await supabase.from('subscription_events').insert({
    event_type:             webhook_event_type,
    kiwify_order_id:        order_id,
    kiwify_subscription_id: payload.subscription?.id ?? null,
    plan:                   resolvePlan(payload),
    amount:                 payload.amount ? payload.amount / 100 : null,
    payment_method:         payload.payment_method ?? null,
    utm_source:             payload.tracking?.utm_source ?? null,
    utm_medium:             payload.tracking?.utm_medium ?? null,
    utm_campaign:           payload.tracking?.utm_campaign ?? null,
    utm_content:            payload.tracking?.utm_content ?? null,
    utm_term:               payload.tracking?.utm_term ?? null,
    kiwify_src:             payload.tracking?.src ?? null,
    kiwify_sck:             payload.tracking?.sck ?? null,
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

  // Update subscription_events with user_id if found
  if (userId) {
    await supabase
      .from('subscription_events')
      .update({ user_id: userId })
      .eq('kiwify_order_id', order_id);
  }

  if (webhook_event_type === 'order_approved' || webhook_event_type === 'subscription_renewed') {
    const plan = resolvePlan(payload);
    if (!plan) {
      console.error('[webhook/kiwify] unresolvable plan', payload.subscription?.plan);
      return NextResponse.json({ ok: true, skipped: 'unresolved_plan' });
    }

    // Idempotency — skip if this exact order was already processed
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

    // Activate subscription atomically
    await supabase.from('subscriptions').upsert({
      user_id:                userId,
      plan,
      started_at:             new Date().toISOString(),
      expires_at:             exp,
      assigned_by:            'payment',
      subscription_status:    'active',
      kiwify_subscription_id: payload.subscription?.id ?? null,
      payment_method:         payload.payment_method ?? null,
    });

    // Record payment
    await supabase.from('payments').insert({
      user_id:        userId,
      kiwify_order_id: order_id,
      plan,
      amount:         payload.amount ? payload.amount / 100 : 0,
      status:         'CONFIRMED',
      payment_method: payload.payment_method ?? null,
      client_ip:      payload.Customer?.ip ?? null,
      utm_source:     payload.tracking?.utm_source ?? null,
      utm_medium:     payload.tracking?.utm_medium ?? null,
      utm_campaign:   payload.tracking?.utm_campaign ?? null,
      utm_content:    payload.tracking?.utm_content ?? null,
      utm_term:       payload.tracking?.utm_term ?? null,
      kiwify_src:     payload.tracking?.src ?? null,
      kiwify_sck:     payload.tracking?.sck ?? null,
    });

    // first_subscribed_at — only set once
    await supabase
      .from('profiles')
      .update({
        kiwify_subscription_id: payload.subscription?.id ?? null,
        first_subscribed_at:    new Date().toISOString(),
        first_utm_source:       payload.tracking?.utm_source ?? null,
        first_utm_campaign:     payload.tracking?.utm_campaign ?? null,
      })
      .eq('id', userId)
      .is('first_subscribed_at', null);

    // Send welcome email (fire-and-forget)
    const baseUrl = 'https://poplinecreators.com.br';
    fetch(`${baseUrl}/api/email/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'plan-subscribed', data: { userId, planName: PLANS[plan].name, expiresAt: exp } }),
    }).catch(() => {});
  }

  if (webhook_event_type === 'order_refunded' || webhook_event_type === 'chargeback') {
    if (!userId) return NextResponse.json({ ok: true, skipped: 'user_not_found' });

    const newStatus = webhook_event_type === 'chargeback' ? 'chargeback' : 'refunded';

    await supabase.from('subscriptions').update({
      plan:                'free',
      expires_at:          null,
      subscription_status: newStatus,
      kiwify_subscription_id: null,
    }).eq('user_id', userId);
  }

  if (webhook_event_type === 'subscription_cancelled') {
    if (!userId) return NextResponse.json({ ok: true, skipped: 'user_not_found' });

    // Keep access until expiry — just remove kiwify_subscription_id so UI shows "cancelando"
    await supabase.from('subscriptions').update({
      kiwify_subscription_id: null,
    }).eq('user_id', userId);
  }

  return NextResponse.json({ ok: true });
}
