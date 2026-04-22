import { UserProfile, PixKeyType } from '@/types';
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
  };
}

const SELECT = 'id, email, full_name, whatsapp, photo_url, bio, instagram, instagram_followers, tiktok, tiktok_followers, cep, state, city, neighborhood, address, onboarding_complete, pix_key, pix_key_type';

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select(SELECT).eq('id', userId).single();
  return data ? toProfile(data as Row) : null;
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

  const { data: updated } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select(SELECT)
    .single();

  return updated ? toProfile(updated as Row) : null;
}
