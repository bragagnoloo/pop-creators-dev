import { CampaignDelivery } from '@/types';
import { createClient } from '@/lib/supabase/client';

type Row = {
  id: string;
  campaign_id: string;
  user_id: string;
  index: number;
  scheduled_date: string | null;
  content_url: string | null;
};

function toDelivery(r: Row): CampaignDelivery {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    userId: r.user_id,
    index: r.index,
    scheduledDate: r.scheduled_date,
    contentUrl: r.content_url,
  };
}

const SELECT = 'id, campaign_id, user_id, index, scheduled_date, content_url';

export async function getDeliveriesForUser(campaignId: string, userId: string): Promise<CampaignDelivery[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_deliveries')
    .select(SELECT)
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .order('index', { ascending: true });
  if (!data) return [];
  return (data as Row[]).map(toDelivery);
}

export async function getCampaignDeliveries(campaignId: string): Promise<CampaignDelivery[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_deliveries')
    .select(SELECT)
    .eq('campaign_id', campaignId);
  if (!data) return [];
  return (data as Row[]).map(toDelivery);
}

/**
 * Garante N slots de entrega para (campaignId, userId). Cria os que faltam.
 */
export async function ensureDeliveries(
  campaignId: string,
  userId: string,
  count: number
): Promise<CampaignDelivery[]> {
  const existing = await getDeliveriesForUser(campaignId, userId);
  const existingIdx = new Set(existing.map(d => d.index));
  const toCreate = [];
  for (let i = 1; i <= count; i++) {
    if (!existingIdx.has(i)) {
      toCreate.push({ campaign_id: campaignId, user_id: userId, index: i });
    }
  }
  if (toCreate.length > 0) {
    const supabase = createClient();
    await supabase.from('campaign_deliveries').insert(toCreate);
  }
  return await getDeliveriesForUser(campaignId, userId);
}

export async function updateDelivery(
  id: string,
  data: Partial<Pick<CampaignDelivery, 'scheduledDate' | 'contentUrl'>>
): Promise<CampaignDelivery | null> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (data.scheduledDate !== undefined) patch.scheduled_date = data.scheduledDate;
  if (data.contentUrl !== undefined) patch.content_url = data.contentUrl;

  const { data: updated } = await supabase
    .from('campaign_deliveries')
    .update(patch)
    .eq('id', id)
    .select(SELECT)
    .single();
  return updated ? toDelivery(updated as Row) : null;
}
