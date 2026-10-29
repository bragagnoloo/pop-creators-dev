import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { createAdminClient } from '@/lib/supabase/server';
import { alertStuckSale } from '@/lib/purchase-access';
import AffiliateInviteEmail from '@/emails/affiliate-invite';

// =============================================================================
// Convite do Programa de Afiliados: todo creator que ultrapassa 500 pontos no
// ranking geral recebe o convite (com o PDF de regras) uma única vez.
// affiliate_invites registra quem já recebeu, inclusive os 67 do disparo
// inicial de 29/10/2026.
//
// ?dry=1 lista quem receberia, sem enviar nem gravar nada.
// =============================================================================

const MIN_POINTS = 500;
// Trava de segurança: um salto de dezenas de convites num dia indica mudança na
// pontuação, não creators de verdade. Nada é enviado e a equipe é avisada.
const MAX_PER_RUN = 30;

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Rodrigo da POPline <${process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br'}>`;
const REPLY_TO = process.env.SUPORTE_EMAIL ?? 'poplinecreators@gmail.com';
const SUBJECT = 'Você chegou aos 500 pontos: convite para o Programa de Afiliados';
// Anexo pela URL pública: arquivos de public/ não entram no pacote da função.
const PDF_URL = 'https://poplinecreators.com.br/programa-de-afiliados-popline-creators.pdf';

type RankRow = { user_id: string; full_name: string; total_points: number };

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1';
  const admin = createAdminClient();

  const { data: ranking, error } = await admin.rpc('get_alltime_ranking', { p_limit: 5000 });
  if (error) {
    console.error('[cron/affiliate-invites] erro no ranking', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const eligible = (ranking as RankRow[]).filter(r => Number(r.total_points) >= MIN_POINTS);
  if (eligible.length === 0) return NextResponse.json({ ok: true, dry, sent: 0 });

  const { data: invited } = await admin
    .from('affiliate_invites')
    .select('user_id')
    .in('user_id', eligible.map(r => r.user_id));
  const done = new Set((invited ?? []).map(r => r.user_id));
  const pending = eligible.filter(r => !done.has(r.user_id));

  if (pending.length > MAX_PER_RUN) {
    alertStuckSale({
      motivo:   `Convites de afiliado travados: ${pending.length} creators novos acima de ${MIN_POINTS} pontos num só dia (limite ${MAX_PER_RUN}). Conferir a pontuação antes de liberar.`,
      exemplos: pending.slice(0, 10).map(r => r.full_name).join(', '),
    });
    return NextResponse.json({ ok: false, blocked: pending.length });
  }

  if (dry) {
    return NextResponse.json({ ok: true, dry, pending: pending.map(r => ({ nome: r.full_name, pontos: Number(r.total_points) })) });
  }

  const { data: profiles } = await admin.from('profiles').select('id, email').in('id', pending.map(r => r.user_id));
  const emailOf = new Map((profiles ?? []).map(p => [p.id as string, p.email as string]));
  const html = await render(AffiliateInviteEmail());

  const results: Record<string, string>[] = [];
  for (const r of pending) {
    const to = emailOf.get(r.user_id);
    if (!to) continue;

    // Reserva antes de enviar: se outra execução correr junto, o insert falha
    // (user_id é a chave) e o convite não sai duas vezes.
    const { error: claimError } = await admin.from('affiliate_invites').insert({
      user_id: r.user_id, points_at_send: Number(r.total_points),
    });
    if (claimError) continue;

    const { data, error: sendError } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject: SUBJECT,
      html,
      attachments: [{ filename: 'Programa-de-Afiliados-POPline-Creators.pdf', path: PDF_URL }],
    });

    if (sendError || !data?.id) {
      // Libera a reserva para tentar de novo amanhã.
      await admin.from('affiliate_invites').delete().eq('user_id', r.user_id);
      console.error('[cron/affiliate-invites] convite não enviado', r.user_id, sendError);
      results.push({ nome: r.full_name, resultado: `falhou: ${sendError?.message ?? 'sem id'}` });
    } else {
      await admin.from('affiliate_invites').update({ resend_email_id: data.id }).eq('user_id', r.user_id);
      results.push({ nome: r.full_name, resultado: 'convidado' });
    }
    await new Promise(res => setTimeout(res, 600)); // limite de envio do Resend
  }

  return NextResponse.json({ ok: true, dry, results });
}
