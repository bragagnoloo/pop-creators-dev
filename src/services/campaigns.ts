import { Campaign, CampaignApplication, CampaignStage, StageHistoryEntry } from '@/types';
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
  has_cache: boolean;
  has_permuta: boolean;
  permuta_description: string | null;
  has_commission: boolean;
  commission_percentage: number | null;
  commission_description: string | null;
  is_invite: boolean;
  is_review: boolean;
  current_stage: number;
  whatsapp_group_link: string | null;
  briefing_file_url: string | null;
  stage_history: StageHistoryEntry[];
  stage_updated_at: string;
};

type AppRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  status: CampaignApplication['status'];
  applied_at: string;
  joined_whatsapp_group: boolean;
  joined_at: string | null;
  disqualified_at: string | null;
  disqualification_reason: string | null;
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
    hasCache: r.has_cache,
    hasPermuta: r.has_permuta,
    permutaDescription: r.permuta_description,
    hasCommission: r.has_commission,
    commissionPercentage: r.commission_percentage === null ? null : Number(r.commission_percentage),
    commissionDescription: r.commission_description,
    isInvite: r.is_invite ?? false,
    isReview: r.is_review ?? false,
    currentStage: (r.current_stage ?? 0) as CampaignStage,
    whatsappGroupLink: r.whatsapp_group_link,
    briefingFileUrl: r.briefing_file_url,
    stageHistory: r.stage_history ?? [],
    stageUpdatedAt: r.stage_updated_at,
  };
}

function toApp(r: AppRow): CampaignApplication {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    userId: r.user_id,
    status: r.status,
    appliedAt: r.applied_at,
    joinedWhatsappGroup: r.joined_whatsapp_group ?? false,
    joinedAt: r.joined_at,
    disqualifiedAt: r.disqualified_at,
    disqualificationReason: r.disqualification_reason,
  };
}

const C_SELECT = 'id, title, description, status, deadline, image_url, briefing, cache, delivery_count, created_at, has_cache, has_permuta, permuta_description, has_commission, commission_percentage, commission_description, is_invite, is_review, current_stage, whatsapp_group_link, briefing_file_url, stage_history, stage_updated_at';
const A_SELECT = 'id, campaign_id, user_id, status, applied_at, joined_whatsapp_group, joined_at, disqualified_at, disqualification_reason';

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
      cache: data.hasCache ? data.cache : 0,
      delivery_count: data.deliveryCount,
      has_cache: data.hasCache,
      has_permuta: data.hasPermuta,
      permuta_description: data.hasPermuta ? data.permutaDescription : null,
      has_commission: data.hasCommission,
      commission_percentage: data.hasCommission ? data.commissionPercentage : null,
      commission_description: data.hasCommission ? data.commissionDescription : null,
      // Tipo definido só na criação; imutável depois (não entra em updateCampaign).
      is_invite: data.isInvite ?? false,
      is_review: data.isReview ?? false,
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
  if (data.deliveryCount !== undefined) patch.delivery_count = data.deliveryCount;
  if (data.hasCache !== undefined) patch.has_cache = data.hasCache;
  if (data.hasPermuta !== undefined) patch.has_permuta = data.hasPermuta;
  if (data.permutaDescription !== undefined) patch.permuta_description = data.permutaDescription;
  if (data.hasCommission !== undefined) patch.has_commission = data.hasCommission;
  if (data.commissionPercentage !== undefined) patch.commission_percentage = data.commissionPercentage;
  if (data.commissionDescription !== undefined) patch.commission_description = data.commissionDescription;
  if (data.whatsappGroupLink !== undefined) patch.whatsapp_group_link = data.whatsappGroupLink;
  if (data.briefingFileUrl !== undefined) patch.briefing_file_url = data.briefingFileUrl;
  // cache numérico: se hasCache for explicitamente false, zera; senão usa valor passado.
  if (data.cache !== undefined) {
    patch.cache = data.hasCache === false ? 0 : data.cache;
  } else if (data.hasCache === false) {
    patch.cache = 0;
  }

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

/**
 * Candidatura com aceite do termo. Atômico via RPC Postgres apply_with_term.
 * Registra o aceite em campaign_term_acceptances e cria (ou recupera) a application.
 */
export async function applyToCampaignWithTerm(
  campaignId: string,
  termVersion: string
): Promise<{ success: true; application: CampaignApplication } | { success: false; error: string }> {
  const supabase = createClient();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null;

  const { data, error } = await supabase.rpc('apply_with_term', {
    p_campaign_id: campaignId,
    p_term_version: termVersion,
    p_user_agent: userAgent,
  });

  if (error) {
    return { success: false, error: error.message || 'Falha ao processar candidatura.' };
  }

  const result = data as
    | { success: true; application: AppRow }
    | { success: false; error: string }
    | null;

  if (!result) return { success: false, error: 'Resposta inesperada do servidor.' };
  if (!result.success) return { success: false, error: result.error };

  return { success: true, application: toApp(result.application) };
}

/**
 * Adiciona um convidado a uma campanha convite (is_invite). Atômico via RPC
 * add_campaign_guest (SECURITY DEFINER): cria a application já como 'approved'.
 */
export async function addCampaignGuest(
  campaignId: string,
  userId: string
): Promise<{ success: true; application: CampaignApplication } | { success: false; error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('add_campaign_guest', {
    p_campaign_id: campaignId,
    p_user_id: userId,
  });
  if (error) {
    return { success: false, error: error.message || 'Falha ao adicionar convidado.' };
  }
  const result = data as
    | { success: true; application: AppRow }
    | { success: false; error: string }
    | null;
  if (!result) return { success: false, error: 'Resposta inesperada do servidor.' };
  if (!result.success) return { success: false, error: result.error };
  return { success: true, application: toApp(result.application) };
}

/**
 * Remove um convidado (adicionado por engano) de uma campanha convite. Hard delete
 * da application + deliveries do usuário, via RPC remove_campaign_guest.
 */
export async function removeCampaignGuest(
  applicationId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('remove_campaign_guest', {
    p_application_id: applicationId,
  });
  if (error) {
    return { success: false, error: error.message || 'Falha ao remover convidado.' };
  }
  const result = data as { success: boolean; error?: string } | null;
  if (!result) return { success: false, error: 'Resposta inesperada do servidor.' };
  if (!result.success) return { success: false, error: result.error || 'Falha ao remover convidado.' };
  return { success: true };
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
  const patch: Record<string, unknown> = { status };
  // Ao tirar de 'approved' (voltar pra 'pending' ou 'rejected'), limpa estado
  // específico de aprovação (campos da migration 0015) para não vazar entre ciclos.
  if (status !== 'approved') {
    patch.joined_whatsapp_group = false;
    patch.joined_at = null;
    patch.disqualified_at = null;
    patch.disqualification_reason = null;
  }
  const { data } = await supabase
    .from('applications')
    .update(patch)
    .eq('id', applicationId)
    .select(A_SELECT)
    .single();
  return data ? toApp(data as AppRow) : null;
}

export async function withdrawApplication(applicationId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('applications')
    .delete()
    .eq('id', applicationId)
    .eq('status', 'pending');
}
