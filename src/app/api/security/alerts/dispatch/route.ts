import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Chamada pelo banco (pg_net no insert de security_alerts + pg_cron a cada 5 min).
// Não precisa de segredo: a rota só envia alertas já gravados no banco, sempre
// para o mesmo destinatário fixo, e cada alerta é reivindicado uma única vez
// (claim_security_alerts). Chamar à toa no máximo antecipa um envio pendente.

const ALERT_TO = process.env.SECURITY_ALERT_EMAIL ?? 'poplinecreators@gmail.com';
const FROM = process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br';

const resend = new Resend(process.env.RESEND_API_KEY);

type AlertRow = {
  id: string;
  created_at: string;
  kind: string;
  severity: 'critical' | 'warning';
  title: string;
  details: Record<string, unknown>;
  occurrences: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAlert(alert: AlertRow): string {
  const when = new Date(alert.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const badgeColor = alert.severity === 'critical' ? '#dc2626' : '#d97706';
  const badgeLabel = alert.severity === 'critical' ? 'CRÍTICO' : 'ATENÇÃO';

  const rows = Object.entries(alert.details ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([key, raw]) => {
      const value = String(raw);
      const cell = key === 'Link'
        ? `<a href="${escapeHtml(value)}">${escapeHtml(value)}</a>`
        : escapeHtml(value).replace(/\n/g, '<br>');
      return `<tr><td style="padding:6px 12px 6px 0;color:#555;vertical-align:top;white-space:nowrap">${escapeHtml(key)}</td><td style="padding:6px 0;color:#111">${cell}</td></tr>`;
    })
    .join('');

  const repeated = alert.occurrences > 1
    ? `<p style="color:#555">Esta ação se repetiu <strong>${alert.occurrences}x</strong> até o envio deste email.</p>`
    : '';

  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111">
<p><span style="background:${badgeColor};color:#fff;padding:3px 8px;border-radius:4px;font-weight:bold">${badgeLabel}</span></p>
<h2 style="margin:12px 0">${escapeHtml(alert.title)}</h2>
<p style="color:#555">${escapeHtml(when)} (horário de Brasília)</p>
<table style="border-collapse:collapse">${rows}</table>
${repeated}
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">
<p style="color:#888;font-size:12px">Alerta automático de segurança da POPline Creators (tabela security_alerts, id ${escapeHtml(alert.id)}).
Alertas só avisam — nenhuma ação foi bloqueada por este email.</p>
</body></html>`;
}

export async function POST() {
  const rl = await checkRateLimit('security-alerts-dispatch', 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('claim_security_alerts', { p_limit: 20 });
  if (error) {
    console.error('[security-alerts] claim error', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const alerts = (data ?? []) as AlertRow[];
  let sent = 0;

  for (const alert of alerts) {
    const prefix = alert.severity === 'critical' ? '[CRÍTICO]' : '[ATENÇÃO]';
    const { error: sendError } = await resend.emails.send({
      from: `POPline Segurança <${FROM}>`,
      to: ALERT_TO,
      subject: `${prefix} ${alert.title}`.slice(0, 250),
      html: renderAlert(alert),
    });

    if (sendError) {
      console.error('[security-alerts] send error', alert.id, sendError);
      await supabase
        .from('security_alerts')
        .update({ last_error: sendError.message ?? String(sendError) })
        .eq('id', alert.id);
      continue;
    }

    await supabase
      .from('security_alerts')
      .update({ sent_at: new Date().toISOString(), last_error: null })
      .eq('id', alert.id);
    sent++;
  }

  return NextResponse.json({ ok: true, claimed: alerts.length, sent });
}
