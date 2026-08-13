/**
 * Disparo: "Comunicado — migração de gateway (Kiwify → Hotmart)"
 *
 * Objetivo: tranquilizar quem recebeu o email automático de cancelamento
 * disparado pelo gateway antigo. A assinatura continua ativa; só a renovação
 * automática no cartão foi interrompida — no vencimento, reassina na aba Planos.
 *
 * Público (APENAS assinantes ativos que pagaram via Kiwify):
 *   provider='kiwify' AND assigned_by='payment' AND subscription_status='active'
 *   AND plan<>'free' AND (expires_at IS NULL OR expires_at > now())
 *
 * Uso:
 *   node scripts/send-gateway-migration.mjs               # dry-run (conta, não envia)
 *   node scripts/send-gateway-migration.mjs --test=voce@x # envia 1 email de teste
 *   node scripts/send-gateway-migration.mjs --send        # envia de verdade
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
// Modo --missed: envia para os 19 assinantes ATIVOS cancelados pela Kiwify em
// 2026-07-09 que ficaram de fora do disparo original (filtro assigned_by='payment'
// os excluiu). Lista fechada, verificada no banco. Phueblo (expirado) fica de fora.
const MISSED_MODE = process.argv.includes('--missed');
const MISSED_RECIPIENTS = [
  { email: 'allef.angelos@gmail.com',          nome: 'Allef dos Angelos Pinheiro' },
  { email: 'angelicamariaess@gmail.com',       nome: 'Angélica Maria' },
  { email: 'brunacabraljornalista@gmail.com',  nome: 'Bruna Piaia Cabral' },
  { email: 'b_dimaio@hotmail.com',             nome: 'Bruno Di Maio' },
  { email: 'falecomcarleeenha@gmail.com',      nome: 'Carla Rocha' },
  { email: 'nadaderotina@gmail.com',           nome: 'Francisco Tavares Santana' },
  { email: 'geronimogranja@gmail.com',         nome: 'Gerônimo Antonio Granja Araujo' },
  { email: 'hohana13@gmail.com',               nome: 'Hohana Gomes Barreto' },
  { email: 'asasdeiris@gmail.com',             nome: 'Íris Alves Lacerda' },
  { email: 'contatoiuca@outlook.com',          nome: 'Iury Bissoli Farias' },
  { email: 'contatojpgomesas@gmail.com',       nome: 'Creator' },
  { email: 'bylaraemail@gmail.com',            nome: 'Lara Albuquerque' },
  { email: 'irisluisa9@gmail.com',             nome: 'Luísa Íris Bruno Oliveira' },
  { email: 'netoreisecv@gmail.com',            nome: 'Manoel Neto' },
  { email: 'parcerias.mazoca@gmail.com',       nome: 'Marcela Cavalheri Marques' },
  { email: 'mouranegrini@gmail.com',           nome: 'Rafaela de Moura Negrini' },
  { email: 'contato.terezapark@gmail.com',     nome: 'Tereza Cristina Porto' },
  { email: 'thainaramachcreator@gmail.com',    nome: 'Thainara Machado da Silva Brazilio' },
  { email: 'producaowel@gmail.com',            nome: 'Wellington Constantino de Oliveira' },
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `Rodrigo da POPline <${process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br'}>`;
const WHATSAPP_URL = 'https://chat.whatsapp.com/Hims22XDcjQL8N9AwV7dI3';
const SUBJECT = 'Sua assinatura POPline Creators continua ativa 💜';
const PREVIEW = 'Sobre o email de cancelamento de hoje: seu acesso não foi afetado. Explicamos tudo.';
const CTA_URL = 'https://poplinecreators.com.br/dashboard/planos';

function buildText(nome) {
  const primeiroNome = (nome || '').split(' ')[0] || 'Creator';
  return `Oi ${primeiroNome},

Hoje pela manhã, nosso antigo sistema de pagamento disparou automaticamente um email de cancelamento de assinatura. Se você recebeu, pode ficar tranquilo(a): foi um aviso automático do sistema antigo e NÃO afeta o seu acesso.

O que realmente aconteceu: a POPline Creators mudou de plataforma de pagamento — agora usamos a Hotmart. A única coisa afetada foi a renovação automática no cartão, que foi interrompida no sistema antigo.

Na prática, pra você:
- Sua assinatura continua ativa normalmente até o fim do período que você já pagou.
- Você não perde nada e não precisa fazer nada agora.
- Quando sua assinatura vencer, é só entrar na aba Planos e escolher seu plano de novo — rapidinho, agora pela Hotmart.

Acessar minha conta: ${CTA_URL}

Sentimos muito pelo susto. Qualquer dúvida, fale com a gente na nossa comunidade no WhatsApp: ${WHATSAPP_URL}

Obrigado por fazer parte da POPline Creators.
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
              <p style="margin:0 0 8px;font-size:12px;color:#9999aa;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Comunicado</p>

              <p style="margin:0 0 20px;font-size:24px;font-weight:700;color:#111118;line-height:1.3;">
                Sua assinatura continua ativa 💜
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">Oi, ${primeiroNome}!</p>

              <p style="margin:0 0 16px;font-size:15px;color:#444455;line-height:1.7;">
                Hoje pela manhã, nosso antigo sistema de pagamento disparou <strong>automaticamente</strong> um email de cancelamento de assinatura. Se você recebeu, pode ficar tranquilo(a): <strong>foi um aviso automático do sistema antigo e não afeta o seu acesso.</strong>
              </p>

              <!-- Highlight card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
                <tr>
                  <td style="background-color:#fdf0f7;border:1px solid #f5c6e0;border-left:3px solid #e91e8c;border-radius:0 8px 8px 0;padding:16px 20px;">
                    <p style="margin:0;font-size:15px;color:#444455;line-height:1.7;">
                      <strong style="color:#c2185b;">O que realmente aconteceu:</strong> a POPline Creators mudou de plataforma de pagamento — agora usamos a <strong>Hotmart</strong>. A única coisa afetada foi a <strong>renovação automática no cartão</strong>, que foi interrompida no sistema antigo.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 10px;font-size:15px;color:#444455;line-height:1.7;">Na prática, pra você:</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr><td style="font-size:15px;color:#444455;line-height:1.6;padding:0 0 8px;"><span style="color:#e91e8c;font-weight:700;">✓</span>&nbsp; Sua assinatura <strong>continua ativa</strong> normalmente até o fim do período que você já pagou.</td></tr>
                <tr><td style="font-size:15px;color:#444455;line-height:1.6;padding:0 0 8px;"><span style="color:#e91e8c;font-weight:700;">✓</span>&nbsp; Você <strong>não perde nada</strong> e não precisa fazer nada agora.</td></tr>
                <tr><td style="font-size:15px;color:#444455;line-height:1.6;"><span style="color:#e91e8c;font-weight:700;">✓</span>&nbsp; Quando sua assinatura <strong>vencer</strong>, é só entrar na aba <strong>Planos</strong> e escolher seu plano de novo — rapidinho, agora pela Hotmart.</td></tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
                <tr>
                  <td>
                    <a href="${CTA_URL}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;background:linear-gradient(135deg,#c2185b,#e91e8c);background-color:#e91e8c;border-radius:8px;text-decoration:none;">Acessar minha conta →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:15px;color:#444455;line-height:1.7;">
                Sentimos muito pelo susto. Qualquer dúvida, <a href="${WHATSAPP_URL}" style="color:#e91e8c;text-decoration:underline;">fale com a gente no WhatsApp</a> — a gente te ajuda.
              </p>

              <p style="margin:24px 0 0;font-size:14px;color:#666677;line-height:1.6;">
                Obrigado por fazer parte da POPline Creators 💜<br/>
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
  const nowISO = new Date().toISOString();
  const PAGE = 1000;
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('user_id, profiles!inner(email, full_name)')
      .eq('provider', 'kiwify')
      .eq('assigned_by', 'payment')
      .eq('subscription_status', 'active')
      .neq('plan', 'free')
      .or(`expires_at.is.null,expires_at.gt.${nowISO}`)
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error('Erro ao buscar destinatários:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  // Normaliza (profiles é objeto to-one), dedup por email, valida
  const byEmail = new Map();
  for (const r of rows) {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    if (!p || !p.email) continue;
    const email = p.email.toLowerCase().trim();
    if (!/.+@.+\..+/.test(email)) continue;
    if (!byEmail.has(email)) byEmail.set(email, { email, nome: p.full_name });
  }
  return Array.from(byEmail.values());
}

async function main() {
  // Modo teste: envia 1 email para o endereço informado e sai.
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

  console.log(`\n[modo] ${SHOULD_SEND ? '🟢 ENVIO REAL' : '🟡 DRY-RUN (use --send pra enviar)'}${MISSED_MODE ? ' — lista MISSED (19 ativos não enviados)' : ''}\n`);

  const destinatarios = MISSED_MODE ? MISSED_RECIPIENTS : await fetchRecipients();

  console.log(`📧 Destinatários: ${destinatarios.length}`);
  console.log('   Amostra (até 10):');
  for (const r of destinatarios.slice(0, 10)) {
    console.log(`   · ${r.email}  (${(r.nome || '').split(' ')[0] || 'Creator'})`);
  }
  console.log('');

  if (!SHOULD_SEND) {
    console.log('💡 Pra enviar 1 teste:  node scripts/send-gateway-migration.mjs --test=seu@email.com');
    console.log('💡 Pra disparar tudo:   node scripts/send-gateway-migration.mjs --send\n');
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
