import { createClient } from '@/lib/supabase/client';
import type {
  CampaignStage,
  CampaignStageScheduleEntry,
  DeliverableStatus,
  PublicationStatus,
  StageBlocker,
  StageReadiness,
  StageTemporalStatus,
} from '@/types';

export type RpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type RawScheduleEntry = {
  stage: number;
  due_date: string;
  original_due_date: string;
  extended_at: string | null;
  extended_reason: string | null;
  completed_at: string | null;
  status: StageTemporalStatus;
};

type RawReadiness = {
  current_stage: number;
  next_stage: number | null;
  ready: boolean;
  blockers: StageBlocker[];
  schedule: RawScheduleEntry[];
};

function toScheduleEntry(r: RawScheduleEntry): CampaignStageScheduleEntry {
  return {
    stage: r.stage as CampaignStage,
    dueDate: r.due_date,
    originalDueDate: r.original_due_date,
    extendedAt: r.extended_at,
    extendedReason: r.extended_reason,
    completedAt: r.completed_at,
    status: r.status,
  };
}

function toReadiness(raw: RawReadiness): StageReadiness {
  return {
    currentStage: (raw.current_stage ?? 0) as CampaignStage,
    nextStage: raw.next_stage == null ? null : (raw.next_stage as CampaignStage),
    ready: !!raw.ready,
    blockers: Array.isArray(raw.blockers) ? raw.blockers : [],
    schedule: Array.isArray(raw.schedule) ? raw.schedule.map(toScheduleEntry) : [],
  };
}

function rpcFail(message: string | undefined, fallback: string) {
  return { success: false as const, error: message ?? fallback };
}

// ---------- Stage progression ----------

export async function getStageReadiness(
  campaignId: string
): Promise<RpcResult<StageReadiness>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('stage_readiness', { p_campaign_id: campaignId });
  if (error) return rpcFail(error.message, 'Erro ao consultar etapas');
  return { success: true, data: toReadiness(data as RawReadiness) };
}

export async function completeStage(
  campaignId: string,
  stage: number,
  note?: string
): Promise<RpcResult<{ completedStage: number; currentStage: number; status: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('complete_stage', {
    p_campaign_id: campaignId,
    p_stage: stage,
    p_note: note ?? null,
  });
  if (error) return rpcFail(error.message, 'Erro ao concluir etapa');
  const r = data as { completed_stage: number; current_stage: number; status: string };
  return {
    success: true,
    data: {
      completedStage: r.completed_stage,
      currentStage: r.current_stage,
      status: r.status,
    },
  };
}

export async function revertStage(
  campaignId: string,
  reason: string
): Promise<RpcResult<{ currentStage: number; status: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('revert_stage', {
    p_campaign_id: campaignId,
    p_reason: reason,
  });
  if (error) return rpcFail(error.message, 'Erro ao reverter etapa');
  const r = data as { current_stage: number; status: string };
  return { success: true, data: { currentStage: r.current_stage, status: r.status } };
}

// ---------- Schedule (deadlines) ----------

export async function setStageDeadline(
  campaignId: string,
  stage: number,
  dueDate: string,
  reason?: string
): Promise<RpcResult<{ changed: boolean; dueDate: string; status: StageTemporalStatus | null }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('set_stage_deadline', {
    p_campaign_id: campaignId,
    p_stage: stage,
    p_due_date: dueDate,
    p_reason: reason ?? null,
  });
  if (error) return rpcFail(error.message, 'Erro ao definir prazo');
  const r = data as { changed: boolean; due_date: string; status?: StageTemporalStatus };
  return {
    success: true,
    data: { changed: r.changed, dueDate: r.due_date, status: r.status ?? null },
  };
}

export async function initCampaignSchedule(
  campaignId: string,
  dates: string[]
): Promise<RpcResult<true>> {
  if (dates.length !== 9) {
    return { success: false, error: 'É necessário fornecer 9 datas (etapas 0..8).' };
  }
  const supabase = createClient();
  const { error } = await supabase.rpc('init_campaign_schedule', {
    p_campaign_id: campaignId,
    p_dates: dates,
  });
  if (error) return rpcFail(error.message, 'Erro ao iniciar cronograma');
  return { success: true, data: true };
}

// ---------- Selection / WhatsApp ----------

export async function markJoinedGroup(
  applicationId: string,
  joined: boolean
): Promise<RpcResult<{ joined: boolean }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('mark_joined_group', {
    p_application_id: applicationId,
    p_joined: joined,
  });
  if (error) return rpcFail(error.message, 'Erro ao marcar presença');
  const r = data as { joined: boolean };
  return { success: true, data: { joined: r.joined } };
}

// ---------- Deliverable review ----------

export async function setDeliverableStatus(
  deliveryId: string,
  status: DeliverableStatus,
  opts?: { note?: string; due?: string }
): Promise<RpcResult<{ status: DeliverableStatus }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('set_deliverable_status', {
    p_delivery_id: deliveryId,
    p_status: status,
    p_note: opts?.note ?? null,
    p_due: opts?.due ?? null,
  });
  if (error) return rpcFail(error.message, 'Erro ao atualizar entregável');
  const r = data as { status: DeliverableStatus };
  return { success: true, data: { status: r.status } };
}

// ---------- Publication ----------

export async function setPublicationSchedule(
  deliveryId: string,
  date: string,
  platform: string
): Promise<RpcResult<{ publicationDate: string; publicationPlatform: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('set_publication_schedule', {
    p_delivery_id: deliveryId,
    p_date: date,
    p_platform: platform,
  });
  if (error) return rpcFail(error.message, 'Erro ao agendar publicação');
  const r = data as { publication_date: string; publication_platform: string };
  return {
    success: true,
    data: { publicationDate: r.publication_date, publicationPlatform: r.publication_platform },
  };
}

export async function setPublicationStatus(
  deliveryId: string,
  status: PublicationStatus,
  due?: string
): Promise<RpcResult<{ status: PublicationStatus }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('set_publication_status', {
    p_delivery_id: deliveryId,
    p_status: status,
    p_due: due ?? null,
  });
  if (error) return rpcFail(error.message, 'Erro ao atualizar status da publicação');
  const r = data as { status: PublicationStatus };
  return { success: true, data: { status: r.status } };
}

// ---------- Disqualification ----------

export async function disqualifyParticipant(
  applicationId: string,
  reason: string
): Promise<RpcResult<{ disqualifiedAt: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('disqualify_participant', {
    p_application_id: applicationId,
    p_reason: reason,
  });
  if (error) return rpcFail(error.message, 'Erro ao desclassificar participante');
  const r = data as { disqualified_at: string };
  return { success: true, data: { disqualifiedAt: r.disqualified_at } };
}

// ---------- Stage labels (helper para UI) ----------

export const STAGE_LABELS: Record<CampaignStage, string> = {
  0: 'Abertura',
  1: 'Seleção',
  2: 'Briefing',
  3: 'Datas de entrega',
  4: 'Análise de entregáveis',
  5: 'Agenda de publicação',
  6: 'Análise de publicações',
  7: 'CSV para a marca',
  8: 'Relatório final',
};
