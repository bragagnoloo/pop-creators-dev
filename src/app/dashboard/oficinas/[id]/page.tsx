'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Lesson, LessonComment, UserProfile } from '@/types';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import * as workshopService from '@/services/workshops';
import * as lessonService from '@/services/lessons';
import * as userService from '@/services/users';
import * as subService from '@/services/subscriptions';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Paywall from '@/components/ui/Paywall';
import { ROUTES } from '@/lib/constants';

type Filter = 'all' | 'unwatched' | 'new';

export default function OficinaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [watched, setWatched] = useState<Set<string>>(new Set());

  const { data: workshop } = useSWR(
    id ? ['workshop', id] : null,
    ([, wid]) => workshopService.getWorkshopWithLessons(wid)
  );
  const { data: profile } = useSWR(
    user ? ['profile', user.id] : null,
    ([, uid]) => userService.getProfile(uid)
  );
  const { data: watchedData } = useSWR(
    user ? ['watched', user.id] : null,
    ([, uid]) => lessonService.getWatchedIds(uid)
  );

  useEffect(() => {
    if (watchedData) setWatched(watchedData);
  }, [watchedData]);

  const lessons = workshop?.lessons ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return lessons.filter(l => {
      if (term && !l.title.toLowerCase().includes(term) && !l.description.toLowerCase().includes(term)) return false;
      if (filter === 'unwatched' && watched.has(l.id)) return false;
      if (filter === 'new' && !lessonService.isNew(l)) return false;
      return true;
    });
  }, [lessons, watched, filter, search]);

  const handlePlay = async (lesson: Lesson) => {
    if (user && !(await subService.isPaid(user.id))) {
      setPaywallOpen(true);
      return;
    }
    setExpandedId(prev => (prev === lesson.id ? null : lesson.id));
    if (user && lesson.youtubeUrl && !watched.has(lesson.id)) {
      await lessonService.markWatched(user.id, lesson.id);
      setWatched(prev => new Set(prev).add(lesson.id));
    }
  };

  const counts = {
    all: lessons.length,
    unwatched: lessons.filter(l => !watched.has(l.id)).length,
    new: lessons.filter(l => lessonService.isNew(l)).length,
  };

  const watchedCount = lessons.filter(l => watched.has(l.id)).length;

  if (!workshop) {
    return (
      <div className="py-8">
        <div className="h-6 w-48 bg-white/5 rounded animate-pulse mb-4" />
        <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      {/* Breadcrumb */}
      <Link href={ROUTES.OFICINAS} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Oficinas
      </Link>

      {/* Workshop header */}
      <div className="flex flex-col sm:flex-row gap-5 p-5 rounded-3xl border border-border bg-surface">
        {workshop.thumbnailUrl && (
          <div className="relative w-full sm:w-40 aspect-[4/5] rounded-2xl overflow-hidden shrink-0">
            <Image
              src={workshop.thumbnailUrl}
              alt={workshop.title}
              fill
              className="object-cover"
              sizes="(min-width: 640px) 160px, 100vw"
            />
          </div>
        )}
        <div className="flex flex-col justify-center">
          {workshop.expert && (
            <p className="text-sm text-popline-light font-medium mb-1">Com {workshop.expert}</p>
          )}
          <h1 className="text-2xl font-bold mb-2">{workshop.title}</h1>
          <p className="text-sm text-text-secondary mb-3 line-clamp-3">{workshop.description}</p>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span>{lessons.length} aula{lessons.length !== 1 ? 's' : ''}</span>
            {lessons.length > 0 && (
              <>
                <span>·</span>
                <span className="text-popline-pink font-medium">
                  {watchedCount}/{lessons.length} assistida{lessons.length !== 1 ? 's' : ''}
                  {' '}({Math.round((watchedCount / lessons.length) * 100)}%)
                </span>
              </>
            )}
          </div>
          {lessons.length > 0 && (
            <div className="mt-3 h-1.5 w-full sm:w-64 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full gradient-bg transition-all duration-500"
                style={{ width: `${(watchedCount / lessons.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <p className="text-text-secondary">Nenhuma aula disponível nesta oficina ainda.</p>
        </div>
      ) : (
        <>
          {/* Filters + search */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="inline-flex p-1 bg-white/5 border border-border rounded-xl self-start">
              {(['all', 'unwatched', 'new'] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    filter === f ? 'bg-popline-pink text-white' : 'text-text-secondary hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'Todas' : f === 'unwatched' ? 'Não assistidas' : 'Novas'}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20' : 'bg-white/5'}`}>
                    {counts[f]}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar aula..."
                className="bg-white/5 border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink w-full sm:w-64 transition-colors"
              />
            </div>
          </div>

          {/* Aulas */}
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary text-sm">Nenhuma aula corresponde aos filtros.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((lesson, idx) =>
                expandedId === lesson.id ? (
                  <ExpandedLesson
                    key={lesson.id}
                    lesson={lesson}
                    workshopThumbnail={workshop.thumbnailUrl}
                    user={user}
                    profile={profile ?? null}
                    onClose={() => setExpandedId(null)}
                  />
                ) : (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    index={idx + 1}
                    watched={watched.has(lesson.id)}
                    isNew={lessonService.isNew(lesson)}
                    onPlay={() => handlePlay(lesson)}
                  />
                )
              )}
            </div>
          )}
        </>
      )}

      <Paywall
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="Assistir aulas"
        description="Para assistir às aulas você precisa ter um plano ativo."
      />
    </div>
  );
}

