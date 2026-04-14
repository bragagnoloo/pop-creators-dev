/**
 * Seed do usuário admin.
 *
 * Uso:
 *   node scripts/seed-admin.mjs
 *
 * Requer no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

const ADMIN_EMAIL = 'admin@popline.com.br';
const ADMIN_PASSWORD = 'admin123';

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[seed-admin] criando admin: ${ADMIN_EMAIL}`);

  // Tenta criar o usuário. Se já existir, pega o id.
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  let userId;
  if (createErr) {
    if (createErr.message.includes('already been registered')) {
      console.log('[seed-admin] admin já existe, buscando id...');
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) throw listErr;
      const existing = list.users.find(u => u.email === ADMIN_EMAIL);
      if (!existing) throw new Error('Admin email listado mas não encontrado');
      userId = existing.id;
    } else {
      throw createErr;
    }
  } else {
    userId = created.user.id;
  }

  // Promove a admin na tabela profiles
  const { error: roleErr } = await supabase
    .from('profiles')
    .update({ role: 'admin', full_name: 'Administrador POPline', onboarding_complete: true })
    .eq('id', userId);

  if (roleErr) throw roleErr;

  console.log(`[seed-admin] ok — user_id: ${userId}`);
  console.log(`[seed-admin] login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main().catch(err => {
  console.error('[seed-admin] falhou:', err);
  process.exit(1);
});
