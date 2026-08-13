/**
 * Disparo: "Campanhas da Universal Music vão selecionar em breve"
 *
 * Público: TODA A BASE (assinantes e não assinantes). NÃO filtra por assinatura.
 * Aviso de prazo/seleção (sem desconto/banner) — otimizado p/ caixa principal:
 * remetente pessoal (Rodrigo), sem imagem grande, texto direto, 1 CTA.
 *
 * Uso:
 *   node scripts/send-universal-selecao.mjs                # dry-run
 *   node scripts/send-universal-selecao.mjs --test=voce@x  # 1 email de teste
 *   node scripts/send-universal-selecao.mjs --send         # envia de verdade
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

const FROM = `POPline Creators <${process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br'}>`;
const SUBJECT = '5 Campanhas no POPline Creators vão selecionar em breve!';
const PREVIEW = 'As campanhas da Universal Music vão selecionar entre hoje e os próximos dias. Corre pra se candidatar.';
const CTA_URL = 'https://poplinecreators.com.br/dashboard/campanhas';

function firstName(nome) {
  return (nome || '').split(' ')[0] || 'Creator';
}

function buildText(nome) {
  return `Oi, ${firstName(nome)}!

Um aviso rápido e importante: as campanhas da Universal Music aqui no POPline Creators estão fechando a seleção. Os creators vão ser escolhidos entre hoje e os próximos dias, então quem quiser participar precisa se candidatar agora.

Tem ação com nomes como Jota Quest, Matheus & Kauan, Felipe Araújo, Léo Foguete e mais.

Se você já tem uma ideia de conteúdo na cabeça, não deixa pra depois. Quando a seleção rodar, as vagas fecham.

Ver as campanhas e me candidatar: ${CTA_URL}

Qualquer dúvida, é só responder este email.

Um abraço,
Rodrigo
POPline Creators`;
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
              <p style="margin:0 0 8px;font-size:12px;color:#9999aa;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Campanhas abertas</p>

              <p style="margin:0 0 20px;font-size:24px;font-weight:700;color:#111118;line-height:1.3;">
                As campanhas da Universal Music vão selecionar em breve
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">Oi, ${firstName(nome)}!</p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">
                Um aviso rápido e importante: as <strong>campanhas da Universal Music</strong> aqui no POPline Creators estão fechando a seleção. Os creators vão ser escolhidos <strong>entre hoje e os próximos dias</strong>, então quem quiser participar precisa se candidatar agora.
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">
                Tem ação com nomes como <strong>Jota Quest, Matheus &amp; Kauan, Felipe Araújo, Léo Foguete</strong> e mais.
              </p>

              <p style="margin:0 0 24px;font-size:15px;color:#444455;line-height:1.7;">
                Se você já tem uma ideia de conteúdo na cabeça, não deixa pra depois. Quando a seleção rodar, as vagas fecham.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
                <tr>
                  <td>
                    <a href="${CTA_URL}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:600;color:#ffffff;background:linear-gradient(135deg,#c2185b,#e91e8c);background-color:#e91e8c;border-radius:8px;text-decoration:none;">Ver as campanhas e me candidatar →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:15px;color:#444455;line-height:1.7;">
                Qualquer dúvida, é só responder este email.
              </p>

              <p style="margin:20px 0 0;font-size:14px;color:#666677;line-height:1.6;">
                Um abraço,<br/>
                Rodrigo<br/>
                POPline Creators
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
  const PAGE = 1000;
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, full_name, role')
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

  // TODA A BASE: sem filtro de assinatura. Só dedup por email e validação.
  const byEmail = new Map();
  for (const p of rows) {
    if (!p || !p.email) continue;
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

  console.log(`📧 Destinatários (TODA A BASE — creators com email válido): ${destinatarios.length}`);
  console.log('   Amostra (até 10):');
  for (const r of destinatarios.slice(0, 10)) {
    console.log(`   · ${r.email}`);
  }
  console.log('');

  if (!SHOULD_SEND) {
    console.log('💡 Pra enviar 1 teste:  node scripts/send-universal-selecao.mjs --test=seu@email.com');
    console.log('💡 Pra disparar tudo:   node scripts/send-universal-selecao.mjs --send\n');
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
