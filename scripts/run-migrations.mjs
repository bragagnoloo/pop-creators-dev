import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_REF = 'xduxtovqwebteqhrffgh';
const DB_PASSWORD = process.argv[2];
if (!DB_PASSWORD) {
  console.error('Uso: node scripts/run-migrations.mjs <DB_PASSWORD>');
  process.exit(1);
}

// Supabase agora expõe via pooler (aws-0-<region>.pooler.supabase.com)
const sql = postgres({
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 5432, // Session mode permite DDL; 6543 é transaction mode (sem DDL)
  database: 'postgres',
  username: `postgres.${PROJECT_REF}`,
  password: DB_PASSWORD,
  ssl: 'require',
  max: 1,
  prepare: false,
});

const files = [
  '0001_init_schema.sql',
  '0002_rls_policies.sql',
  '0003_storage.sql',
];

try {
  for (const file of files) {
    console.log(`[migrations] aplicando ${file}...`);
    const content = readFileSync(join(process.cwd(), 'supabase/migrations', file), 'utf8');
    await sql.unsafe(content);
    console.log(`[migrations] ✓ ${file}`);
  }
  console.log('[migrations] todas aplicadas com sucesso');
} catch (err) {
  console.error('[migrations] erro:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
