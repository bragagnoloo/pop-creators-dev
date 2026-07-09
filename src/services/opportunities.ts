import type { SupabaseClient } from '@supabase/supabase-js';
import { Opportunity, OppCategory } from '@/types';
import { createClient } from '@/lib/supabase/client';

type OpportunityRow = {
  id: string;
  name: string;
  categories: OppCategory[];
  logo_url: string | null;
  short_desc: string;
  full_desc: string;
  url: string;
  position: number;
  published: boolean;
  created_at: string;
};

function toOpportunity(r: OpportunityRow): Opportunity {
  return {
    id: r.id,
    name: r.name,
    categories: r.categories ?? [],
    logoUrl: r.logo_url,
    shortDesc: r.short_desc,
    fullDesc: r.full_desc,
    url: r.url,
    position: r.position,
    published: r.published,
    createdAt: r.created_at,
  };
}

const O_SELECT =
  'id, name, categories, logo_url, short_desc, full_desc, url, position, published, created_at';

/**
 * Oportunidades publicadas, ordenadas por posição — usadas na página pública.
 * Aceita um client opcional (ex: admin client em Server Component). No browser,
 * o RLS já restringe a `published = true`.
 */
export async function getPublishedOpportunities(
  client?: SupabaseClient
): Promise<Opportunity[]> {
  const supabase = client ?? createClient();
  const { data } = await supabase
    .from('criarsemtigrinho_opportunities')
    .select(O_SELECT)
    .eq('published', true)
    .order('position', { ascending: true });
  return (data ?? []).map((r) => toOpportunity(r as OpportunityRow));
}

/** Todas as oportunidades (admin) — inclui não publicadas. */
export async function getAllOpportunities(): Promise<Opportunity[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('criarsemtigrinho_opportunities')
    .select(O_SELECT)
    .order('position', { ascending: true });
  return (data ?? []).map((r) => toOpportunity(r as OpportunityRow));
}

export async function createOpportunity(
  data: Omit<Opportunity, 'id' | 'createdAt' | 'position'>
): Promise<Opportunity | null> {
  const supabase = createClient();
  const { data: maxRow } = await supabase
    .from('criarsemtigrinho_opportunities')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = ((maxRow as OpportunityRow | null)?.position ?? 0) + 1;

  const { data: inserted } = await supabase
    .from('criarsemtigrinho_opportunities')
    .insert({
      name: data.name,
      categories: data.categories,
      logo_url: data.logoUrl,
      short_desc: data.shortDesc,
      full_desc: data.fullDesc,
      url: data.url,
      published: data.published,
      position: nextPosition,
    })
    .select(O_SELECT)
    .single();
  return inserted ? toOpportunity(inserted as OpportunityRow) : null;
}

export async function updateOpportunity(
  id: string,
  data: Partial<Omit<Opportunity, 'id' | 'createdAt'>>
): Promise<Opportunity | null> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.categories !== undefined) patch.categories = data.categories;
  if (data.logoUrl !== undefined) patch.logo_url = data.logoUrl;
  if (data.shortDesc !== undefined) patch.short_desc = data.shortDesc;
  if (data.fullDesc !== undefined) patch.full_desc = data.fullDesc;
  if (data.url !== undefined) patch.url = data.url;
  if (data.published !== undefined) patch.published = data.published;
  if (data.position !== undefined) patch.position = data.position;

  const { data: updated } = await supabase
    .from('criarsemtigrinho_opportunities')
    .update(patch)
    .eq('id', id)
    .select(O_SELECT)
    .single();
  return updated ? toOpportunity(updated as OpportunityRow) : null;
}

export async function deleteOpportunity(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('criarsemtigrinho_opportunities').delete().eq('id', id);
}
