/**
 * Disparo: "A live começou" para todos os leads da pré-venda.
 *
 * Uso:
 *   node scripts/send-live-email.mjs
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
  console.error('[email] .env.local não encontrado.');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Rodrigo da POPline <${process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br'}>`;
const SUBJECT = '🔴 A live começou — entra agora!';
const LIVE_URL = 'https://meet.google.com/cdj-bkms-pap?authuser=0';

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

          <!-- Badge AO VIVO -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="display:inline-flex;align-items:center;gap:8px;background:#e91e8c;color:#fff;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:8px 20px;border-radius:100px;">
                🔴 &nbsp;Ao Vivo Agora
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#14141f;border:1px solid #2a2a3a;border-radius:16px;padding:40px 32px;">

              <p style="margin:0 0 24px;font-size:26px;font-weight:900;line-height:1.2;color:#f0f0f5;">
                ${primeiroNome}, a live<br/>já começou! 🎬
              </p>

              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#c0c0d0;">
                O POPline Creators acabou de abrir as portas ao vivo.
                Entra agora e faz parte do primeiro momento dessa plataforma.
              </p>

              <!-- CTA principal -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${LIVE_URL}"
                      style="display:inline-block;background:linear-gradient(135deg,#c2185b,#e91e8c,#f06abc);color:#fff;font-size:17px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:0.02em;">
                      👉 &nbsp;Entrar na Live Agora
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link direto -->
              <p style="margin:0;font-size:13px;color:#8888a0;text-align:center;">
                Ou acesse diretamente:<br/>
                <a href="${LIVE_URL}" style="color:#e91e8c;word-break:break-all;">${LIVE_URL}</a>
              </p>

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
  const { data: leads, error } = await supabase
    .from('pre_cadastros')
    .select('nome, email')
    .order('criado_em');

  if (error) {
    console.error('Erro ao buscar leads:', error.message);
    process.exit(1);
  }

  console.log(`✓ ${leads.length} leads encontrados.`);

  const emails = leads.map(l => ({
    from: FROM,
    to: l.email,
    subject: SUBJECT,
    html: buildHtml(l.nome),
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
