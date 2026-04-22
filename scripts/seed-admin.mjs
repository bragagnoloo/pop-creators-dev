/**
 * Seed do usuário admin.
 *
 * Uso:
 *   node scripts/seed-admin.mjs
 *
 * Requer no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Se o admin ainda não existe, gera uma senha aleatória e imprime no stdout.
 * Se já existe, apenas garante que o role é 'admin' sem tocar na senha.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

// Carrega .env.local manualmente (sem depender de dotenv)
const envPath = join(process.cwd(), '.env.local');
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch {
  console.error('[seed-admin] .env.local não encontrado');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('[seed-admin] faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || 'admin@popline.com.br';

// Senha: usa ADMIN_SEED_PASSWORD se fornecida, senão gera 24 chars urlsafe.
function generatePassword() {
  return randomBytes(18).toString('base64url');
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[seed-admin] procurando admin: ${ADMIN_EMAIL}`);

  // Primeiro verifica se já existe — não queremos regerar senha de um admin existente.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;

  const existing = list.users.find(u => u.email === ADMIN_EMAIL);
  let userId;
  let wasCreated = false;
  let passwordToPrint = null;

  if (existing) {
    userId = existing.id;
    console.log(`[seed-admin] admin já existe (id ${userId}). Senha existente preservada.`);
  } else {
    const password = process.env.ADMIN_SEED_PASSWORD || generatePassword();
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password,
      email_confirm: true,
    });
    if (createErr) throw createErr;
    userId = created.user.id;
    wasCreated = true;
    passwordToPrint = password;
  }

  // Garante role admin na tabela profiles
  const { error: roleErr } = await supabase
    .from('profiles')
    .update({ role: 'admin', full_name: 'Administrador POPline', onboarding_complete: true })
    .eq('id', userId);

  if (roleErr) throw roleErr;

  console.log(`[seed-admin] ok — user_id: ${userId}`);
  if (wasCreated && passwordToPrint) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  CREDENCIAIS DE ADMIN (copie agora, não serão exibidas novamente)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Email:  ${ADMIN_EMAIL}`);
    console.log(`  Senha:  ${passwordToPrint}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  }
}

main().catch(err => {
  console.error('[seed-admin] falhou:', err);
  process.exit(1);
});
