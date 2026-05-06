import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const WEBHOOK_URL = 'https://webhook.mktarmy.com.br/webhook/cadastro-popline-creators';

export async function POST(req: NextRequest) {
  const { userId, email, whatsapp } = await req.json() as {
    userId: string;
    email: string;
    whatsapp?: string;
  };

  if (!userId || !email) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
  }

  // Salvar telefone no perfil usando service role (usuário ainda não tem sessão)
  if (whatsapp) {
    const supabase = createAdminClient();
    await supabase
      .from('profiles')
      .update({ whatsapp })
      .eq('id', userId);
  }

  // Disparar webhook (fire-and-forget, falha não bloqueia o cadastro)
  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: '',
      email,
      telefone: whatsapp ?? '',
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
