import { createClient } from '@/lib/supabase/client';
import type { DeliveryRevision } from '@/types';

type Row = {
  id: string;
  delivery_id: string;
  round: number;
  note: string;
  due_date: string;
  revised_url: string | null;
  revised_at: string | null;
  approved_at: string | null;
  requested_at: string;
  requested_by: string | null;
};

function toRevision(r: Row): DeliveryRevision {
  return {
    id: r.id,
    deliveryId: r.delivery_id,
    round: r.round,
    note: r.note,
    dueDate: r.due_date,
    revisedUrl: r.revised_url,
    revisedAt: r.revised_at,
    approvedAt: r.approved_at,
    requestedAt: r.requested_at,
    requestedBy: r.requested_by,
  };
}

const SELECT = 'id, delivery_id, round, note, due_date, revised_url, revised_at, approved_at, requested_at, requested_by';

export async function getRevisionsForDelivery(deliveryId: string): Promise<DeliveryRevision[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_delivery_revisions')
    .select(SELECT)
    .eq('delivery_id', deliveryId)
    .order('round', { ascending: true });
  if (!data) return [];
  return (data as Row[]).map(toRevision);
}

export async function getRevisionsForCampaign(campaignId: string): Promise<DeliveryRevision[]> {
  const supabase = createClient();
  // Join via delivery_id IN (deliveries da campanha)
  const { data: deliveries } = await supabase
    .from('campaign_deliveries')
    .select('id')
    .eq('campaign_id', campaignId);
  if (!deliveries || deliveries.length === 0) return [];
  const ids = (deliveries as { id: string }[]).map(d => d.id);
  const { data } = await supabase
    .from('campaign_delivery_revisions')
    .select(SELECT)
    .in('delivery_id', ids)
    .order('round', { ascending: true });
  if (!data) return [];
  return (data as Row[]).map(toRevision);
}

export async function setRevisedUrl(
  revisionId: string,
  url: string | null,
): Promise<DeliveryRevision | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_delivery_revisions')
    .update({ revised_url: url })
    .eq('id', revisionId)
    .select(SELECT)
    .single();
  return data ? toRevision(data as Row) : null;
}

export async function requestDeliveryRevision(
  deliveryId: string,
  note: string,
  dueIso: string,
): Promise<{ success: true; round: number; revisionId: string } | { success: false; error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('request_delivery_revision', {
    p_delivery_id: deliveryId,
    p_note: note,
    p_due: dueIso,
  });
  if (error) return { success: false, error: error.message ?? 'Erro ao solicitar correção' };
  const r = data as { round: number; revision_id: string };
  return { success: true, round: r.round, revisionId: r.revision_id };
}
