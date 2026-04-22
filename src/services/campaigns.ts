import { Campaign, CampaignApplication } from '@/types';
import { createClient } from '@/lib/supabase/client';

type CampaignRow = {
  id: string;
  title: string;
  description: string;
  status: Campaign['status'];
  deadline: string | null;
  image_url: string | null;
  briefing: string | null;
  cache: number;
  delivery_count: number;
  created_at: string;
};

type AppRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  status: CampaignApplication['status'];
  applied_at: string;
};

function toCampaign(r: CampaignRow): Campaign {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    deadline: r.deadline,
    imageUrl: r.image_url,
    briefing: r.briefing,
    cache: Number(r.cache),
    deliveryCount: r.delivery_count,
    createdAt: r.created_at,
  };
}

function toApp(r: AppRow): CampaignApplication {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    userId: r.user_id,
    status: r.status,
    appliedAt: r.applied_at,
  };
}

const C_SELECT = 'id, title, description, status, deadline, image_url, briefing, cache, delivery_count, created_at';
const A_SELECT = 'id, campaign_id, user_id, status, applied_at';

// Limite pragmático para evitar full-table scans acidentais em admin views.
const DEFAULT_LIST_LIMIT = 500;

// ---------- Campaigns ----------

export async function getAllCampaigns(): Promise<Campaign[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaigns')
    .select(C_SELECT)
    .order('created_at', { ascending: false })
    .limit(DEFAULT_LIST_LIMIT);
  if (!data) return [];
  return (data as CampaignRow[]).map(toCampaign);
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const supabase = createClient();
  const { data } = await supabase.from('campaigns').select(C_SELECT).eq('id', id).single();
  return data ? toCampaign(data as CampaignRow) : null;
}

export async function createCampaign(data: Omit<Campaign, 'id' | 'createdAt'>): Promise<Campaign | null> {
  const supabase = createClient();
  const { data: inserted } = await supabase
    .from('campaigns')
    .insert({
      title: data.title,
      description: data.description,
      status: data.status,
      deadline: data.deadline,
      image_url: data.imageUrl,
      briefing: data.briefing,
      cache: data.cache,
      delivery_count: data.deliveryCount,
    })
    .select(C_SELECT)
    .single();
  return inserted ? toCampaign(inserted as CampaignRow) : null;
}

export async function updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | null> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;
  if (data.status !== undefined) patch.status = data.status;
  if (data.deadline !== undefined) patch.deadline = data.deadline;
  if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;
  if (data.briefing !== undefined) patch.briefing = data.briefing;
  if (data.cache !== undefined) patch.cache = data.cache;
  if (data.deliveryCount !== undefined) patch.delivery_count = data.deliveryCount;

  const { data: updated } = await supabase
    .from('campaigns')
    .update(patch)
    .eq('id', id)
    .select(C_SELECT)
    .single();
  return updated ? toCampaign(updated as CampaignRow) : null;
}

export async function deleteCampaign(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('campaigns').delete().eq('id', id);
}

// ---------- Applications ----------

export async function applyToCampaign(campaignId: string, userId: string): Promise<CampaignApplication | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('applications')
    .insert({ campaign_id: campaignId, user_id: userId })
    .select(A_SELECT)
    .single();
  return data ? toApp(data as AppRow) : null;
}

export async function getUserApplications(userId: string): Promise<CampaignApplication[]> {
  const supabase = createClient();
  const { data } = await supabase.from('applications').select(A_SELECT).eq('user_id', userId);
  if (!data) return [];
  return (data as AppRow[]).map(toApp);
}

export async function getCampaignApplications(campaignId: string): Promise<CampaignApplication[]> {
  const supabase = createClient();
  const { data } = await supabase.from('applications').select(A_SELECT).eq('campaign_id', campaignId);
  if (!data) return [];
  return (data as AppRow[]).map(toApp);
}

export async function getAllApplications(): Promise<CampaignApplication[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('applications')
    .select(A_SELECT)
    .order('applied_at', { ascending: false })
    .limit(DEFAULT_LIST_LIMIT);
  if (!data) return [];
  return (data as AppRow[]).map(toApp);
}

export async function updateApplicationStatus(
  applicationId: string,
  status: CampaignApplication['status']
): Promise<CampaignApplication | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
    .select(A_SELECT)
    .single();
  return data ? toApp(data as AppRow) : null;
}
