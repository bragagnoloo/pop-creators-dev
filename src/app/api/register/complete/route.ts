import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendCAPIEvents, sha256, digitsOnly } from '@/lib/meta-capi';

const WEBHOOK_URL = 'https://webhook.mktarmy.com.br/webhook/cadastro-popline-creators';

export async function POST(req: NextRequest) {
  const { userId, email, whatsapp, fullName, fbp, fbc, userAgent } = await req.json() as {
    userId?: string;
    email: string;
    whatsapp?: string;
    fullName?: string;
    fbp?: string;
    fbc?: string;
    userAgent?: string;
  };

  if (!email) {
    return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
  }

  // Salvar dados no perfil (telefone + tracking Meta) só se userId disponível
  if (userId) {
    try {
      const supabase = createAdminClient();
      const update: Record<string, string> = {};
      if (whatsapp) update.whatsapp = whatsapp;
      if (fullName) update.full_name = fullName.trim();
      if (fbp) update.meta_fbp = fbp;
      if (fbc) update.meta_fbc = fbc;
      if (userAgent) update.meta_user_agent = userAgent;
      if (Object.keys(update).length > 0) {
        await supabase.from('profiles').update(update).eq('id', userId);
      }
    } catch {
      // Falha no profile não bloqueia o webhook
    }
  }

  // CAPI CompleteRegistration server-side — fire-and-forget
  if (userId) {
    const names = (fullName ?? '').trim().split(' ').filter(Boolean);
    const phoneDigits = whatsapp ? digitsOnly(whatsapp) : '';
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || undefined;

    sendCAPIEvents([{
      event_name:        'CompleteRegistration',
      event_time:        Math.floor(Date.now() / 1000),
      event_id:          userId,
      event_source_url:  'https://poplinecreators.com.br/register',
      action_source:     'website',
      user_data: {
        em:                sha256(email),
        ...(phoneDigits && { ph: sha256(phoneDigits) }),
        ...(names[0]     && { fn: sha256(names[0].toLowerCase()) }),
        ...(names.length > 1 && { ln: sha256(names[names.length - 1].toLowerCase()) }),
        country:           sha256('br'),
        external_id:       sha256(userId),
        ...(fbp && { fbp }),
        ...(fbc && { fbc }),
        ...(ip  && { client_ip_address: ip }),
        ...(userAgent && { client_user_agent: userAgent }),
      },
    }]).catch(() => {});
  }

  // Disparar webhook Mktarmy — await garante execução antes da função serverless encerrar
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: fullName ?? '',
        email,
        telefone: whatsapp ?? '',
      }),
    });
  } catch {
    // Falha no webhook não bloqueia o cadastro
  }

  return NextResponse.json({ ok: true });
}
