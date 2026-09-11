import { createClient } from '@/lib/supabase/client';

/**
 * Agenda de publicações do creator em TODAS as campanhas — uso do painel admin
 * na Etapa 05, para o gestor não marcar horário em cima de outro post do mesmo
 * creator.
 *
 * Vem de RPC (migration 0038) e não de `campaign_deliveries` direto porque a
 * policy de leitura da tabela é `can_manage_campaign(campaign_id)`: um
 * campaign_admin só enxerga as campanhas atribuídas a ele e veria a agenda quase
 * vazia — um falso "sem conflito", pior do que não ter a informação. A RPC é
 * security definer e devolve o mesmo conjunto de horários para qualquer admin,
 * mascarando só o TÍTULO das campanhas que a pessoa não gerencia.
 */

export interface ScheduledPublication {
  userId: string;
  deliveryId: string;
  campaignId: string;
  /** 'Outra campanha' quando quem consulta não gerencia a campanha. */
  campaignTitle: string;
  canViewCampaign: boolean;
  deliveryIndex: number;
  publicationDate: string;
  publicationPlatforms: string[];
}

type Row = {
  user_id: string;
  delivery_id: string;
  campaign_id: string;
  campaign_title: string;
  can_view_campaign: boolean;
  delivery_index: number;
  publication_date: string;
  publication_platforms: string[] | null;
};

/** Choque direto: menos de 2h entre publicações. */
export const HORAS_CONFLITO_GRAVE = 2;
/** Mesmo dia: menos de 24h. */
export const HORAS_CONFLITO_AVISO = 24;

export type ConflictLevel = 'none' | 'warn' | 'severe';

/**
 * Agenda de vários creators em uma chamada. Map por userId, já ordenado por data.
 * Usuário sem publicação agendada não entra no Map.
 */
export async function getScheduleForUsers(
  userIds: string[],
): Promise<Map<string, ScheduledPublication[]>> {
  const map = new Map<string, ScheduledPublication[]>();
  if (userIds.length === 0) return map;

  const supabase = createClient();
  const { data } = await supabase.rpc('get_creator_publication_schedule', {
    p_user_ids: userIds,
  });

  for (const r of (data ?? []) as Row[]) {
    const item: ScheduledPublication = {
      userId: r.user_id,
      deliveryId: r.delivery_id,
      campaignId: r.campaign_id,
      campaignTitle: r.campaign_title,
      canViewCampaign: r.can_view_campaign,
      deliveryIndex: r.delivery_index,
      publicationDate: r.publication_date,
      publicationPlatforms: r.publication_platforms ?? [],
    };
    const list = map.get(r.user_id) ?? [];
    list.push(item);
    map.set(r.user_id, list);
  }

  for (const [, list] of map) {
    list.sort(
      (a, b) => new Date(a.publicationDate).getTime() - new Date(b.publicationDate).getTime(),
    );
  }
  return map;
}

/**
 * Publicações que conflitam com a data escolhida, da mais próxima para a mais
 * distante. `excludeDeliveryId` tira da conta a própria entrega sendo editada —
 * senão ela sempre conflitaria consigo mesma ao reabrir a tela.
 */
export function findConflicts(
  date: Date,
  schedule: ScheduledPublication[],
  excludeDeliveryId: string,
): { level: ConflictLevel; items: { item: ScheduledPublication; diffHours: number }[] } {
  const alvo = date.getTime();
  if (!Number.isFinite(alvo)) return { level: 'none', items: [] };

  const items = schedule
    .filter(s => s.deliveryId !== excludeDeliveryId)
    .map(item => ({
      item,
      diffHours: Math.abs(new Date(item.publicationDate).getTime() - alvo) / 3_600_000,
    }))
    .filter(x => x.diffHours < HORAS_CONFLITO_AVISO)
    .sort((a, b) => a.diffHours - b.diffHours);

  if (items.length === 0) return { level: 'none', items: [] };
  const level: ConflictLevel = items[0].diffHours < HORAS_CONFLITO_GRAVE ? 'severe' : 'warn';
  return { level, items };
}

/** "29 min" / "1h20" / "22h" — intervalo legível para o aviso. */
export function formatInterval(diffHours: number): string {
  const min = Math.round(diffHours * 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

export function formatPublicationDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
