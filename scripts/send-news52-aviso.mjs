/**
 * Disparo: "POPline News 5.2 está prestes a selecionar"
 *
 * Público:
 *   - profiles SEM assinatura paga ativa (free, expirados, refunded, chargeback)
 *   - pre_cadastros (leads que ainda não viraram usuário)
 *   - dedup por email
 *
 * Uso:
 *   node scripts/send-news52-aviso.mjs           # dry-run (mostra contagem, não envia)
 *   node scripts/send-news52-aviso.mjs --send    # envia de verdade
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
const SUBJECT = 'A campanha POPline News 5.2 está prestes a selecionar';
const LOGIN_URL = 'https://poplinecreators.com.br/login';

function buildText(nome) {
  const primeiroNome = (nome || '').split(' ')[0] || 'Creator';
  return `Olá ${primeiroNome}, última chamada para se candidatar na campanha POPline News 5.2.

Os Creators serão selecionados em breve!

Acesse agora: ${LOGIN_URL}

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
                Olá ${primeiroNome}, última chamada para se candidatar na campanha POPline News 5.2.
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">
                Os Creators serão selecionados em breve!
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">
                Acesse agora: <a href="${LOGIN_URL}" style="color:#e91e8c;text-decoration:underline;">${LOGIN_URL}</a>
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
                Você está recebendo este email porque possui uma conta na POPline Creators ou se cadastrou na lista de espera.
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

  // 1. Profiles SEM assinatura paga ativa.
  //    Critério "assinante ativo": sub.plan != 'free' E status='active' E (expires_at IS NULL OU > now())
  //    Trazemos todos os profiles com role='creator' (exclui admins) + sub via LEFT JOIN
  //    e filtramos em memória pra clareza.
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, subscriptions(plan, subscription_status, expires_at)')
    .eq('role', 'creator');

  if (pErr) {
    console.error('Erro ao buscar profiles:', pErr.message);
    process.exit(1);
  }

  const now = Date.now();

  // Separa em 2 grupos: assinantes ativos (EXCLUIR) e não assinantes (INCLUIR)
  const assinantesAtivosEmails = new Set();
  const naoAssinantes = [];

  for (const p of profiles) {
    const email = p.email.toLowerCase().trim();
    const sub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : p.subscriptions;
    const isAssinante =
      sub &&
      sub.plan !== 'free' &&
      sub.subscription_status === 'active' &&
      (!sub.expires_at || new Date(sub.expires_at).getTime() >= now);
    if (isAssinante) {
      assinantesAtivosEmails.add(email);
    } else {
      naoAssinantes.push({ email, nome: p.full_name });
    }
  }

  console.log(`✓ Profiles 'creator' total: ${profiles.length}`);
  console.log(`  ├─ Assinantes ATIVOS (excluídos): ${assinantesAtivosEmails.size}`);
  console.log(`  └─ Não assinantes (incluídos): ${naoAssinantes.length}`);

  // 2. Leads do pré-cadastro
  const { data: leads, error: lErr } = await supabase
    .from('pre_cadastros')
    .select('nome, email');

  if (lErr) {
    console.error('Erro ao buscar leads:', lErr.message);
    process.exit(1);
  }

  // Remove leads cujo email pertence a um assinante ativo
  const leadsNorm = leads
    .map(l => ({ email: l.email.toLowerCase().trim(), nome: l.nome }))
    .filter(l => !assinantesAtivosEmails.has(l.email));

  const leadsRemovidos = leads.length - leadsNorm.length;
  console.log(`✓ Pre-cadastros total: ${leads.length}`);
  console.log(`  └─ Removidos por serem assinantes ativos: ${leadsRemovidos}`);
  console.log(`  └─ Leads finais: ${leadsNorm.length}`);

  // 3. Merge + dedup por email
  const byEmail = new Map();
  for (const r of naoAssinantes) byEmail.set(r.email, r);
  for (const r of leadsNorm)     if (!byEmail.has(r.email)) byEmail.set(r.email, r);

  // Filtra emails inválidos
  const destinatarios = Array.from(byEmail.values()).filter(r => /.+@.+\..+/.test(r.email));

  console.log(`\n📧 Destinatários únicos: ${destinatarios.length}`);
  console.log(`   (${naoAssinantes.length} de profiles + ${leadsNorm.length} de leads − duplicados)\n`);

  if (!SHOULD_SEND) {
    console.log('💡 Pra disparar de verdade, rode:');
    console.log('   node scripts/send-news52-aviso.mjs --send\n');
    return;
  }

  // 4. Envio em chunks de 100 (limite do Resend batch)
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
