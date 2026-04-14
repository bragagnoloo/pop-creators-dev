'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Lesson, LessonComment, UserProfile } from '@/types';
import * as lessonService from '@/services/lessons';
import * as userService from '@/services/users';
import * as subService from '@/services/subscriptions';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Paywall from '@/components/ui/Paywall';

type Filter = 'all' | 'unwatched' | 'new';

export default function AulasPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const load = useCallback(async () => {
    setLessons(await lessonService.getAllLessons());
    if (user) {
      setWatched(await lessonService.getWatchedIds(user.id));
      setProfile(await userService.getProfile(user.id));
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return lessons.filter(l => {
      if (term && !l.title.toLowerCase().includes(term) && !l.description.toLowerCase().includes(term)) {
        return false;
      }
      if (filter === 'unwatched' && watched.has(l.id)) return false;
      if (filter === 'new' && !lessonService.isNew(l)) return false;
      return true;
    });
  }, [lessons, watched, filter, search]);

  const hero = lessons[0] || null;
  const grid = hero ? filtered.filter(l => l.id !== hero.id) : filtered;

  const handlePlay = async (lesson: Lesson) => {
    if (user && !(await subService.isPaid(user.id))) {
      setPaywallOpen(true);
      return;
    }
    setExpandedId(prev => (prev === lesson.id ? null : lesson.id));
    if (user && !watched.has(lesson.id)) {
      await lessonService.markWatched(user.id, lesson.id);
      setWatched(prev => new Set(prev).add(lesson.id));
    }
  };

  const counts = {
    all: lessons.length,
    unwatched: lessons.filter(l => !watched.has(l.id)).length,
    new: lessons.filter(l => lessonService.isNew(l)).length,
  };

  if (lessons.length === 0) {
    return (
      <div className="py-8">
        <h1 className="text-2xl font-bold mb-2">Aulas</h1>
        <div className="mt-12 text-center py-16 rounded-2xl border border-dashed border-border">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-popline-pink/10 mb-4">
            <svg className="w-7 h-7 text-popline-pink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <p className="text-text-secondary">Nenhuma aula disponível ainda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      {/* Header + progress */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Aulas</h1>
          <p className="text-sm text-text-secondary mt-1">
            {watched.size} de {lessons.length} assistida{lessons.length !== 1 ? 's' : ''} ·{' '}
            <span className="text-popline-pink font-medium">
              {Math.round((watched.size / lessons.length) * 100)}% concluído
            </span>
          </p>
        </div>
        <div className="w-full sm:w-64 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full gradient-bg transition-all duration-500"
            style={{ width: `${(watched.size / lessons.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Hero or expanded hero */}
      {hero &&
        (expandedId === hero.id ? (
          <ExpandedLesson
            lesson={hero}
            user={user}
            profile={profile}
            onClose={() => setExpandedId(null)}
            highlight
          />
        ) : (
          <HeroLesson
            lesson={hero}
            watched={watched.has(hero.id)}
            isNew={lessonService.isNew(hero)}
            onPlay={() => handlePlay(hero)}
          />
        ))}

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
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

      {/* Grid */}
      {grid.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary text-sm">Nenhuma aula corresponde aos filtros.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {grid.map(lesson =>
            expandedId === lesson.id ? (
              <div key={lesson.id} className="sm:col-span-2 lg:col-span-3">
                <ExpandedLesson
                  lesson={lesson}
                  user={user}
                  profile={profile}
                  onClose={() => setExpandedId(null)}
                />
              </div>
            ) : (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                watched={watched.has(lesson.id)}
                isNew={lessonService.isNew(lesson)}
                onPlay={() => handlePlay(lesson)}
              />
            )
          )}
        </div>
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

// -----------------------------

function HeroLesson({
  lesson,
  watched,
  isNew,
  onPlay,
}: {
  lesson: Lesson;
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
      className="group relative w-full overflow-hidden rounded-3xl border border-border bg-surface text-left hover:border-popline-pink/40 transition-all"
    >
      <div className="grid md:grid-cols-[1.3fr_1fr] gap-0">
        <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden">
          {lesson.thumbnailUrl ? (
            <img
              src={lesson.thumbnailUrl}
              alt={lesson.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 gradient-bg opacity-40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-popline-pink/90 backdrop-blur flex items-center justify-center shadow-lg shadow-popline-pink/40 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </div>
          </div>

          <div className="absolute top-4 left-4 flex gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-popline-pink text-white">
              Em destaque
            </span>
            {isNew && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-amber-500 text-white">
                Novo
              </span>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8 flex flex-col justify-center">
          <p className="text-xs font-medium text-popline-pink uppercase tracking-wider mb-2">Aula em destaque</p>
          <h2 className="text-xl md:text-2xl font-bold mb-3">{lesson.title}</h2>
          <p className="text-sm text-text-secondary line-clamp-3 mb-5">{lesson.description}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-white text-sm font-semibold">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
              Assistir agora
            </span>
            {summary.count > 0 && (
              <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
                <Stars value={summary.average} size={14} />
                <span className="ml-1">{summary.average.toFixed(1)} · {summary.count}</span>
              </span>
            )}
            {watched && (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Assistida
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function LessonCard({
  lesson,
  watched,
  isNew,
  onPlay,
}: {
  lesson: Lesson;
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
      className="group flex flex-col text-left bg-surface border border-border rounded-2xl overflow-hidden hover:border-popline-pink/40 transition-all hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-background">
        {lesson.thumbnailUrl ? (
          <img
            src={lesson.thumbnailUrl}
            alt={lesson.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-popline-pink/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-popline-pink/40">
            <svg className="w-6 h-6 text-white translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </div>
        </div>

        <div className="absolute top-3 left-3 flex gap-1.5">
          {isNew && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-white">
              Novo
            </span>
          )}
        </div>
        {watched && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-green-500/90 backdrop-blur flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-1">
        <h3 className="font-semibold line-clamp-2">{lesson.title}</h3>
        <p className="text-xs text-text-secondary line-clamp-2">{lesson.description}</p>
        {summary.count > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Stars value={summary.average} size={12} />
            <span className="text-xs text-text-secondary">
              {summary.average.toFixed(1)} ({summary.count})
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

// -----------------------------

function ExpandedLesson({
  lesson,
  user,
  profile,
  onClose,
  highlight = false,
}: {
  lesson: Lesson;
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  onClose: () => void;
  highlight?: boolean;
}) {
  const embedUrl = lessonService.getYoutubeEmbedUrl(lesson.youtubeUrl);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll into view when opening
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div
      ref={ref}
      className={`rounded-3xl border bg-surface overflow-hidden scroll-mt-6 ${
        highlight ? 'border-popline-pink/40 shadow-lg shadow-popline-pink/10' : 'border-border'
      }`}
    >
      {/* Player */}
      <div className="relative aspect-video w-full bg-black">
        {embedUrl ? (
          <iframe
            src={`${embedUrl}?autoplay=1`}
            title={lesson.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary">
            Vídeo indisponível.
          </div>
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
        {/* Title + description */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold mb-2">{lesson.title}</h2>
          <p className="text-sm text-text-secondary whitespace-pre-line">{lesson.description}</p>
        </div>

        {/* Rating */}
        <RatingSection lessonId={lesson.id} userId={user?.id ?? null} />

        {/* Comments */}
        <CommentsSection lesson={lesson} user={user} profile={profile} />
      </div>
    </div>
  );
}

// -----------------------------

function RatingSection({ lessonId, userId }: { lessonId: string; userId: string | null }) {
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    lessonService.getLessonRatingSummary(lessonId).then(setSummary);
    if (userId) lessonService.getUserRating(userId, lessonId).then(setMyRating);
    else setMyRating(null);
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
            {myRating ? 'Sua avaliação salva — toque nas estrelas para mudar.' : 'Toque nas estrelas para avaliar.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1"
            onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHover(s)}
                onClick={() => handleSet(s as 1 | 2 | 3 | 4 | 5)}
                className="p-0.5 transition-transform hover:scale-110"
                aria-label={`Dar ${s} estrela${s > 1 ? 's' : ''}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`w-7 h-7 transition-colors ${
                    s <= display ? 'text-amber-400' : 'text-white/15'
                  }`}
                  fill="currentColor"
                >
                  <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.2L2 10l7.1-1.1z" />
                </svg>
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold leading-none">
              {summary.count > 0 ? summary.average.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-text-secondary">
              {summary.count} avaliaç{summary.count === 1 ? 'ão' : 'ões'}
            </p>
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
          <svg
            key={s}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={half ? 'text-amber-400/60' : filled ? 'text-amber-400' : 'text-white/15'}
            fill="currentColor"
          >
            <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.2L2 10l7.1-1.1z" />
          </svg>
        );
      })}
    </div>
  );
}

// -----------------------------

function CommentsSection({
  lesson,
  user,
  profile,
}: {
  lesson: Lesson;
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
}) {
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    setComments(await lessonService.getLessonComments(lesson.id));
  }, [lesson.id]);

  useEffect(() => {
    load();
  }, [load]);

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

      {/* New comment */}
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
            <Button size="sm" type="submit" disabled={!draft.trim()}>
              Publicar
            </Button>
          </div>
        </div>
      </form>

      {/* List */}
      {comments.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-4">
          Seja o primeiro a comentar nesta aula.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <Avatar src={c.authorPhoto} name={c.authorName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{c.authorName}</p>
                  <p className="text-xs text-text-secondary">
                    {formatRelative(c.createdAt)}
                  </p>
                  {user?.id === c.userId && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto text-xs text-text-secondary hover:text-red-400 transition-colors"
                    >
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
