#!/usr/bin/env node
// Roda os testes de permissão em produção. Usar SEMPRE depois de aplicar
// uma migration:  npm run test:security
//
// Lê CRON_SECRET do .env.local. Para outro ambiente: BASE_URL=http://localhost:3000
import { readFileSync } from 'node:fs';

function loadEnv() {
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // sem .env.local: depende das variáveis do ambiente
  }
}

loadEnv();

const base = process.env.BASE_URL ?? 'https://poplinecreators.com.br';
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error('CRON_SECRET não encontrado (.env.local ou ambiente).');
  process.exit(2);
}

const res = await fetch(`${base}/api/cron/security-tests`, { headers: { Authorization: `Bearer ${secret}` } });
if (!res.ok && res.status !== 200) {
  console.error(`Falha ao chamar ${base}: HTTP ${res.status}`);
  console.error(await res.text());
  process.exit(2);
}

const report = await res.json();
for (const r of report.results) {
  console.log(`${r.passed ? '✅' : '❌'} ${r.description}${r.passed ? '' : `\n     → ${r.detail}`}`);
}
console.log(`\n${report.total - report.failed}/${report.total} passaram.`);
if (report.failed > 0) {
  console.log('Falhas também foram enviadas como alerta crítico para poplinecreators@gmail.com.');
  process.exit(1);
}
