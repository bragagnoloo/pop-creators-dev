import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const WEBHOOK_URL = 'https://webhook.mktarmy.com.br/webhook/cadastro-popline-creators';

export async function POST(req: NextRequest) {
  const { userId, email, whatsapp } = await req.json() as {
    userId?: string;
    email: string;
    whatsapp?: string;
  };

  if (!email) {
    return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
  }

  // Salvar telefone no perfil (só se userId disponível)
  if (userId && whatsapp) {
    try {
      const supabase = createAdminClient();
      await supabase
        .from('profiles')
        .update({ whatsapp })
        .eq('id', userId);
    } catch {
      // Falha no profile não bloqueia o webhook
    }
  }

  // Disparar webhook — await garante execução antes da função serverless encerrar
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: '',
        email,
        telefone: whatsapp ?? '',
      }),
    });
  } catch {
    // Falha no webhook não bloqueia o cadastro
  }

  return NextResponse.json({ ok: true });
}
