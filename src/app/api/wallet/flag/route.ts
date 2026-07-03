import { NextResponse } from 'next/server';
import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-guard';
import { sendEmail, getUserEmailData } from '@/lib/email';
import WithdrawalFlaggedEmail from '@/emails/withdrawal-flagged';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Marca um saque como interrompido por divergência de dados. Reverte os créditos
// consumidos e dispara email de conformidade pro creator. A RPC flag_withdrawal
// checa is_admin() no servidor, então mesmo que alguém bata direto aqui sem
// permissão o Postgres nega.
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  let body: { withdrawalId?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  const withdrawalId = typeof body.withdrawalId === 'string' ? body.withdrawalId : '';
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : '';
  if (!withdrawalId) {
    return NextResponse.json({ error: 'withdrawalId obrigatório.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('flag_withdrawal', {
    p_withdrawal_id: withdrawalId,
    p_reason: reason,
  });

  if (error) {
    console.error('[flag_withdrawal] rpc error', error);
    return NextResponse.json({ error: 'Falha ao notificar saque.' }, { status: 500 });
  }

  const result = data as
    | { success: true; user_id: string; amount: number }
    | { success: false; error: string }
    | null;

  if (!result) return NextResponse.json({ error: 'Resposta inesperada.' }, { status: 500 });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

  // Envia o email inline (não via fetch para /api/email/notify). Em serverless,
  // um fetch fire-and-forget é cancelado quando a função encerra — o email
  // silenciosamente nunca sai. Aqui aguardamos antes de responder.
  const user = await getUserEmailData(result.user_id);
  if (user) {
    await sendEmail(
      user.email,
      'Precisamos revisar seu último saque',
      React.createElement(WithdrawalFlaggedEmail, {
        fullName: user.fullName,
        amount: Number(result.amount),
        reason: reason || null,
      }),
    );
  }

  return NextResponse.json({ success: true });
}
