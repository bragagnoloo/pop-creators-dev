import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendCAPIEvents, sha256, digitsOnly } from '@/lib/meta-capi';

// Envia o evento PaywallShown via CAPI server-side com o mesmo eventId
// usado no pixel client (4° arg do fbq), para o Meta deduplicar e contar
// como UMA conversão com sinal enriquecido (em + ph + fn + ln + ip + UA).
//
// Endpoint público (não exige auth) para permitir tracking de usuários
// anônimos batendo no paywall. Quando userId é fornecido, enriquecemos com
// os dados do profile pra EMQ máximo.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    userId?: string | null;
    eventId?: string;
    eventSourceUrl?: string;
  };

  const { userId, eventId, eventSourceUrl } = body;
  if (!eventId) {
    return NextResponse.json({ ok: true, skipped: 'missing_event_id' });
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || undefined;
  const userAgent = req.headers.get('user-agent') ?? undefined;

  // Anonymous fallback — sem userId, só ip + UA + fbp/fbc (do cookie do Meta no header)
  if (!userId) {
    sendCAPIEvents([{
      event_name:        'PaywallShown',
      event_time:        Math.floor(Date.now() / 1000),
      event_id:          eventId,
      event_source_url:  eventSourceUrl ?? 'https://poplinecreators.com.br',
      action_source:     'website',
      user_data: {
        country: sha256('br'),
        ...(ip        && { client_ip_address: ip }),
        ...(userAgent && { client_user_agent: userAgent }),
      },
    }]).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, whatsapp, full_name, city, state, cep, meta_fbp, meta_fbc, meta_user_agent')
    .eq('id', userId)
    .single();

  if (!profile) {
    // userId inválido — manda o evento mesmo assim, só com os signals anônimos
    sendCAPIEvents([{
      event_name:        'PaywallShown',
      event_time:        Math.floor(Date.now() / 1000),
      event_id:          eventId,
      event_source_url:  eventSourceUrl ?? 'https://poplinecreators.com.br',
      action_source:     'website',
      user_data: {
        country: sha256('br'),
        ...(ip        && { client_ip_address: ip }),
        ...(userAgent && { client_user_agent: userAgent }),
      },
    }]).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  const names = (profile.full_name ?? '').trim().split(' ').filter(Boolean);
  const cepDigits = profile.cep ? digitsOnly(profile.cep) : '';
  const finalUserAgent = userAgent ?? profile.meta_user_agent ?? undefined;

  sendCAPIEvents([{
    event_name:        'PaywallShown',
    event_time:        Math.floor(Date.now() / 1000),
    event_id:          eventId,
    event_source_url:  eventSourceUrl ?? 'https://poplinecreators.com.br',
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
      external_id:       sha256(userId),
      ...(profile.meta_fbp && { fbp: profile.meta_fbp }),
      ...(profile.meta_fbc && { fbc: profile.meta_fbc }),
      ...(ip            && { client_ip_address: ip }),
      ...(finalUserAgent && { client_user_agent: finalUserAgent }),
    },
  }]).catch(() => {});

  return NextResponse.json({ ok: true });
}
