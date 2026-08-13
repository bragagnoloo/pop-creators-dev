/**
 * Disparo de email para todos os leads da pré-venda.
 *
 * Uso:
 *   node scripts/send-prevenda-email.mjs
 *
 * Requer no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *   RESEND_FROM
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Carrega .env.local
const envPath = join(process.cwd(), '.env.local');
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch {
  console.error('[email] .env.local não encontrado, usando variáveis do ambiente.');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Rodrigo da POPline <${process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br'}>`;
const SUBJECT = 'FALTAM 2H 👀';

function buildHtml(nome) {
  const primeiroNome = (nome || '').split(' ')[0] || 'Creator';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Helvetica Neue',Arial,sans-serif;color:#f0f0f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:22px;font-weight:900;background:linear-gradient(135deg,#f06abc,#e91e8c,#c2185b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">POPline</span>
              <span style="font-size:14px;color:#8888a0;margin-left:8px;">Creators</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#14141f;border:1px solid #2a2a3a;border-radius:16px;padding:40px 32px;">

              <p style="margin:0 0 24px;font-size:28px;font-weight:900;line-height:1.2;color:#f0f0f5;">
                FALTAM 2H 👀
              </p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#f0f0f5;">
                ${primeiroNome}, daqui a 2 horas a gente vai abrir o POPline Creators pela primeira vez.
              </p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#f0f0f5;">
                E sinceramente?
              </p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#f0f0f5;">
                Quem estiver nessa live hoje vai entender muito antes da maioria pra onde o mercado da criação de conteúdo está indo.
              </p>

              <p style="margin:0 0 24px;font-size:28px;font-weight:900;color:#f0f0f5;">👀</p>

              <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#f0f0f5;">
                Se eu fosse você… não perderia essa live por nada.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://poplinecreators.com.br"
                      style="display:inline-block;background:linear-gradient(135deg,#c2185b,#e91e8c,#f06abc);color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;">
                      Acessar agora →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#8888a0;">
                Você recebe este email por ter se cadastrado na lista de espera do POPline Creators.
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

async function main() {
  // Buscar todos os leads
  const { data: leads, error } = await supabase
    .from('pre_cadastros')
    .select('nome, email')
    .order('criado_em');

  if (error) {
    console.error('Erro ao buscar leads:', error.message);
    process.exit(1);
  }

  console.log(`✓ ${leads.length} leads encontrados.`);

  // Montar batch de emails
  const emails = leads.map(l => ({
    from: FROM,
    to: l.email,
    subject: SUBJECT,
    html: buildHtml(l.nome),
  }));

  // Enviar em chunks de 100
  const CHUNK = 100;
  let enviados = 0;

  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK);
    const { data, error: sendError } = await resend.batch.send(chunk);

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
