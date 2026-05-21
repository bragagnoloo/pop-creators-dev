import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { sendCAPIEvents, sha256, digitsOnly } from '@/lib/meta-capi';
import { PLANS } from '@/services/subscriptions';
import type { PlanId } from '@/types';

// Envia o evento InitiateCheckout via CAPI server-side com o mesmo eventId
// usado no pixel client (4° arg do fbq), para o Meta deduplicar e contar
// como UMA conversão com sinal enriquecido (em + ph + fn + ln + ip + UA).

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  const { plan, eventId } = await req.json().catch(() => ({})) as {
    plan?: PlanId;
    eventId?: string;
  };

  if (!plan || !eventId || !PLANS[plan]) {
    return NextResponse.json({ ok: true, skipped: 'invalid_params' });
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, whatsapp, full_name, city, state, cep, meta_fbp, meta_fbc, meta_user_agent')
    .eq('id', guard.userId)
    .single();

  if (!profile) return NextResponse.json({ ok: true, skipped: 'no_profile' });

  const names = (profile.full_name ?? '').trim().split(' ').filter(Boolean);
  const cepDigits = profile.cep ? digitsOnly(profile.cep) : '';
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || undefined;
  const userAgent = req.headers.get('user-agent') ?? profile.meta_user_agent ?? undefined;

  sendCAPIEvents([{
    event_name:        'InitiateCheckout',
    event_time:        Math.floor(Date.now() / 1000),
    event_id:          eventId,
    event_source_url:  'https://poplinecreators.com.br/dashboard/planos',
    action_source:     'website',
    user_data: {
      em:                sha256(profile.email),
      ...(profile.whatsapp && { ph: sha256(digitsOnly(profile.whatsapp)) }),
      ...(names[0]      && { fn: sha256(names[0].toLowerCase()) }),
      ...(names.length > 1 && { ln: sha256(names[names.length - 1].toLowerCase()) }),
      ...(profile.city  && { ct: sha256(profile.city) }),
      ...(profile.state && { st: sha256(profile.state) }),
      ...(cepDigits     && { zp: sha256(cepDigits) }),
      country:           sha256('br'),
      external_id:       sha256(guard.userId),
      ...(profile.meta_fbp && { fbp: profile.meta_fbp }),
      ...(profile.meta_fbc && { fbc: profile.meta_fbc }),
      ...(ip        && { client_ip_address: ip }),
      ...(userAgent && { client_user_agent: userAgent }),
    },
    custom_data: {
      currency:      'BRL',
      value:         PLANS[plan].priceTotal,
      content_name:  PLANS[plan].name,
      content_ids:   [plan],
      content_type:  'product',
    },
  }]).catch(() => {});

  return NextResponse.json({ ok: true });
}
