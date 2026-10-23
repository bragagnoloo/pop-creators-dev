import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { createAdminClient } from '@/lib/supabase/server';
import { REC_GRACE_MS } from '@/lib/rec-annual';
import RecPaymentOverdueEmail from '@/emails/rec-payment-overdue';

// =============================================================================
// REC_Plano Anual: parcela vencida sem pagamento.
//
// Uma vez por dia procura assinantes do REC cuja parcela venceu e não foi paga
// (a Hotmart não confirmou a cobrança). Cada um recebe UM aviso por parcela,
// com 3 dias para regularizar; o acesso passa a vencer no fim desse prazo e,
// sem pagamento, a conta volta ao free sozinha. Se a Hotmart confirmar a
// parcela, o webhook estende o acesso e zera o aviso.
//
// ?dry=1 lista quem receberia o aviso, sem enviar nem alterar nada.
// =============================================================================

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br';
const REPLY_TO = process.env.SUPORTE_EMAIL ?? 'poplinecreators@gmail.com';

// A confirmação da cobrança pode chegar com atraso: só avisa depois disso.
const CONFIRMATION_DELAY_MS = 6 * 60 * 60 * 1000;

const fmt = (d: Date | string) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

type Billing = { user_id: string; subscriber_code: string | null; next_charge_at: string; warned_charge_at: string | null };

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1';

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('rec_annual_billing')
    .select('user_id, subscriber_code, next_charge_at, warned_charge_at')
    .lt('next_charge_at', new Date(Date.now() - CONFIRMATION_DELAY_MS).toISOString());
  if (error) {
    console.error('[cron/rec-overdue] erro ao buscar parcelas', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const results: Record<string, string>[] = [];

  for (const row of (rows ?? []) as Billing[]) {
    // Um aviso por parcela.
    if (row.warned_charge_at && new Date(row.warned_charge_at).getTime() === new Date(row.next_charge_at).getTime()) continue;

    const { data: sub } = await admin
      .from('subscriptions')
      .select('plan, expires_at, kiwify_subscription_id')
      .eq('user_id', row.user_id)
      .maybeSingle();

    // Já está free, cancelou a renovação (o acesso vence sozinho no fim do
    // período pago) ou trocou de assinatura: não é inadimplência do REC.
    if (!sub || sub.plan === 'free') continue;
    if (!sub.kiwify_subscription_id) continue;
    if (row.subscriber_code && sub.kiwify_subscription_id !== row.subscriber_code) continue;
    if (sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now()) continue;

    const { data: profile } = await admin.from('profiles').select('email, full_name').eq('id', row.user_id).maybeSingle();
    if (!profile?.email) continue;

    const deadline = new Date(Date.now() + REC_GRACE_MS);
    const entry = { usuario: row.user_id, parcela: fmt(row.next_charge_at), prazo: fmt(deadline) };

    if (dry) {
      results.push({ ...entry, resultado: 'avisaria' });
      continue;
    }

    const html = await render(RecPaymentOverdueEmail({
      fullName:   profile.full_name ?? '',
      chargeDate: fmt(row.next_charge_at),
      deadline:   fmt(deadline),
    }));
    const { data: sent, error: sendError } = await resend.emails.send({
      from:    `POPline Creators <${FROM}>`,
      to:      profile.email,
      replyTo: REPLY_TO,
      subject: `Regularize a parcela do seu Plano Anual até ${fmt(deadline)}`,
      html,
    });
    if (sendError || !sent?.id) {
      // Sem aviso entregue, o prazo não começa: tenta de novo amanhã.
      console.error('[cron/rec-overdue] aviso não enviado', row.user_id, sendError);
      results.push({ ...entry, resultado: `falhou: ${sendError?.message ?? 'sem id'}` });
      continue;
    }

    await admin.from('subscriptions').update({ expires_at: deadline.toISOString() }).eq('user_id', row.user_id);
    await admin.from('rec_annual_billing').update({
      warned_charge_at: row.next_charge_at,
      warned_at:        new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    }).eq('user_id', row.user_id);
    results.push({ ...entry, resultado: 'avisado' });
  }

  return NextResponse.json({ ok: true, dry, results });
}
