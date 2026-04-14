import { Lesson, LessonRating, LessonComment } from '@/types';
import { getItem, setItem, generateId } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

function getLessons(): Lesson[] {
  return getItem<Lesson[]>(STORAGE_KEYS.LESSONS) || [];
}

function saveLessons(lessons: Lesson[]): void {
  setItem(STORAGE_KEYS.LESSONS, lessons);
}

export function getAllLessons(): Lesson[] {
  return getLessons().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createLesson(data: Omit<Lesson, 'id' | 'createdAt'>): Lesson {
  const lesson: Lesson = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  saveLessons([...getLessons(), lesson]);
  return lesson;
}

export function updateLesson(id: string, data: Partial<Lesson>): Lesson | null {
  const lessons = getLessons();
  const index = lessons.findIndex(l => l.id === id);
  if (index === -1) return null;
  lessons[index] = { ...lessons[index], ...data };
  saveLessons(lessons);
  return lessons[index];
}

export function deleteLesson(id: string): void {
  saveLessons(getLessons().filter(l => l.id !== id));
}

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

// --- Watched state (per user) ---

type WatchedMap = Record<string, string[]>; // userId -> [lessonId...]

function getWatchedMap(): WatchedMap {
  return getItem<WatchedMap>(STORAGE_KEYS.WATCHED_LESSONS) || {};
}

function saveWatchedMap(m: WatchedMap): void {
  setItem(STORAGE_KEYS.WATCHED_LESSONS, m);
}

export function getWatchedIds(userId: string): Set<string> {
  return new Set(getWatchedMap()[userId] || []);
}

export function markWatched(userId: string, lessonId: string): void {
  const map = getWatchedMap();
  const list = new Set(map[userId] || []);
  list.add(lessonId);
  map[userId] = Array.from(list);
  saveWatchedMap(map);
}

export function isNew(lesson: Lesson, days = 7): boolean {
  const created = new Date(lesson.createdAt).getTime();
  return Date.now() - created <= days * 24 * 60 * 60 * 1000;
}

// --- Ratings ---

function getRatings(): LessonRating[] {
  return getItem<LessonRating[]>(STORAGE_KEYS.LESSON_RATINGS) || [];
}

function saveRatings(list: LessonRating[]): void {
  setItem(STORAGE_KEYS.LESSON_RATINGS, list);
}

export function setRating(userId: string, lessonId: string, stars: 1 | 2 | 3 | 4 | 5): void {
  const all = getRatings();
  const idx = all.findIndex(r => r.userId === userId && r.lessonId === lessonId);
  const record: LessonRating = { userId, lessonId, stars, updatedAt: new Date().toISOString() };
  if (idx === -1) all.push(record);
  else all[idx] = record;
  saveRatings(all);
}

export function getUserRating(userId: string, lessonId: string): number | null {
  return getRatings().find(r => r.userId === userId && r.lessonId === lessonId)?.stars || null;
}

export function getLessonRatingSummary(lessonId: string): { average: number; count: number } {
  const ratings = getRatings().filter(r => r.lessonId === lessonId);
  if (ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((acc, r) => acc + r.stars, 0);
  return { average: sum / ratings.length, count: ratings.length };
}

// --- Comments ---

function getComments(): LessonComment[] {
  return getItem<LessonComment[]>(STORAGE_KEYS.LESSON_COMMENTS) || [];
}

function saveComments(list: LessonComment[]): void {
  setItem(STORAGE_KEYS.LESSON_COMMENTS, list);
}

export function getLessonComments(lessonId: string): LessonComment[] {
  return getComments()
    .filter(c => c.lessonId === lessonId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addComment(data: Omit<LessonComment, 'id' | 'createdAt'>): LessonComment {
  const comment: LessonComment = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  saveComments([...getComments(), comment]);
  return comment;
}

export function deleteComment(id: string): void {
  saveComments(getComments().filter(c => c.id !== id));
}
