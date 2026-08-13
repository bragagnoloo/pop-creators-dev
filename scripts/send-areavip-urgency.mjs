/**
 * Disparo urgência AREAVIP — menos de 2h para expirar
 * Para: leads sem conta + cadastrados free
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
    if (m) process.env[m[1]] = m[2].trim();
  }
} catch { console.error('[env] .env.local não encontrado.'); }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Rodrigo da POPline <${process.env.RESEND_FROM ?? 'noreply@poplinecreators.com.br'}>`;
const SUBJECT = 'você viu isso?';
const URL = 'https://poplinecreators.com.br/dashboard/planos';

function buildText(nome) {
  const primeiroNome = (nome || '').split(' ')[0] || 'Creator';
  return `Oi ${primeiroNome},

abre aqui rápido — o cupom AREAVIP fecha em menos de 2 horas e não vai voltar.

Ele dá 50% nos planos Semestral e Anual. Depois disso o valor volta ao preço cheio.

Para garantir: ${URL}

Abraço,
Rodrigo`;
}

// 1. Leads sem conta
const { data: leads } = await supabase
  .from('pre_cadastros')
  .select('nome, email')
  .not('email', 'in', `(select email from profiles)`);

// 2. Cadastrados free
const { data: freeUsers } = await supabase
  .from('profiles')
  .select('full_name, email')
  .in('id', (
    await supabase.from('subscriptions').select('user_id').eq('plan', 'free').eq('subscription_status', 'free')
  ).data?.map(r => r.user_id) ?? []);

// Monta lista única por email
const seen = new Set();
const recipients = [];

for (const u of freeUsers ?? []) {
  if (!u.email || seen.has(u.email)) continue;
  seen.add(u.email);
  recipients.push({ nome: u.full_name || '', email: u.email });
}
for (const l of leads ?? []) {
  if (!l.email || seen.has(l.email)) continue;
  seen.add(l.email);
  recipients.push({ nome: l.nome || '', email: l.email });
}

console.log(`\n🚀 Disparando para ${recipients.length} destinatários...\n`);

let ok = 0, fail = 0;
// Resend permite até 100 por batch
for (let i = 0; i < recipients.length; i += 100) {
  const batch = recipients.slice(i, i + 100);
  const { data, error } = await resend.batch.send(
    batch.map(r => ({
      from: FROM,
      to: r.email,
      subject: SUBJECT,
      text: buildText(r.nome),
    }))
  );
  if (error) {
    console.error(`  ✗ Batch ${i / 100 + 1}:`, error.message);
    fail += batch.length;
  } else {
    ok += data?.data?.length ?? batch.length;
    console.log(`  ✓ Batch ${i / 100 + 1}: ${batch.length} enviados`);
  }
}

console.log(`\n✅ Concluído — ${ok} enviados, ${fail} falhas.\n`);
