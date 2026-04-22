import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_REF = 'xduxtovqwebteqhrffgh';
const DB_PASSWORD = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;
if (!DB_PASSWORD) {
  console.error('Uso: node scripts/run-migrations.mjs <DB_PASSWORD>');
  console.error('Ou:  SUPABASE_DB_PASSWORD=... node scripts/run-migrations.mjs');
  console.error('Opcional: adicionar arquivos específicos como args adicionais (ex: 0004_security_functions.sql)');
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

// Se passaram arquivos como args extras, aplica só esses. Senão aplica todos em ordem.
const explicit = process.argv.slice(3).filter(a => a.endsWith('.sql') && !a.includes('all.sql'));
const migrationsDir = join(process.cwd(), 'supabase/migrations');
const files = explicit.length > 0
  ? explicit
  : readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && f !== 'all.sql')
      .sort();

try {
  for (const file of files) {
    console.log(`[migrations] aplicando ${file}...`);
    const content = readFileSync(join(migrationsDir, file), 'utf8');
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
