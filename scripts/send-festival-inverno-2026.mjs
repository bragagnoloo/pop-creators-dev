/**
 * Disparo: "Nova campanha aberta: Festival de Inverno Rio 2026"
 *
 * Público:
 *   - TODOS os profiles com role='creator' (incluindo assinantes ativos)
 *   - NÃO inclui leads do pre_cadastros (só quem tem conta na plataforma)
 *   - dedup por email (defensivo)
 *
 * Uso:
 *   node scripts/send-festival-inverno-2026.mjs           # dry-run (mostra contagem, não envia)
 *   node scripts/send-festival-inverno-2026.mjs --send    # envia de verdade
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `POPline Creators <${process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br'}>`;
const SUBJECT = 'Nova campanha aberta: Festival de Inverno Rio 2026';
const CTA_URL = 'https://poplinecreators.com.br/dashboard/campanhas';

function buildText(nome) {
  const primeiroNome = (nome || '').split(' ')[0] || 'Creator';
  return `Olá ${primeiroNome}, nova campanha aberta no POPline Creators: Festival de Inverno Rio 2026.

A campanha do Festival de Inverno Rio 2026 acabou de abrir as candidaturas dentro da plataforma. As vagas são limitadas — entre agora e garanta a sua participação.

Acesse a área de campanhas: ${CTA_URL}

Boa sorte e até breve.

Abraço,
Rodrigo — POPline Creators`;
}

function buildHtml(nome) {
  const primeiroNome = (nome || '').split(' ')[0] || 'Creator';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="background-color:#f4f4f6;font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;">
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
              <p style="margin:0 0 8px;font-size:12px;color:#9999aa;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Aviso</p>

              <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111118;line-height:1.3;">
                Olá ${primeiroNome}! Nova campanha aberta no POPline Creators: Festival de Inverno Rio 2026.
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">
                A campanha do Festival de Inverno Rio 2026 acabou de abrir as candidaturas dentro da plataforma. As vagas são limitadas — entre agora e garanta a sua participação.
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">
                Acesse a área de campanhas: <a href="${CTA_URL}" style="color:#e91e8c;text-decoration:underline;">${CTA_URL}</a>
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">
                Boa sorte e até breve.
              </p>

              <p style="margin:28px 0 0;font-size:14px;color:#666677;line-height:1.6;">
                Abraço,<br/>
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

async function main() {
  console.log(`\n[modo] ${SHOULD_SEND ? '🟢 ENVIO REAL' : '🟡 DRY-RUN (use --send pra enviar)'}\n`);

  // Busca TODOS os profiles com role='creator' (não filtra por assinatura)
  // Pagina com .range() porque o PostgREST tem max-rows global = 1000
  const PAGE = 1000;
  const profiles = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data: chunk, error: pErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'creator')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (pErr) {
      console.error('Erro ao buscar profiles:', pErr.message);
      process.exit(1);
    }
    if (!chunk || chunk.length === 0) break;
    profiles.push(...chunk);
    if (chunk.length < PAGE) break;
  }

  console.log(`✓ Profiles 'creator' total: ${profiles.length}`);

  // Normaliza email + dedup defensivo (caso o banco tenha duplicatas case-different)
  const byEmail = new Map();
  for (const p of profiles) {
    const email = (p.email ?? '').toLowerCase().trim();
    if (!email) continue;
    if (!byEmail.has(email)) {
      byEmail.set(email, { email, nome: p.full_name });
    }
  }

  // Filtra emails inválidos
  const destinatarios = Array.from(byEmail.values()).filter(r => /.+@.+\..+/.test(r.email));

  console.log(`✓ Destinatários únicos (após dedup + validação): ${destinatarios.length}\n`);

  if (!SHOULD_SEND) {
    console.log('💡 Pra disparar de verdade, rode:');
    console.log('   node scripts/send-festival-inverno-2026.mjs --send\n');
    return;
  }

  // Envio em chunks de 100 (limite do Resend batch)
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
