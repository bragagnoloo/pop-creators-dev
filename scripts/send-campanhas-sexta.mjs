/**
 * Disparo: "3 campanhas novas (Madonna / Planeta Brasil / San Island)"
 *
 * Objetivo: avisar quem está cadastrado mas ainda NÃO é assinante sobre as 3
 * campanhas abertas na sexta 17/07. Tom editorial/pessoal (nota do Rodrigo),
 * sem banner e sem linguagem de oferta — pra reduzir a chance de cair na aba
 * "Promoções" do Gmail. Mesmo layout-base dos emails transacionais.
 *
 * Público (cadastrados SEM assinatura ativa):
 *   role='creator' E NÃO (plan<>'free' E subscription_status='active'
 *   E (expires_at IS NULL OU expires_at >= now())).
 *
 * Uso:
 *   node scripts/send-campanhas-sexta.mjs                # dry-run (conta, não envia)
 *   node scripts/send-campanhas-sexta.mjs --test=voce@x  # envia 1 email de teste
 *   node scripts/send-campanhas-sexta.mjs --send         # envia de verdade
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

// Remetente pessoal (melhor pra caixa principal do que remetente de marca).
const FROM = `Rodrigo da POPline <${process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br'}>`;
const PREVIEW = 'Madonna, Festival Planeta Brasil e San Island Weekend — os briefings já estão no ar.';
const CTA_URL = 'https://poplinecreators.com.br/dashboard/campanhas';

function firstName(nome) {
  return (nome || '').split(' ')[0] || 'Creator';
}

function buildSubject(nome) {
  return `Abriram 3 campanhas novas essa semana, ${firstName(nome)}`;
}

function buildText(nome) {
  return `Oi, ${firstName(nome)}!

Na sexta a gente abriu 3 campanhas novas aqui no POPline Creators e eu queria te avisar pessoalmente, porque todas combinam demais com quem cria conteúdo sobre música e cultura pop.

Um resumo do que está no ar:

1. Warner Music | Madonna – "Danceteria" — cachê de R$ 150
Uma ação em torno do novo momento da Madonna, em parceria com a Warner Music.

2. Festival Planeta Brasil 2026 — cachê de R$ 100
Divulgação de um dos maiores festivais do país.

3. San Island Weekend — cachê de R$ 100
Divulgação de um dos fins de semana mais aguardados da temporada.

Os briefings completos (o que produzir, prazos e como participar) estão dentro da plataforma. Vale entrar e dar uma olhada enquanto as vagas estão abertas.

Ver as campanhas: ${CTA_URL}

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
              <p style="margin:0 0 8px;font-size:12px;color:#9999aa;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Novas campanhas</p>

              <p style="margin:0 0 24px;font-size:24px;font-weight:700;color:#111118;line-height:1.3;">
                Abriram 3 campanhas novas essa semana
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">Oi, ${firstName(nome)}!</p>

              <p style="margin:0 0 20px;font-size:15px;color:#444455;line-height:1.7;">
                Na sexta a gente abriu 3 campanhas novas aqui no POPline Creators e eu queria te avisar pessoalmente, porque todas combinam demais com quem cria conteúdo sobre música e cultura pop.
              </p>

              <p style="margin:0 0 14px;font-size:15px;color:#444455;line-height:1.7;">Um resumo do que está no ar:</p>

              <p style="margin:0 0 4px;font-size:15px;color:#111118;line-height:1.6;">
                <strong>1. Warner Music | Madonna – "Danceteria"</strong> — cachê de R$ 150
              </p>
              <p style="margin:0 0 18px;font-size:15px;color:#444455;line-height:1.6;">
                Uma ação em torno do novo momento da Madonna, em parceria com a Warner Music.
              </p>

              <p style="margin:0 0 4px;font-size:15px;color:#111118;line-height:1.6;">
                <strong>2. Festival Planeta Brasil 2026</strong> — cachê de R$ 100
              </p>
              <p style="margin:0 0 18px;font-size:15px;color:#444455;line-height:1.6;">
                Divulgação de um dos maiores festivais do país.
              </p>

              <p style="margin:0 0 4px;font-size:15px;color:#111118;line-height:1.6;">
                <strong>3. San Island Weekend</strong> — cachê de R$ 100
              </p>
              <p style="margin:0 0 22px;font-size:15px;color:#444455;line-height:1.6;">
                Divulgação de um dos fins de semana mais aguardados da temporada.
              </p>

              <p style="margin:0 0 24px;font-size:15px;color:#444455;line-height:1.7;">
                Os briefings completos (o que produzir, prazos e como participar) estão dentro da plataforma. Vale entrar e dar uma olhada enquanto as vagas estão abertas.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
                <tr>
                  <td>
                    <a href="${CTA_URL}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;background:linear-gradient(135deg,#c2185b,#e91e8c);background-color:#e91e8c;border-radius:8px;text-decoration:none;">Ver as campanhas →</a>
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
      subject: buildSubject('Creator Teste'),
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
    console.log('💡 Pra enviar 1 teste:  node scripts/send-campanhas-sexta.mjs --test=seu@email.com');
    console.log('💡 Pra disparar tudo:   node scripts/send-campanhas-sexta.mjs --send\n');
    return;
  }

  const emails = destinatarios.map(r => ({
    from: FROM,
    to: r.email,
    subject: buildSubject(r.nome),
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
