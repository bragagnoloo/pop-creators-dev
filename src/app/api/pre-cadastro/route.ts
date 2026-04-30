import { NextResponse } from 'next/server';
import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import PreVendaLeadEmail from '@/emails/pre-venda-lead';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEBHOOK_URL = 'https://webhook.mktarmy.com.br/webhook/pre-cadastro';

export async function POST(request: Request) {
  let body: { nome?: string; email?: string; whatsapp?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const nome = body.nome?.trim();
  const email = body.email?.trim();
  const whatsapp = body.whatsapp?.trim();

  if (!nome || !email || !whatsapp) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }

  const data_cadastro = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Persiste o lead no Supabase — garante que nenhum dado se perde
  const supabase = createAdminClient();
  const { error: dbError } = await supabase
    .from('pre_cadastros')
    .insert({ nome, email, whatsapp });

  if (dbError) {
    console.error('[pre-cadastro] db error', dbError.message);
    return NextResponse.json({ error: 'Erro ao salvar cadastro' }, { status: 500 });
  }

  // Email de confirmação — fire-and-forget (Resend, mesma região)
  sendEmail(
    email,
    'Sua vaga na POPline Creators está reservada!',
    React.createElement(PreVendaLeadEmail, { nome }),
  ).catch(() => {});

  // Webhook aguardado — request externo precisa completar antes do handler retornar
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, whatsapp, data_cadastro }),
    });
    if (!res.ok) console.error('[pre-cadastro] webhook status', res.status);
  } catch (err) {
    console.error('[pre-cadastro] webhook error', err);
  }

  return NextResponse.json({ ok: true });
}
