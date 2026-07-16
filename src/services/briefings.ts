import { createClient } from '@/lib/supabase/client';

/**
 * Opções (variações) de briefing por entregável, e escolha do participante.
 * Vale para todas as campanhas: cada entregável (index 1..delivery_count) pode
 * ter N opções; o participante escolhe uma por entregável (registrada).
 */
export interface BriefingOption {
  index: number;
  optionNumber: number;
  briefing: string | null;
  briefingFileUrl: string | null;
}

export interface BriefingChoice {
  userId: string;
  index: number;
  optionNumber: number;
}

type OptRow = {
  index: number;
  option_number: number;
  briefing: string | null;
  briefing_file_url: string | null;
};

type ChoiceRow = {
  user_id: string;
  index: number;
  option_number: number;
};

// -----------------------------------------------------------------------------
// Opções
// -----------------------------------------------------------------------------

export async function getBriefingOptions(campaignId: string): Promise<BriefingOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_briefing_options')
    .select('index, option_number, briefing, briefing_file_url')
    .eq('campaign_id', campaignId)
    .order('index')
    .order('option_number');
  if (!data) return [];
  return (data as OptRow[]).map(r => ({
    index: r.index,
    optionNumber: r.option_number,
    briefing: r.briefing,
    briefingFileUrl: r.briefing_file_url,
  }));
}

export async function upsertOptionText(
  campaignId: string,
  index: number,
  optionNumber: number,
  text: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('campaign_briefing_options')
    .upsert(
      { campaign_id: campaignId, index, option_number: optionNumber, briefing: text || null },
      { onConflict: 'campaign_id,index,option_number' },
    );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setOptionFile(
  campaignId: string,
  index: number,
  optionNumber: number,
  path: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('campaign_briefing_options')
    .upsert(
      { campaign_id: campaignId, index, option_number: optionNumber, briefing_file_url: path },
      { onConflict: 'campaign_id,index,option_number' },
    );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function clearOptionFile(
  campaignId: string,
  index: number,
  optionNumber: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('campaign_briefing_options')
    .update({ briefing_file_url: null })
    .eq('campaign_id', campaignId)
    .eq('index', index)
    .eq('option_number', optionNumber);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Remove uma opção e limpa as escolhas que apontavam para ela. */
export async function removeOption(
  campaignId: string,
  index: number,
  optionNumber: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('campaign_briefing_options')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('index', index)
    .eq('option_number', optionNumber);
  if (error) return { ok: false, error: error.message };
  // Limpa escolhas órfãs (admin manage policy permite).
  await supabase
    .from('campaign_briefing_choices')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('index', index)
    .eq('option_number', optionNumber);
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Escolhas
// -----------------------------------------------------------------------------

/** Todas as escolhas da campanha (admin vê todas via RLS). */
export async function getAllChoices(campaignId: string): Promise<BriefingChoice[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_briefing_choices')
    .select('user_id, index, option_number')
    .eq('campaign_id', campaignId);
  if (!data) return [];
  return (data as ChoiceRow[]).map(r => ({
    userId: r.user_id,
    index: r.index,
    optionNumber: r.option_number,
  }));
}

/** Escolhas do usuário atual (RLS retorna só as dele). Map index -> optionNumber. */
export async function getMyChoices(campaignId: string): Promise<Map<number, number>> {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_briefing_choices')
    .select('index, option_number')
    .eq('campaign_id', campaignId);
  const map = new Map<number, number>();
  for (const r of (data ?? []) as { index: number; option_number: number }[]) {
    map.set(r.index, r.option_number);
  }
  return map;
}

/** Registra/atualiza a escolha do criador para um entregável. */
export async function setChoice(
  campaignId: string,
  userId: string,
  index: number,
  optionNumber: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('campaign_briefing_choices')
    .upsert(
      { campaign_id: campaignId, user_id: userId, index, option_number: optionNumber },
      { onConflict: 'campaign_id,user_id,index' },
    );
  return error ? { ok: false, error: error.message } : { ok: true };
}
