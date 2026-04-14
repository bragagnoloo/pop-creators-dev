import { Lesson, LessonComment } from '@/types';
import { createClient } from '@/lib/supabase/client';

type LessonRow = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  youtube_url: string;
  created_at: string;
};

type CommentRow = {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: { full_name: string; photo_url: string | null; email: string } | null;
};

function toLesson(r: LessonRow): Lesson {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    thumbnailUrl: r.thumbnail_url,
    youtubeUrl: r.youtube_url,
    createdAt: r.created_at,
  };
}

const L_SELECT = 'id, title, description, thumbnail_url, youtube_url, created_at';

// ---------- Lessons CRUD ----------

export async function getAllLessons(): Promise<Lesson[]> {
  const supabase = createClient();
  const { data } = await supabase.from('lessons').select(L_SELECT).order('created_at', { ascending: false });
  if (!data) return [];
  return (data as LessonRow[]).map(toLesson);
}

export async function createLesson(data: Omit<Lesson, 'id' | 'createdAt'>): Promise<Lesson | null> {
  const supabase = createClient();
  const { data: inserted } = await supabase
    .from('lessons')
    .insert({
      title: data.title,
      description: data.description,
      thumbnail_url: data.thumbnailUrl,
      youtube_url: data.youtubeUrl,
    })
    .select(L_SELECT)
    .single();
  return inserted ? toLesson(inserted as LessonRow) : null;
}

export async function updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson | null> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;
  if (data.thumbnailUrl !== undefined) patch.thumbnail_url = data.thumbnailUrl;
  if (data.youtubeUrl !== undefined) patch.youtube_url = data.youtubeUrl;

  const { data: updated } = await supabase.from('lessons').update(patch).eq('id', id).select(L_SELECT).single();
  return updated ? toLesson(updated as LessonRow) : null;
}

export async function deleteLesson(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('lessons').delete().eq('id', id);
}

// ---------- YouTube helpers ----------

export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

// ---------- Watched ----------

export async function getWatchedIds(userId: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data } = await supabase.from('watched_lessons').select('lesson_id').eq('user_id', userId);
  return new Set((data || []).map(r => r.lesson_id));
}

export async function markWatched(userId: string, lessonId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('watched_lessons').upsert({ user_id: userId, lesson_id: lessonId });
}

export function isNew(lesson: Lesson, days = 7): boolean {
  const created = new Date(lesson.createdAt).getTime();
  return Date.now() - created <= days * 24 * 60 * 60 * 1000;
}

// ---------- Ratings ----------

export async function setRating(userId: string, lessonId: string, stars: 1 | 2 | 3 | 4 | 5): Promise<void> {
  const supabase = createClient();
  await supabase.from('lesson_ratings').upsert({ user_id: userId, lesson_id: lessonId, stars });
}

export async function getUserRating(userId: string, lessonId: string): Promise<number | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('lesson_ratings')
    .select('stars')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  return data?.stars ?? null;
}

export async function getLessonRatingSummary(lessonId: string): Promise<{ average: number; count: number }> {
  const supabase = createClient();
  const { data } = await supabase.from('lesson_ratings').select('stars').eq('lesson_id', lessonId);
  if (!data || data.length === 0) return { average: 0, count: 0 };
  const sum = data.reduce((acc, r) => acc + r.stars, 0);
  return { average: sum / data.length, count: data.length };
}

// ---------- Comments ----------

export async function getLessonComments(lessonId: string): Promise<LessonComment[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('lesson_comments')
    .select('id, lesson_id, user_id, content, created_at, author:profiles!user_id(full_name, photo_url, email)')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });
  if (!data) return [];
  return (data as unknown as CommentRow[]).map(r => ({
    id: r.id,
    lessonId: r.lesson_id,
    userId: r.user_id,
    content: r.content,
    createdAt: r.created_at,
    authorName: r.author?.full_name || r.author?.email || 'Usuário',
    authorPhoto: r.author?.photo_url ?? null,
  }));
}

export async function addComment(
  data: Omit<LessonComment, 'id' | 'createdAt'>
): Promise<LessonComment | null> {
  const supabase = createClient();
  const { data: inserted } = await supabase
    .from('lesson_comments')
    .insert({ lesson_id: data.lessonId, user_id: data.userId, content: data.content })
    .select('id, lesson_id, user_id, content, created_at, author:profiles!user_id(full_name, photo_url, email)')
    .single();
  if (!inserted) return null;
  const r = inserted as unknown as CommentRow;
  return {
    id: r.id,
    lessonId: r.lesson_id,
    userId: r.user_id,
    content: r.content,
    createdAt: r.created_at,
    authorName: r.author?.full_name || r.author?.email || 'Usuário',
    authorPhoto: r.author?.photo_url ?? null,
  };
}

export async function deleteComment(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('lesson_comments').delete().eq('id', id);
}
