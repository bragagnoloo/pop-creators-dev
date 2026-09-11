import { createClient } from '@/lib/supabase/client';

/**
 * Selos internos de identificação de creator (uso exclusivo do painel admin).
 *
 * Servem para a equipe decidir quem entra numa campanha. NÃO são visíveis ao
 * creator, e isso não depende da interface: a policy de leitura de `applications`
 * é `user_id = auth.uid() or is_any_admin()` (migration 0014), então o navegador
 * de um usuário comum não consegue buscar o histórico de terceiros nem se o
 * componente vazar para uma tela pública. Mesmo assim, não use estes selos em
 * CSV de exportação nem em e-mail — é por aí que rótulo interno escapa.
 *
 * Regras (definidas pela operação):
 *   nunca se candidatou  -> sem selo
 *   0 aprovações         -> Flop
 *   1 a 5 aprovações     -> Iniciante
 *   6 a 10 aprovações    -> Super
 *   11+ aprovações       -> Master
 *
 * "Novo" e "desclassificações" são selos independentes do tier: convivem com
 * qualquer um deles (um Master pode ser novo assinante e ter desclassificação).
 */

export type CreatorTier = 'flop' | 'iniciante' | 'super' | 'master';

export interface CreatorBadgeData {
  /** null = nunca se candidatou a nada; nesse caso não há selo de tier. */
  tier: CreatorTier | null;
  applicationCount: number;
  approvedCount: number;
  /** Aprovações que terminaram em desclassificação. Selo próprio, não afeta o tier. */
  disqualifiedCount: number;
  /** Menos de 30 dias desde a PRIMEIRA assinatura. Renovação não devolve o selo. */
  isNew: boolean;
}

type AppRow = {
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  disqualified_at: string | null;
};

const NOVO_DIAS = 30;

// Mesmo teto de 1000 linhas do PostgREST que getAllProfiles() contorna: um
// painel com muitos candidatos soma centenas de candidaturas históricas, e um
// corte silencioso faria o tier sair menor do que é.
const PAGE = 1000;

export function tierFor(approvedCount: number, applicationCount: number): CreatorTier | null {
  if (applicationCount === 0) return null;
  if (approvedCount === 0) return 'flop';
  if (approvedCount <= 5) return 'iniciante';
  if (approvedCount <= 10) return 'super';
  return 'master';
}

/**
 * Batch — histórico de candidaturas + data da primeira assinatura de vários
 * creators em duas queries (não uma por usuário). Mesmo formato de
 * subscriptions.getPlansForUsers: devolve Map por userId.
 *
 * Usuário sem entrada no Map = nunca se candidatou e nunca assinou.
 */
export async function getBadgesForUsers(userIds: string[]): Promise<Map<string, CreatorBadgeData>> {
  const map = new Map<string, CreatorBadgeData>();
  if (userIds.length === 0) return map;

  const supabase = createClient();

  const apps: AppRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('applications')
      .select('user_id, status, disqualified_at')
      .in('user_id', userIds)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    apps.push(...(data as AppRow[]));
    if (data.length < PAGE) break;
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_subscribed_at')
    .in('id', userIds);

  const limite = Date.now() - NOVO_DIAS * 24 * 60 * 60 * 1000;
  const novoPorUser = new Map<string, boolean>();
  for (const p of (profiles ?? []) as { id: string; first_subscribed_at: string | null }[]) {
    novoPorUser.set(
      p.id,
      !!p.first_subscribed_at && new Date(p.first_subscribed_at).getTime() >= limite,
    );
  }

  for (const userId of userIds) {
    map.set(userId, {
      tier: null,
      applicationCount: 0,
      approvedCount: 0,
      disqualifiedCount: 0,
      isNew: novoPorUser.get(userId) ?? false,
    });
  }

  for (const a of apps) {
    const cur = map.get(a.user_id);
    if (!cur) continue;
    cur.applicationCount++;
    if (a.status === 'approved') cur.approvedCount++;
    if (a.disqualified_at) cur.disqualifiedCount++;
  }

  for (const [, b] of map) {
    b.tier = tierFor(b.approvedCount, b.applicationCount);
  }

  return map;
}
