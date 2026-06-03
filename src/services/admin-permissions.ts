import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { AdminCampaignAssignment, AdminTab, Campaign, UserRole } from '@/types';

export interface CampaignAdminEntry {
  adminId: string;
  email: string;
  fullName: string;
  photoUrl: string | null;
  campaigns: Pick<Campaign, 'id' | 'title'>[];
  extraTabs: AdminTab[];
}

function mapAssignment(row: {
  admin_id: string;
  campaign_id: string;
  assigned_at: string;
  assigned_by: string | null;
}): AdminCampaignAssignment {
  return {
    adminId: row.admin_id,
    campaignId: row.campaign_id,
    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by,
  };
}

export async function getAdminAssignments(adminId: string): Promise<AdminCampaignAssignment[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('admin_campaign_assignments')
    .select('admin_id, campaign_id, assigned_at, assigned_by')
    .eq('admin_id', adminId);
  return (data ?? []).map(mapAssignment);
}

export async function getAssignedCampaignIds(adminId: string): Promise<string[]> {
  const assignments = await getAdminAssignments(adminId);
  return assignments.map(a => a.campaignId);
}

export async function getAllCampaignAdmins(): Promise<CampaignAdminEntry[]> {
  const supabase = await createAdminClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, photo_url, extra_admin_tabs')
    .eq('role', 'campaign_admin');

  if (!profiles || profiles.length === 0) return [];

  const adminIds = profiles.map(p => p.id);
  const { data: assignments } = await supabase
    .from('admin_campaign_assignments')
    .select('admin_id, campaign_id, campaigns(id, title)')
    .in('admin_id', adminIds);

  return profiles.map(profile => {
    const adminAssignments = (assignments ?? []).filter(a => a.admin_id === profile.id);
    const campaigns = adminAssignments
      .map(a => a.campaigns as unknown as { id: string; title: string } | null)
      .filter((c): c is { id: string; title: string } => c !== null);
    return {
      adminId: profile.id,
      email: profile.email,
      fullName: profile.full_name ?? '',
      photoUrl: profile.photo_url ?? null,
      campaigns,
      extraTabs: (profile.extra_admin_tabs ?? []) as AdminTab[],
    };
  });
}

export async function updateAdminExtraTabs(adminId: string, tabs: AdminTab[]): Promise<void> {
  const supabase = await createAdminClient();
  await supabase
    .from('profiles')
    .update({ extra_admin_tabs: tabs })
    .eq('id', adminId);
}

export async function assignCampaignToAdmin(
  adminId: string,
  campaignId: string,
  assignedBy: string
): Promise<void> {
  const supabase = await createAdminClient();
  await supabase
    .from('admin_campaign_assignments')
    .upsert({ admin_id: adminId, campaign_id: campaignId, assigned_by: assignedBy });
}

export async function removeCampaignFromAdmin(adminId: string, campaignId: string): Promise<void> {
  const supabase = await createAdminClient();
  await supabase
    .from('admin_campaign_assignments')
    .delete()
    .eq('admin_id', adminId)
    .eq('campaign_id', campaignId);
}

export async function updateAdminAssignments(
  adminId: string,
  campaignIds: string[],
  assignedBy: string
): Promise<void> {
  const supabase = await createAdminClient();
  await supabase
    .from('admin_campaign_assignments')
    .delete()
    .eq('admin_id', adminId);

  if (campaignIds.length > 0) {
    await supabase.from('admin_campaign_assignments').insert(
      campaignIds.map(campaign_id => ({
        admin_id: adminId,
        campaign_id,
        assigned_by: assignedBy,
      }))
    );
  }
}

export async function setAdminRole(userId: string, role: UserRole): Promise<void> {
  const supabase = await createAdminClient();
  await supabase.from('profiles').update({ role }).eq('id', userId);
}

export async function createCampaignAdmin(
  email: string,
  password: string,
  campaignIds: string[],
  assignedBy: string,
  extraTabs: AdminTab[] = []
): Promise<{ success: true; adminId: string } | { success: false; error: string }> {
  const supabase = await createAdminClient();

  // Verifica se o usuário já existe
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .maybeSingle();

  let adminId: string;

  if (existing) {
    adminId = existing.id;
    await supabase.from('profiles').update({ role: 'campaign_admin' }).eq('id', adminId);
  } else {
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !authData.user) {
      return { success: false, error: error?.message ?? 'Erro ao criar usuário.' };
    }
    adminId = authData.user.id;
    await supabase.from('profiles').update({ role: 'campaign_admin' }).eq('id', adminId);
  }

  await updateAdminAssignments(adminId, campaignIds, assignedBy);
  await updateAdminExtraTabs(adminId, extraTabs);
  return { success: true, adminId };
}

export async function revokeCampaignAdmin(adminId: string): Promise<void> {
  const supabase = await createAdminClient();
  await supabase
    .from('admin_campaign_assignments')
    .delete()
    .eq('admin_id', adminId);
  await supabase
    .from('profiles')
    .update({ role: 'creator', extra_admin_tabs: [] })
    .eq('id', adminId);
}

/**
 * Retorna as campanhas que o usuário logado pode gerenciar.
 * Para master admin retorna null (sem filtro — acessa todas).
 * Para campaign_admin retorna a lista de IDs atribuídos.
 */
export async function getCurrentAdminCampaignFilter(): Promise<string[] | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) return [];
  if (profile.role === 'admin') return null;

  const { data: assignments } = await supabase
    .from('admin_campaign_assignments')
    .select('campaign_id')
    .eq('admin_id', user.id);

  return (assignments ?? []).map(a => a.campaign_id);
}
