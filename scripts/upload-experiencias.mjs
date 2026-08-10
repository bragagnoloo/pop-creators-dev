/**
 * Sobe os vídeos da dobra "Algumas de nossas Experiências" para o Storage.
 *
 * O dashboard do Supabase rejeita nomes de arquivo com acento, espaço ou
 * pontuação ("File name is invalid"). Este script renomeia para o slug certo
 * antes de enviar, então o nome original do arquivo não importa.
 *
 * Uso:
 *   node scripts/upload-experiencias.mjs doce-maravilha=~/Desktop/video1.mp4
 *   node scripts/upload-experiencias.mjs fragmentos="/caminho/com espaço.mp4" seraqabre=~/outro.mp4
 *
 * Slugs aceitos (precisam bater com o array EXPERIENCIAS do componente):
 *   doce-maravilha, fragmentos, harry-styles, inverno-rio, seraqabre
 *
 * Requer no .env.local: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';

const SLUGS = ['doce-maravilha', 'fragmentos', 'harry-styles', 'inverno-rio', 'seraqabre'];
const BUCKET = 'videos';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}

const pares = process.argv.slice(2);
if (pares.length === 0) {
  console.error('Uso: node scripts/upload-experiencias.mjs <slug>=<caminho.mp4> [...]');
  console.error('Slugs:', SLUGS.join(', '));
  process.exit(1);
}

const sb = createClient(url, key);

for (const par of pares) {
  const i = par.indexOf('=');
  const slug = par.slice(0, i);
  const caminho = par.slice(i + 1).replace(/^~/, homedir());

  if (!SLUGS.includes(slug)) {
    console.error(`✗ slug desconhecido: "${slug}". Use um de: ${SLUGS.join(', ')}`);
    continue;
  }

  let arquivo;
  try {
    arquivo = readFileSync(caminho);
  } catch {
    console.error(`✗ ${slug}: não consegui ler ${caminho}`);
    continue;
  }

  const mb = statSync(caminho).size / 1048576;
  const destino = `${slug}.mp4`;

  const { error } = await sb.storage
    .from(BUCKET)
    .upload(destino, arquivo, { contentType: 'video/mp4', upsert: true });

  if (error) {
    console.error(`✗ ${slug}: ${error.message}`);
    continue;
  }

  const { data } = sb.storage.from(BUCKET).getPublicUrl(destino);
  console.log(`✓ ${slug} (${mb.toFixed(1)} MB) → ${data.publicUrl}`);
  if (mb > 10) {
    console.warn(
      `  ⚠ ${mb.toFixed(1)} MB é pesado para uma LP. Ideal: 720x1280, 10–20s, até ~4 MB.`
    );
  }
}
