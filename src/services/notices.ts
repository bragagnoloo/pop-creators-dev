import { CampaignNotice, CampaignNoticeCounts } from '@/types';
import { createClient } from '@/lib/supabase/client';

type NoticeRow = {
  id: string;
  campaign_id: string;
  author_id: string;
  content: string;
  is_general: boolean;
  created_at: string;
};

type NoticeReadRow = { notice_id: string; user_id: string; read_at: string };
type NoticeRecipientRow = { notice_id: string; user_id: string };

const N_SELECT = 'id, campaign_id, author_id, content, is_general, created_at';

function toNotice(r: NoticeRow, isRead: boolean, readAt: string | null): CampaignNotice {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    authorId: r.author_id,
    content: r.content,
    isGeneral: r.is_general,
    createdAt: r.created_at,
    isRead,
    readAt,
  };
}

/**
 * Lista os avisos de uma campanha para o usuário atual. RLS já filtra
 * pra só retornar os que o usuário pode ver (geral se aprovado, ou direcionados).
 * Deriva isRead via join com campaign_notice_reads.
 */
export async function getCampaignNotices(campaignId: string, userId: string): Promise<CampaignNotice[]> {
  const supabase = createClient();
  const [noticesRes, readsRes] = await Promise.all([
    supabase
      .from('campaign_notices')
      .select(N_SELECT)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false }),
    supabase
      .from('campaign_notice_reads')
      .select('notice_id, read_at')
      .eq('user_id', userId),
  ]);

  const notices = (noticesRes.data || []) as NoticeRow[];
  const reads = new Map(
    ((readsRes.data || []) as Pick<NoticeReadRow, 'notice_id' | 'read_at'>[]).map(r => [r.notice_id, r.read_at])
  );

  return notices.map(n => toNotice(n, reads.has(n.id), reads.get(n.id) ?? null));
}

/**
 * Contagens de avisos lidos/não lidos por campanha, para os cards do dashboard.
 * Retorna apenas campanhas com pelo menos 1 aviso visível.
 */
export async function getCountsForUserCampaigns(
  userId: string,
  campaignIds: string[]
): Promise<Record<string, CampaignNoticeCounts>> {
  if (campaignIds.length === 0) return {};
  const supabase = createClient();

  const [noticesRes, readsRes] = await Promise.all([
    supabase
      .from('campaign_notices')
      .select('id, campaign_id')
      .in('campaign_id', campaignIds),
    supabase
      .from('campaign_notice_reads')
      .select('notice_id')
      .eq('user_id', userId),
  ]);

  const notices = (noticesRes.data || []) as { id: string; campaign_id: string }[];
  const readIds = new Set(((readsRes.data || []) as { notice_id: string }[]).map(r => r.notice_id));

  const counts: Record<string, CampaignNoticeCounts> = {};
  for (const id of campaignIds) counts[id] = { read: 0, unread: 0 };

  for (const n of notices) {
    if (!counts[n.campaign_id]) counts[n.campaign_id] = { read: 0, unread: 0 };
    if (readIds.has(n.id)) counts[n.campaign_id].read += 1;
    else counts[n.campaign_id].unread += 1;
  }

  return counts;
}

/**
 * Marca múltiplos avisos como lidos (upsert idempotente).
 */
export async function markNoticesAsRead(noticeIds: string[], userId: string): Promise<void> {
  if (noticeIds.length === 0) return;
  const supabase = createClient();
  const rows = noticeIds.map(id => ({ notice_id: id, user_id: userId }));
  await supabase.from('campaign_notice_reads').upsert(rows, { onConflict: 'notice_id,user_id' });
}

/**
 * Admin: cria um aviso. Usa RPC `create_notice` que valida admin e insere
 * notice + recipients numa transação atômica.
 */
export async function createNotice(args: {
  campaignId: string;
  content: string;
  isGeneral: boolean;
  recipientIds?: string[];
}): Promise<{ success: true; noticeId: string } | { success: false; error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('create_notice', {
    p_campaign_id: args.campaignId,
    p_content: args.content,
    p_is_general: args.isGeneral,
    p_recipient_ids: args.isGeneral ? [] : (args.recipientIds || []),
  });

  if (error) return { success: false, error: error.message || 'Falha ao criar aviso.' };
  return { success: true, noticeId: data as string };
}

/**
 * Admin: deleta um aviso (cascade remove recipients e reads).
 */
export async function deleteNotice(noticeId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('campaign_notices').delete().eq('id', noticeId);
}

/**
 * Admin: lista todos os avisos de uma campanha + contagem de leituras por aviso
 * + lista de destinatários (quando não é geral).
 */
export async function getCampaignNoticesAdmin(campaignId: string): Promise<CampaignNotice[]> {
  const supabase = createClient();
  const { data: noticesData } = await supabase
    .from('campaign_notices')
    .select(N_SELECT)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  const notices = (noticesData || []) as NoticeRow[];
  if (notices.length === 0) return [];

  const noticeIds = notices.map(n => n.id);

  const [readsRes, recipientsRes] = await Promise.all([
    supabase
      .from('campaign_notice_reads')
      .select('notice_id')
      .in('notice_id', noticeIds),
    supabase
      .from('campaign_notice_recipients')
      .select('notice_id, user_id')
      .in('notice_id', noticeIds),
  ]);

  const readCounts = new Map<string, number>();
  for (const r of (readsRes.data || []) as { notice_id: string }[]) {
    readCounts.set(r.notice_id, (readCounts.get(r.notice_id) || 0) + 1);
  }

  const recipientsByNotice = new Map<string, string[]>();
  for (const r of (recipientsRes.data || []) as NoticeRecipientRow[]) {
    const arr = recipientsByNotice.get(r.notice_id) || [];
    arr.push(r.user_id);
    recipientsByNotice.set(r.notice_id, arr);
  }

  return notices.map(n => ({
    ...toNotice(n, false, null),
    readCount: readCounts.get(n.id) || 0,
    recipients: recipientsByNotice.get(n.id) || [],
  }));
}
