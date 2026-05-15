import { CampaignDelivery, DeliverableStatus, PublicationStatus } from '@/types';
import { createClient } from '@/lib/supabase/client';

type Row = {
  id: string;
  campaign_id: string;
  user_id: string;
  index: number;
  scheduled_date: string | null;
  content_url: string | null;
  deliverable_status: DeliverableStatus;
  revision_note: string | null;
  revision_due_date: string | null;
  publication_url: string | null;
  publication_status: PublicationStatus;
  publication_date: string | null;
  publication_platform: string | null;
  publication_due_date: string | null;
  publication_confirmed_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

function toDelivery(r: Row): CampaignDelivery {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    userId: r.user_id,
    index: r.index,
    scheduledDate: r.scheduled_date,
    contentUrl: r.content_url,
    deliverableStatus: r.deliverable_status ?? 'pending',
    revisionNote: r.revision_note,
    revisionDueDate: r.revision_due_date,
    publicationUrl: r.publication_url,
    publicationStatus: r.publication_status ?? 'pending',
    publicationDate: r.publication_date,
    publicationPlatform: r.publication_platform,
    publicationDueDate: r.publication_due_date,
    publicationConfirmedAt: r.publication_confirmed_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
  };
}

const SELECT = 'id, campaign_id, user_id, index, scheduled_date, content_url, deliverable_status, revision_note, revision_due_date, publication_url, publication_status, publication_date, publication_platform, publication_due_date, publication_confirmed_at, reviewed_at, reviewed_by';

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
    // upsert race-safe: dois callers (admin + criador) podem chamar simultaneamente
    // após aprovação. O unique (campaign_id, user_id, index) protege; ignoreDuplicates
    // evita exception.
    await supabase
      .from('campaign_deliveries')
      .upsert(toCreate, { onConflict: 'campaign_id,user_id,index', ignoreDuplicates: true });
  }
  return await getDeliveriesForUser(campaignId, userId);
}

export async function updateDelivery(
  id: string,
  data: Partial<Pick<CampaignDelivery, 'scheduledDate' | 'contentUrl' | 'publicationUrl'>>
): Promise<CampaignDelivery | null> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (data.scheduledDate !== undefined) patch.scheduled_date = data.scheduledDate;
  if (data.contentUrl !== undefined) patch.content_url = data.contentUrl;
  if (data.publicationUrl !== undefined) patch.publication_url = data.publicationUrl;

  const { data: updated } = await supabase
    .from('campaign_deliveries')
    .update(patch)
    .eq('id', id)
    .select(SELECT)
    .single();
  return updated ? toDelivery(updated as Row) : null;
}
