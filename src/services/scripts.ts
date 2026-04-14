import { SavedScript } from '@/types';
import { getItem, setItem, generateId } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

function getAll(): SavedScript[] {
  return getItem<SavedScript[]>(STORAGE_KEYS.SCRIPTS) || [];
}

function saveAll(list: SavedScript[]): void {
  setItem(STORAGE_KEYS.SCRIPTS, list);
}

export function getUserScripts(userId: string): SavedScript[] {
  return getAll()
    .filter(s => s.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveScript(data: Omit<SavedScript, 'id' | 'createdAt'>): SavedScript {
  const script: SavedScript = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  saveAll([...getAll(), script]);
  return script;
}

export function deleteScript(id: string): void {
  saveAll(getAll().filter(s => s.id !== id));
}

export function scriptToText(script: SavedScript): string {
  const lines = [
    script.variation.title,
    script.refinementLevel > 0 ? `(Aprimorado ${script.refinementLevel}x)` : '',
    '',
    script.inputs.mode === 'personal'
      ? `Formato: ${script.inputs.format}`
      : `Produto: ${script.inputs.product}`,
    script.inputs.briefing ? `Briefing: ${script.inputs.briefing}` : '',
    `Plataforma: ${script.inputs.platform} · Duração: ${script.inputs.duration}s`,
    `Objetivo: ${script.inputs.objective} · Tom: ${script.inputs.tone}`,
    '',
    '--- ROTEIRO ---',
    '',
    ...script.variation.beats.flatMap(b => [`[${b.time}] ${b.label}`, b.content, '']),
    '--- LEGENDA ---',
    script.variation.caption,
    '',
    '--- HASHTAGS ---',
    script.variation.hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(' '),
  ];
  return lines.filter(l => l !== undefined).join('\n');
}
