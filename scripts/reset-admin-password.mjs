/**
 * Reseta a senha do admin em produção para uma nova senha aleatória.
 * Usa SUPABASE_SERVICE_ROLE_KEY — portanto só roda localmente com .env.local válido.
 *
 * Uso:
 *   node scripts/reset-admin-password.mjs
 *   node scripts/reset-admin-password.mjs admin@popline.com.br  # email custom
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const envPath = join(process.cwd(), '.env.local');
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch {
  console.error('[reset-admin] .env.local não encontrado');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('[reset-admin] faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const email = process.argv[2] || 'admin@popline.com.br';
const newPassword = randomBytes(18).toString('base64url');

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  const user = list.users.find(u => u.email === email);
  if (!user) {
    console.error(`[reset-admin] usuário ${email} não encontrado`);
    process.exit(1);
  }

  const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (updErr) throw updErr;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SENHA DO ADMIN RESETADA (copie agora, não será exibida novamente)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Email:  ${email}`);
  console.log(`  Senha:  ${newPassword}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

main().catch(err => {
  console.error('[reset-admin] falhou:', err);
  process.exit(1);
});