// ---------- LessonRow ----------
function LessonRow({
  lesson,
  index,
  watched,
  isNew,
  onPlay,
}: {
  lesson: Lesson;
  index: number;
  watched: boolean;
  isNew: boolean;
  onPlay: () => void;
}) {
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  useEffect(() => {
    lessonService.getLessonRatingSummary(lesson.id).then(setSummary);
  }, [lesson.id]);

  return (
    <button
      onClick={onPlay}
      className="group w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-surface text-left hover:border-popline-pink/30 transition-all duration-200 hover:bg-surface-hover"
    >
      {/* Number / check */}
      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold border border-border group-hover:border-popline-pink/30 transition-colors">
        {watched ? (
          <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className="text-text-secondary">{index}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-semibold truncate">{lesson.title}</h3>
          {isNew && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-white shrink-0">
              Novo
            </span>
          )}
        </div>
        {lesson.description && (
          <p className="text-xs text-text-secondary line-clamp-1">{lesson.description}</p>
        )}
        {summary.count > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Stars value={summary.average} size={11} />
            <span className="text-xs text-text-secondary">{summary.average.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Play icon */}
      <div className="shrink-0 w-9 h-9 rounded-full bg-white/5 group-hover:bg-popline-pink/20 flex items-center justify-center transition-colors">
        {lesson.youtubeUrl ? (
          <svg className="w-4 h-4 text-text-secondary group-hover:text-popline-pink transition-colors translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 4 20 12 6 20 6 4" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        )}
      </div>
    </button>
  );
}

// ---------- ExpandedLesson ----------
function ExpandedLesson({
  lesson,
  workshopThumbnail,
  user,
  profile,
  onClose,
}: {
  lesson: Lesson;
  workshopThumbnail: string | null;
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  onClose: () => void;
}) {
  const embedUrl = lessonService.getYoutubeEmbedUrl(lesson.youtubeUrl);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-3xl border border-popline-pink/30 bg-surface overflow-hidden scroll-mt-6 shadow-lg shadow-popline-pink/5"
    >
      <div className="relative aspect-video w-full bg-black">
        {embedUrl ? (
          <iframe
            src={`${embedUrl}?autoplay=1`}
            title={lesson.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : workshopThumbnail ? (
          <Image src={workshopThumbnail} alt={lesson.title} fill className="object-cover opacity-40" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm">Em breve.</div>
        )}
        <button
          onClick={onClose}
          aria-label="Recolher"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/70 backdrop-blur text-white hover:bg-black transition-colors flex items-center justify-center text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-1">{lesson.title}</h2>
          {lesson.description && (
            <p className="text-sm text-text-secondary whitespace-pre-line">{lesson.description}</p>
          )}
        </div>
        <RatingSection lessonId={lesson.id} userId={user?.id ?? null} />
        <CommentsSection lesson={lesson} user={user} profile={profile} />
      </div>
    </div>
  );
}

// ---------- Rating ----------
function RatingSection({ lessonId, userId }: { lessonId: string; userId: string | null }) {
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hover, setHover] = useState(0);

  useLoadOnMount(async () => {
    setSummary(await lessonService.getLessonRatingSummary(lessonId));
    if (userId) setMyRating(await lessonService.getUserRating(userId, lessonId));
  }, [lessonId, userId]);

  const handleSet = async (stars: 1 | 2 | 3 | 4 | 5) => {
    if (!userId) return;
    await lessonService.setRating(userId, lessonId, stars);
    setMyRating(stars);
    setSummary(await lessonService.getLessonRatingSummary(lessonId));
  };

  const display = hover || myRating || 0;

  return (
    <div className="p-4 rounded-2xl bg-background border border-border">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold mb-1">Como você avalia esta aula?</p>
          <p className="text-xs text-text-secondary">
            {myRating ? 'Avaliação salva — toque nas estrelas para mudar.' : 'Toque nas estrelas para avaliar.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onMouseEnter={() => setHover(s)} onClick={() => handleSet(s as 1 | 2 | 3 | 4 | 5)} className="p-0.5 transition-transform hover:scale-110">
                <svg viewBox="0 0 24 24" className={`w-7 h-7 transition-colors ${s <= display ? 'text-amber-400' : 'text-white/15'}`} fill="currentColor">
                  <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.2L2 10l7.1-1.1z" />
                </svg>
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold leading-none">{summary.count > 0 ? summary.average.toFixed(1) : '—'}</p>
            <p className="text-xs text-text-secondary">{summary.count} avaliaç{summary.count === 1 ? 'ão' : 'ões'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => {
        const filled = value >= s - 0.25;
        const half = !filled && value >= s - 0.75;
        return (
          <svg key={s} width={size} height={size} viewBox="0 0 24 24" className={half ? 'text-amber-400/60' : filled ? 'text-amber-400' : 'text-white/15'} fill="currentColor">
            <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.2L2 10l7.1-1.1z" />
          </svg>
        );
      })}
    </div>
  );
}

// ---------- Comments ----------
function CommentsSection({ lesson, user, profile }: { lesson: Lesson; user: { id: string; email: string } | null; profile: UserProfile | null }) {
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    setComments(await lessonService.getLessonComments(lesson.id));
  }, [lesson.id]);

  useLoadOnMount(load, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !draft.trim()) return;
    await lessonService.addComment({
      lessonId: lesson.id,
      userId: user.id,
      authorName: profile?.fullName || user.email,
      authorPhoto: profile?.photoUrl ?? null,
      content: draft.trim(),
    });
    setDraft('');
    load();
  };

  const handleDelete = async (id: string) => {
    await lessonService.deleteComment(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h3 className="font-semibold">Comentários ({comments.length})</h3>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3 mb-5">
        <Avatar src={profile?.photoUrl} name={profile?.fullName || user?.email || ''} size="sm" />
        <div className="flex-1 space-y-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Deixe seu comentário sobre a aula..."
            rows={2}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink transition-colors resize-none"
          />
          <div className="flex justify-end">
            <Button size="sm" type="submit" disabled={!draft.trim()}>Publicar</Button>
          </div>
        </div>
      </form>
      {comments.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-4">Seja o primeiro a comentar nesta aula.</p>
      ) : (
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <Avatar src={c.authorPhoto} name={c.authorName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{c.authorName}</p>
                  <p className="text-xs text-text-secondary">{formatRelative(c.createdAt)}</p>
                  {user?.id === c.userId && (
                    <button onClick={() => handleDelete(c.id)} className="ml-auto text-xs text-text-secondary hover:text-red-400 transition-colors">
                      Excluir
                    </button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-line mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}
