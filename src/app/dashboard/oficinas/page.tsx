'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/providers/AuthProvider';
import { Workshop } from '@/types';
import * as workshopService from '@/services/workshops';
import * as lessonService from '@/services/lessons';
import { ROUTES } from '@/lib/constants';

type Filter = 'all' | 'inprogress' | 'new';

export default function OficinaListPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const { data: workshops = [] } = useSWR('workshops', workshopService.getAllWorkshops);
  const { data: watched } = useSWR(
    user ? ['watched', user.id] : null,
    ([, uid]) => lessonService.getWatchedIds(uid)
  );
  const { data: allLessons = [] } = useSWR('lessons', lessonService.getAllLessons);

  const enriched = useMemo(() => workshops.map(w => {
    const lessons = allLessons.filter(l => l.workshopId === w.id);
    const watchedCount = lessons.filter(l => watched?.has(l.id)).length;
    const total = lessons.length;
    const progress = total > 0 ? Math.round((watchedCount / total) * 100) : 0;
    const isNew = Date.now() - new Date(w.createdAt).getTime() <= 14 * 24 * 60 * 60 * 1000;
    return { ...w, lessons, watchedCount, total, progress, isNew };
  }), [workshops, allLessons, watched]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enriched.filter(w => {
      if (term && !w.title.toLowerCase().includes(term) && !(w.expert ?? '').toLowerCase().includes(term)) return false;
      if (filter === 'inprogress' && (w.progress === 0 || w.progress === 100)) return false;
      if (filter === 'new' && !w.isNew) return false;
      return true;
    });
  }, [enriched, filter, search]);

  const totalWatched = enriched.reduce((a, w) => a + w.watchedCount, 0);
  const totalLessons = enriched.reduce((a, w) => a + w.total, 0);

  const hero = enriched[0] ?? null;
  const grid = hero ? filtered.filter(w => w.id !== hero.id) : filtered;

  const counts = {
    all: enriched.length,
    inprogress: enriched.filter(w => w.progress > 0 && w.progress < 100).length,
    new: enriched.filter(w => w.isNew).length,
  };

  if (workshops.length === 0) {
    return (
      <div className="py-8">
        <h1 className="text-2xl font-bold mb-2">Oficinas</h1>
        <div className="mt-12 text-center py-16 rounded-2xl border border-dashed border-border">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-popline-pink/10 mb-4">
            <svg className="w-7 h-7 text-popline-pink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <p className="text-text-secondary">Nenhuma oficina disponível ainda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      {/* Header + progresso */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Oficinas</h1>
          {totalLessons > 0 && (
            <p className="text-sm text-text-secondary mt-1">
              {totalWatched} de {totalLessons} aula{totalLessons !== 1 ? 's' : ''} assistida{totalLessons !== 1 ? 's' : ''} ·{' '}
              <span className="text-popline-pink font-medium">
                {Math.round((totalWatched / totalLessons) * 100)}% concluído
              </span>
            </p>
          )}
        </div>
        <div className="w-full sm:w-64 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full gradient-bg transition-all duration-500"
            style={{ width: totalLessons > 0 ? `${(totalWatched / totalLessons) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Hero — primeira oficina em destaque */}
      {hero && (
        <Link
          href={`${ROUTES.OFICINAS}/${hero.id}`}
          className="group relative w-full overflow-hidden rounded-3xl border border-border bg-surface text-left hover:border-popline-pink/40 transition-all block"
        >
          <div className="grid md:grid-cols-[1.3fr_1fr] gap-0">
            <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden">
              {hero.thumbnailUrl ? (
                <Image
                  src={hero.thumbnailUrl}
                  alt={hero.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(min-width: 768px) 60vw, 100vw"
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
              <div className="absolute top-4 left-4">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-popline-pink text-white">
                  Em destaque
                </span>
              </div>
              {hero.progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                  <div className="h-full bg-popline-pink" style={{ width: `${hero.progress}%` }} />
                </div>
              )}
            </div>
            <div className="p-6 md:p-8 flex flex-col justify-center">
              {hero.expert && (
                <p className="text-xs font-medium text-popline-pink uppercase tracking-wider mb-2">Com {hero.expert}</p>
              )}
              <h2 className="text-xl md:text-2xl font-bold mb-2">{hero.title}</h2>
              <p className="text-sm text-text-secondary line-clamp-3 mb-5">{hero.description}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-white text-sm font-semibold">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="6 4 20 12 6 20 6 4" />
                  </svg>
                  Começar oficina
                </span>
                <span className="text-xs text-text-secondary">
                  {hero.total} aula{hero.total !== 1 ? 's' : ''}
                  {hero.progress > 0 && ` · ${hero.progress}% concluído`}
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Filtros + busca */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="inline-flex p-1 bg-white/5 border border-border rounded-xl self-start">
          {(['all', 'inprogress', 'new'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                filter === f ? 'bg-popline-pink text-white' : 'text-text-secondary hover:text-white'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'inprogress' ? 'Em andamento' : 'Novas'}
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
            placeholder="Buscar oficina..."
            className="bg-white/5 border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink w-full sm:w-64 transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      {grid.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary text-sm">Nenhuma oficina corresponde aos filtros.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {grid.map(workshop => (
            <WorkshopCard key={workshop.id} workshop={workshop} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkshopCard({ workshop }: {
  workshop: Workshop & { total: number; watchedCount: number; progress: number; isNew: boolean };
}) {
  return (
    <Link
      href={`${ROUTES.OFICINAS}/${workshop.id}`}
      className="group flex flex-col text-left bg-surface border border-border rounded-2xl overflow-hidden hover:border-popline-pink/40 transition-all hover:-translate-y-0.5"
    >
      <div className="relative w-full overflow-hidden bg-background" style={{ paddingBottom: '125%' }}>
        {workshop.thumbnailUrl ? (
          <Image
            src={workshop.thumbnailUrl}
            alt={workshop.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
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

        {workshop.isNew && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-white">
              Nova
            </span>
          </div>
        )}

        {workshop.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
            <div className="h-full bg-popline-pink transition-all" style={{ width: `${workshop.progress}%` }} />
          </div>
        )}

        {workshop.progress === 100 && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-green-500/90 backdrop-blur flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-1">
        {workshop.expert && (
          <p className="text-xs text-popline-light font-medium">Com {workshop.expert}</p>
        )}
        <h3 className="font-semibold line-clamp-2">{workshop.title}</h3>
        <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">{workshop.description}</p>
        <p className="text-xs text-text-secondary mt-1">
          {workshop.total} aula{workshop.total !== 1 ? 's' : ''}
          {workshop.progress > 0 && workshop.progress < 100 && ` · ${workshop.progress}% concluído`}
        </p>
      </div>
    </Link>
  );
}
