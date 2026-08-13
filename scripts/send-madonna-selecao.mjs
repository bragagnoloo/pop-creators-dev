/**
 * Disparo: "Campanha Warner Music | Madonna – Danceteria está prestes a selecionar"
 *
 * Objetivo: avisar quem está cadastrado mas ainda NÃO é assinante que a seleção
 * da campanha da Madonna está próxima, emendando com o cupom de aniversário
 * prorrogado (POPLINE20, 20% OFF até 26/07 23:59 BRT).
 *
 * Público (cadastrados SEM assinatura ativa):
 *   role='creator' E NÃO (plan<>'free' E subscription_status='active'
 *   E (expires_at IS NULL OU expires_at >= now())).
 *
 * Uso:
 *   node scripts/send-madonna-selecao.mjs                # dry-run (conta, não envia)
 *   node scripts/send-madonna-selecao.mjs --test=voce@x  # envia 1 email de teste
 *   node scripts/send-madonna-selecao.mjs --send         # envia de verdade
 *
 * Requer no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const envPath = join(process.cwd(), '.env.local');
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch {
  console.error('[email] .env.local não encontrado.');
}

const SHOULD_SEND = process.argv.includes('--send');
const TEST_ARG = process.argv.find(a => a.startsWith('--test='));
const TEST_EMAIL = TEST_ARG ? TEST_ARG.split('=')[1] : null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `Rodrigo da POPline <${process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br'}>`;
const SUBJECT = 'A Campanha Warner Music | Madonna - "Danceteria" está prestes a selecionar.';
const PREVIEW = 'A seleção está próxima. Ainda dá tempo de se candidatar.';
const CTA_URL = 'https://poplinecreators.com.br/dashboard/campanhas';
const COUPON = 'POPLINE20';
const PROMO_DEADLINE = 'domingo, 26/07, às 23:59';

function firstName(nome) {
  return (nome || '').split(' ')[0] || 'Creator';
}

function buildText(nome) {
  return `Oi, ${firstName(nome)}!

A campanha Warner Music | Madonna – "Danceteria" está entrando na reta final, e a seleção dos creators já está próxima.

- Cachê de R$ 150
- 1 entregável só
- Formato livre, do seu jeito

Uma observação importante: para se candidatar às campanhas você precisa de uma assinatura ativa. E aí vai a boa notícia — nossa oferta de aniversário foi prorrogada: são 20% de desconto com o cupom ${COUPON}, válido até ${PROMO_DEADLINE}.

Quero me candidatar: ${CTA_URL}

Qualquer dúvida, é só responder este email.

Um abraço,
Rodrigo — POPline Creators`;
}

function buildHtml(nome) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="background-color:#f4f4f6;font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f4f6;font-size:1px;line-height:1px;">${PREVIEW}</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f6;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;margin:32px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

          <!-- Accent line -->
          <tr>
            <td style="height:4px;background:linear-gradient(135deg,#c2185b,#e91e8c,#f06abc);line-height:4px;font-size:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:24px 40px 20px;border-bottom:1px solid #f0f0f0;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#e91e8c;letter-spacing:-0.3px;">POPline Creators</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 8px;font-size:12px;color:#9999aa;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Campanha aberta</p>

              <p style="margin:0 0 20px;font-size:24px;font-weight:700;color:#111118;line-height:1.3;">
                A seleção da campanha da Madonna está chegando
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">Oi, ${firstName(nome)}!</p>

              <p style="margin:0 0 20px;font-size:15px;color:#444455;line-height:1.7;">
                A campanha <strong>Warner Music | Madonna – "Danceteria"</strong> está entrando na reta final, e a seleção dos creators já está próxima.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr><td style="font-size:15px;color:#444455;line-height:1.6;padding:0 0 8px;"><span style="color:#e91e8c;font-weight:700;">✓</span>&nbsp; Cachê de <strong>R$ 150</strong></td></tr>
                <tr><td style="font-size:15px;color:#444455;line-height:1.6;padding:0 0 8px;"><span style="color:#e91e8c;font-weight:700;">✓</span>&nbsp; <strong>1 entregável</strong> só</td></tr>
                <tr><td style="font-size:15px;color:#444455;line-height:1.6;"><span style="color:#e91e8c;font-weight:700;">✓</span>&nbsp; Formato livre, do seu jeito</td></tr>
              </table>

              <!-- Highlight card (assinatura + cupom) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#fdf0f7;border:1px solid #f5c6e0;border-left:3px solid #e91e8c;border-radius:0 8px 8px 0;padding:16px 20px;">
                    <p style="margin:0;font-size:15px;color:#444455;line-height:1.7;">
                      Uma observação importante: para se candidatar às campanhas você precisa de uma assinatura ativa. E aí vai a boa notícia — <strong>nossa oferta de aniversário foi prorrogada</strong>: são <strong>20% de desconto</strong> com o cupom <strong style="color:#c2185b;">${COUPON}</strong>, válido até <strong>${PROMO_DEADLINE}</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
                <tr>
                  <td>
                    <a href="${CTA_URL}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:600;color:#ffffff;background:linear-gradient(135deg,#c2185b,#e91e8c);background-color:#e91e8c;border-radius:8px;text-decoration:none;">Quero me candidatar →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:15px;color:#444455;line-height:1.7;">
                Qualquer dúvida, é só responder este email.
              </p>

              <p style="margin:20px 0 0;font-size:14px;color:#666677;line-height:1.6;">
                Um abraço,<br/>
                Rodrigo — POPline Creators
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #f0f0f0;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 28px;">
              <p style="margin:0;font-size:12px;color:#aaaabc;line-height:1.6;">
                Você está recebendo este email porque possui uma conta na POPline Creators.
                <br/>
                © ${new Date().getFullYear()} POPline Creators · poplinecreators.com.br
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function fetchRecipients() {
  const now = Date.now();
  const PAGE = 1000;
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, full_name, role, subscriptions(plan, subscription_status, expires_at)')
      .eq('role', 'creator')
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error('Erro ao buscar destinatários:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  const byEmail = new Map();
  for (const p of rows) {
    if (!p || !p.email) continue;
    const sub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : p.subscriptions;
    const isActive = !!sub
      && sub.plan !== 'free'
      && sub.subscription_status === 'active'
      && (!sub.expires_at || new Date(sub.expires_at).getTime() >= now);
    if (isActive) continue; // pula quem já é assinante ativo
    const email = p.email.toLowerCase().trim();
    if (!/.+@.+\..+/.test(email)) continue;
    if (!byEmail.has(email)) byEmail.set(email, { email, nome: p.full_name });
  }
  return Array.from(byEmail.values());
}

async function main() {
  if (TEST_EMAIL) {
    console.log(`\n[modo] 🧪 TESTE — enviando 1 email para ${TEST_EMAIL}\n`);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: TEST_EMAIL,
      subject: SUBJECT,
      html: buildHtml('Creator Teste'),
      text: buildText('Creator Teste'),
    });
    if (error) console.error('✗ Erro:', error);
    else console.log('✅ Email de teste enviado. id:', data?.id);
    return;
  }

  console.log(`\n[modo] ${SHOULD_SEND ? '🟢 ENVIO REAL' : '🟡 DRY-RUN (use --send pra enviar)'}\n`);

  const destinatarios = await fetchRecipients();

  console.log(`📧 Destinatários (cadastrados sem assinatura ativa): ${destinatarios.length}`);
  console.log('   Amostra (até 10):');
  for (const r of destinatarios.slice(0, 10)) {
    console.log(`   · ${r.email}  (${firstName(r.nome)})`);
  }
  console.log('');

  if (!SHOULD_SEND) {
    console.log('💡 Pra enviar 1 teste:  node scripts/send-madonna-selecao.mjs --test=seu@email.com');
    console.log('💡 Pra disparar tudo:   node scripts/send-madonna-selecao.mjs --send\n');
    return;
  }

  const emails = destinatarios.map(r => ({
    from: FROM,
    to: r.email,
    subject: SUBJECT,
    html: buildHtml(r.nome),
    text: buildText(r.nome),
  }));

  const CHUNK = 100;
  let enviados = 0;
  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK);
    const { error: sendError } = await resend.batch.send(chunk);
    if (sendError) {
      console.error(`✗ Erro no chunk ${i}–${i + chunk.length}:`, sendError);
    } else {
      enviados += chunk.length;
      console.log(`✓ Enviados ${enviados}/${emails.length}`);
    }
  }

  console.log(`\n✅ Concluído — ${enviados} emails enviados.`);
}

main();
