import { SavedScript } from '@/types';
import { createClient } from '@/lib/supabase/client';

type Row = {
  id: string;
  user_id: string;
  title: string;
  inputs: SavedScript['inputs'];
  variation: SavedScript['variation'];
  refinement_level: number;
  created_at: string;
};

function toScript(r: Row): SavedScript {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    inputs: r.inputs,
    variation: r.variation,
    refinementLevel: r.refinement_level,
    createdAt: r.created_at,
  };
}

const SELECT = 'id, user_id, title, inputs, variation, refinement_level, created_at';

export async function getUserScripts(userId: string): Promise<SavedScript[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('saved_scripts')
    .select(SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (!data) return [];
  return (data as Row[]).map(toScript);
}

export async function saveScript(data: Omit<SavedScript, 'id' | 'createdAt'>): Promise<SavedScript | null> {
  const supabase = createClient();
  const { data: inserted } = await supabase
    .from('saved_scripts')
    .insert({
      user_id: data.userId,
      title: data.title,
      inputs: data.inputs,
      variation: data.variation,
      refinement_level: data.refinementLevel,
    })
    .select(SELECT)
    .single();
  return inserted ? toScript(inserted as Row) : null;
}

export async function deleteScript(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('saved_scripts').delete().eq('id', id);
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
