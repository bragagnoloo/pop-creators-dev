import { UserProfile, PixKeyType, PlanId } from '@/types';
import { createClient } from '@/lib/supabase/client';

type Row = {
  id: string;
  email: string;
  full_name: string;
  whatsapp: string;
  photo_url: string | null;
  bio: string;
  instagram: string;
  instagram_followers: string;
  tiktok: string;
  tiktok_followers: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  address: string;
  onboarding_complete: boolean;
  pix_key: string | null;
  pix_key_type: PixKeyType | null;
  pix_holder_name: string | null;
};

function toProfile(r: Row): UserProfile {
  return {
    userId: r.id,
    email: r.email,
    fullName: r.full_name,
    whatsapp: r.whatsapp,
    photoUrl: r.photo_url,
    bio: r.bio,
    instagram: r.instagram,
    instagramFollowers: r.instagram_followers,
    tiktok: r.tiktok,
    tiktokFollowers: r.tiktok_followers,
    cep: r.cep,
    state: r.state,
    city: r.city,
    neighborhood: r.neighborhood,
    address: r.address,
    onboardingComplete: r.onboarding_complete,
    pixKey: r.pix_key,
    pixKeyType: r.pix_key_type,
    pixHolderName: r.pix_holder_name,
  };
}

const SELECT = 'id, email, full_name, whatsapp, photo_url, bio, instagram, instagram_followers, tiktok, tiktok_followers, cep, state, city, neighborhood, address, onboarding_complete, pix_key, pix_key_type, pix_holder_name';

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select(SELECT).eq('id', userId).single();
  return data ? toProfile(data as Row) : null;
}

/**
 * Batch — busca múltiplos profiles em uma query. Retorna Map por userId.
 */
export async function getProfilesByIds(userIds: string[]): Promise<Map<string, UserProfile>> {
  if (userIds.length === 0) return new Map();
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select(SELECT).in('id', userIds);
  const map = new Map<string, UserProfile>();
  for (const r of (data ?? []) as Row[]) map.set(r.id, toProfile(r));
  return map;
}

// Limite pragmático para evitar full-table scans acidentais em admin views.
// Para listas maiores, paginar no UI (range/limit/offset).
const DEFAULT_LIST_LIMIT = 500;

export async function getAllProfiles(): Promise<UserProfile[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select(SELECT)
    .order('email')
    .limit(DEFAULT_LIST_LIMIT);
  if (!data) return [];
  return (data as Row[]).map(toProfile);
}

export type UserProfileWithPlan = UserProfile & { plan: PlanId };

/**
 * Como getAllProfiles + plano vigente em UMA query.
 * Substitui o padrão N+1 de chamar getUserPlan() por linha.
 *
 * Nota: subscriptions.user_id é PRIMARY KEY (1:1 com profiles), então o
 * PostgREST retorna `subscriptions` como objeto único — não como array.
 */
export async function getAllProfilesWithPlans(): Promise<UserProfileWithPlan[]> {
  const supabase = createClient();
  const now = Date.now();
  type SubShape = { plan: PlanId; expires_at: string | null };
  type RowWithSub = Row & { subscriptions: SubShape | SubShape[] | null };
  // Pagina por range() para furar o teto de 1000 linhas do PostgREST e trazer
  // TODOS os perfis. Busca/filtros são aplicados client-side no admin.
  const PAGE = 1000;
  const rows: RowWithSub[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`${SELECT}, subscriptions(plan, expires_at)`)
      .order('email')
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as unknown as RowWithSub[]));
    if (data.length < PAGE) break;
  }
  return rows.map(r => {
    const sub: SubShape | null = Array.isArray(r.subscriptions)
      ? r.subscriptions[0] ?? null
      : r.subscriptions;
    let plan: PlanId = 'free';
    if (sub) {
      const expired = sub.expires_at && new Date(sub.expires_at).getTime() < now;
      plan = expired ? 'free' : sub.plan;
    }
    return { ...toProfile(r), plan };
  });
}

export async function updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | null> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (data.fullName !== undefined) patch.full_name = data.fullName;
  if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp;
  if (data.photoUrl !== undefined) patch.photo_url = data.photoUrl;
  if (data.bio !== undefined) patch.bio = data.bio;
  if (data.instagram !== undefined) patch.instagram = data.instagram;
  if (data.instagramFollowers !== undefined) patch.instagram_followers = data.instagramFollowers;
  if (data.tiktok !== undefined) patch.tiktok = data.tiktok;
  if (data.tiktokFollowers !== undefined) patch.tiktok_followers = data.tiktokFollowers;
  if (data.cep !== undefined) patch.cep = data.cep;
  if (data.state !== undefined) patch.state = data.state;
  if (data.city !== undefined) patch.city = data.city;
  if (data.neighborhood !== undefined) patch.neighborhood = data.neighborhood;
  if (data.address !== undefined) patch.address = data.address;
  if (data.onboardingComplete !== undefined) patch.onboarding_complete = data.onboardingComplete;
  if (data.pixKey !== undefined) patch.pix_key = data.pixKey;
  if (data.pixKeyType !== undefined) patch.pix_key_type = data.pixKeyType;
  if (data.pixHolderName !== undefined) patch.pix_holder_name = data.pixHolderName;

  const { data: updated } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select(SELECT)
    .single();

  return updated ? toProfile(updated as Row) : null;
}
