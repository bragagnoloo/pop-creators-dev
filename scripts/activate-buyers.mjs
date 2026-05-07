/**
 * Ativa planos manualmente para compradores que não foram processados pelo webhook.
 *
 * Uso:
 *   node scripts/activate-buyers.mjs
 *
 * Edite a lista BUYERS abaixo com os dados exportados do painel Kiwify
 * (Pedidos → Aprovados → exportar CSV ou copiar manualmente).
 *
 * Cada entrada: { email, plan: 'monthly' | 'semester' | 'yearly' }
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─── Carrega .env.local ────────────────────────────────────────────────────────
const envPath = join(process.cwd(), '.env.local');
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
} catch {
  console.error('[activate] .env.local não encontrado — usando variáveis de ambiente do sistema.');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ─── DURAÇÃO DOS PLANOS (dias) ────────────────────────────────────────────────
const PLAN_DURATION_DAYS = { monthly: 30, semester: 180, yearly: 365 };

// ─── LISTA DE COMPRADORES ─────────────────────────────────────────────────────
// Cole aqui os e-mails e planos exportados da Kiwify.
// Exemplo:
//   { email: 'fulano@gmail.com', plan: 'monthly' },
const BUYERS = [
  // { email: 'exemplo@gmail.com', plan: 'monthly' },
];
// ─────────────────────────────────────────────────────────────────────────────

if (BUYERS.length === 0) {
  console.error('⚠️  Lista BUYERS está vazia. Edite o script e adicione os compradores.');
  process.exit(1);
}

const VALID_PLANS = ['monthly', 'semester', 'yearly'];

async function activate({ email, plan }) {
  if (!VALID_PLANS.includes(plan)) {
    console.error(`  ✗ Plano inválido "${plan}" para ${email}`);
    return;
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (profileErr || !profile) {
    console.error(`  ✗ Usuário não encontrado: ${email}`);
    return;
  }

  const userId = profile.id;
  const days   = PLAN_DURATION_DAYS[plan];
  const exp    = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('subscriptions').upsert({
    user_id:             userId,
    plan,
    started_at:          new Date().toISOString(),
    expires_at:          exp,
    assigned_by:         'payment',
    subscription_status: 'active',
  });

  if (error) {
    console.error(`  ✗ Erro ao ativar ${email}:`, error.message);
    return;
  }

  // Marcar first_subscribed_at se ainda não tem
  await supabase
    .from('profiles')
    .update({ first_subscribed_at: new Date().toISOString() })
    .eq('id', userId)
    .is('first_subscribed_at', null);

  console.log(`  ✓ ${email} → ${plan} até ${exp.slice(0, 10)}`);
}

console.log(`\n🚀 Ativando ${BUYERS.length} compradores...\n`);

for (const buyer of BUYERS) {
  await activate(buyer);
}

console.log('\n✅ Concluído.\n');
