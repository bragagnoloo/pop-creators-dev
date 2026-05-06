import { Workshop, WorkshopWithLessons, WorkshopStatus, Lesson } from '@/types';
import { createClient } from '@/lib/supabase/client';

type WorkshopRow = {
  id: string;
  title: string;
  expert: string | null;
  description: string;
  thumbnail_url: string | null;
  position: number;
  created_at: string;
  status: WorkshopStatus;
};

type LessonRow = {
  id: string;
  workshop_id: string;
  title: string;
  description: string;
  youtube_url: string;
  position: number;
  created_at: string;
};

function toWorkshop(r: WorkshopRow): Workshop {
  return {
    id: r.id,
    title: r.title,
    expert: r.expert,
    description: r.description,
    thumbnailUrl: r.thumbnail_url,
    position: r.position,
    createdAt: r.created_at,
    status: r.status ?? 'available',
  };
}

function toLesson(r: LessonRow): Lesson {
  return {
    id: r.id,
    workshopId: r.workshop_id,
    title: r.title,
    description: r.description,
    youtubeUrl: r.youtube_url,
    position: r.position,
    createdAt: r.created_at,
  };
}

const W_SELECT = 'id, title, expert, description, thumbnail_url, position, created_at, status';
const L_SELECT = 'id, workshop_id, title, description, youtube_url, position, created_at';

// ---------- Workshop CRUD ----------

export async function getAllWorkshops(): Promise<Workshop[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('workshops')
    .select(W_SELECT)
    .order('position', { ascending: true });
  return (data ?? []).map(r => toWorkshop(r as WorkshopRow));
}

export async function getWorkshopWithLessons(id: string): Promise<WorkshopWithLessons | null> {
  const supabase = createClient();
  const { data: wData } = await supabase
    .from('workshops')
    .select(W_SELECT)
    .eq('id', id)
    .single();
  if (!wData) return null;

  const { data: lData } = await supabase
    .from('lessons')
    .select(L_SELECT)
    .eq('workshop_id', id)
    .order('position', { ascending: true });

  return {
    ...toWorkshop(wData as WorkshopRow),
    lessons: (lData ?? []).map(r => toLesson(r as LessonRow)),
  };
}

export async function createWorkshop(
  data: Omit<Workshop, 'id' | 'createdAt' | 'position'>
): Promise<Workshop | null> {
  const supabase = createClient();
  const { data: maxRow } = await supabase
    .from('workshops')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = ((maxRow as WorkshopRow | null)?.position ?? 0) + 1;

  const { data: inserted } = await supabase
    .from('workshops')
    .insert({
      title: data.title,
      expert: data.expert,
      description: data.description,
      thumbnail_url: data.thumbnailUrl,
      status: data.status ?? 'available',
      position: nextPosition,
    })
    .select(W_SELECT)
    .single();
  return inserted ? toWorkshop(inserted as WorkshopRow) : null;
}

export async function updateWorkshop(
  id: string,
  data: Partial<Omit<Workshop, 'id' | 'createdAt'>>
): Promise<Workshop | null> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.expert !== undefined) patch.expert = data.expert;
  if (data.description !== undefined) patch.description = data.description;
  if (data.thumbnailUrl !== undefined) patch.thumbnail_url = data.thumbnailUrl;
  if (data.status !== undefined) patch.status = data.status;

  const { data: updated } = await supabase
    .from('workshops')
    .update(patch)
    .eq('id', id)
    .select(W_SELECT)
    .single();
  return updated ? toWorkshop(updated as WorkshopRow) : null;
}

export async function deleteWorkshop(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('workshops').delete().eq('id', id);
}

export async function reorderWorkshops(ids: string[]): Promise<void> {
  const supabase = createClient();
  await Promise.all(
    ids.map((id, index) =>
      supabase.from('workshops').update({ position: index + 1 }).eq('id', id)
    )
  );
}

// ---------- Lesson CRUD (dentro de uma workshop) ----------

export async function getLessonsForWorkshop(workshopId: string): Promise<Lesson[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('lessons')
    .select(L_SELECT)
    .eq('workshop_id', workshopId)
    .order('position', { ascending: true });
  return (data ?? []).map(r => toLesson(r as LessonRow));
}

export async function createLesson(
  workshopId: string,
  data: Pick<Lesson, 'title' | 'description' | 'youtubeUrl'>
): Promise<Lesson | null> {
  const supabase = createClient();
  const { data: maxRow } = await supabase
    .from('lessons')
    .select('position')
    .eq('workshop_id', workshopId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = ((maxRow as LessonRow | null)?.position ?? 0) + 1;

  const { data: inserted } = await supabase
    .from('lessons')
    .insert({
      workshop_id: workshopId,
      title: data.title,
      description: data.description,
      youtube_url: data.youtubeUrl,
      position: nextPosition,
    })
    .select(L_SELECT)
    .single();
  return inserted ? toLesson(inserted as LessonRow) : null;
}

export async function updateLesson(
  id: string,
  data: Partial<Pick<Lesson, 'title' | 'description' | 'youtubeUrl'>>
): Promise<Lesson | null> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;
  if (data.youtubeUrl !== undefined) patch.youtube_url = data.youtubeUrl;

  const { data: updated } = await supabase
    .from('lessons')
    .update(patch)
    .eq('id', id)
    .select(L_SELECT)
    .single();
  return updated ? toLesson(updated as LessonRow) : null;
}

export async function deleteLesson(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('lessons').delete().eq('id', id);
}

export async function reorderLessons(workshopId: string, ids: string[]): Promise<void> {
  const supabase = createClient();
  await Promise.all(
    ids.map((id, index) =>
      supabase
        .from('lessons')
        .update({ position: index + 1 })
        .eq('id', id)
        .eq('workshop_id', workshopId)
    )
  );
}
