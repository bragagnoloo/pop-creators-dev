import { createClient } from '@/lib/supabase/client';

/**
 * Briefing por entregável (index) — usado quando a campanha tem delivery_count > 1.
 * Campanhas com 1 entregável continuam usando campaigns.briefing / briefing_file_url.
 */
export interface CampaignBriefing {
  index: number;
  briefing: string | null;
  briefingFileUrl: string | null;
}

type Row = {
  index: number;
  briefing: string | null;
  briefing_file_url: string | null;
};

export async function getCampaignBriefings(campaignId: string): Promise<CampaignBriefing[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_briefings')
    .select('index, briefing, briefing_file_url')
    .eq('campaign_id', campaignId)
    .order('index');
  if (!data) return [];
  return (data as Row[]).map(r => ({
    index: r.index,
    briefing: r.briefing,
    briefingFileUrl: r.briefing_file_url,
  }));
}

/** Salva/atualiza o texto do briefing de um entregável (upsert por campaign_id+index). */
export async function upsertBriefingText(
  campaignId: string,
  index: number,
  text: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('campaign_briefings')
    .upsert(
      { campaign_id: campaignId, index, briefing: text || null },
      { onConflict: 'campaign_id,index' },
    );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Define o arquivo do briefing de um entregável. */
export async function setBriefingFile(
  campaignId: string,
  index: number,
  path: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('campaign_briefings')
    .upsert(
      { campaign_id: campaignId, index, briefing_file_url: path },
      { onConflict: 'campaign_id,index' },
    );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Remove o arquivo do briefing de um entregável (zera o campo). */
export async function clearBriefingFile(
  campaignId: string,
  index: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('campaign_briefings')
    .update({ briefing_file_url: null })
    .eq('campaign_id', campaignId)
    .eq('index', index);
  return error ? { ok: false, error: error.message } : { ok: true };
}
