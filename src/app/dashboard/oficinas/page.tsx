'use client';

import Image from 'next/image';
import Link from 'next/link';
import useSWR from 'swr';
import { useAuth } from '@/providers/AuthProvider';
import * as workshopService from '@/services/workshops';
import * as lessonService from '@/services/lessons';
import { ROUTES } from '@/lib/constants';

export default function OficinaListPage() {
  const { user } = useAuth();

  const { data: workshops = [] } = useSWR('workshops', workshopService.getAllWorkshops);
  const { data: watched } = useSWR(
    user ? ['watched', user.id] : null,
    ([, uid]) => lessonService.getWatchedIds(uid)
  );
  const { data: allLessons = [] } = useSWR('lessons', lessonService.getAllLessons);

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
    <div className="py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Oficinas</h1>
        <p className="text-sm text-text-secondary mt-1">{workshops.length} oficina{workshops.length !== 1 ? 's' : ''} disponíve{workshops.length !== 1 ? 'is' : 'l'}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {workshops.map(workshop => {
          const lessonsInWorkshop = allLessons.filter(l => l.workshopId === workshop.id);
          const watchedCount = lessonsInWorkshop.filter(l => watched?.has(l.id)).length;
          const total = lessonsInWorkshop.length;
          const progress = total > 0 ? Math.round((watchedCount / total) * 100) : 0;

          return (
            <Link
              key={workshop.id}
              href={`${ROUTES.OFICINAS}/${workshop.id}`}
              className="group block rounded-2xl overflow-hidden border border-border bg-surface hover:border-popline-pink/30 transition-all duration-300"
            >
              {/* Thumbnail */}
              <div className="relative w-full aspect-[4/5] bg-surface-hover overflow-hidden">
                {workshop.thumbnailUrl ? (
                  <Image
                    src={workshop.thumbnailUrl}
                    alt={workshop.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-text-secondary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30">
                  <div className="w-12 h-12 rounded-full bg-popline-pink flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                </div>

                {/* Progress bar */}
                {total > 0 && progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                    <div
                      className="h-full bg-popline-pink transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                {workshop.expert && (
                  <p className="text-[11px] text-popline-light font-medium mb-0.5 truncate">Com {workshop.expert}</p>
                )}
                <h3 className="text-sm font-semibold leading-snug line-clamp-2">{workshop.title}</h3>
                <p className="text-[11px] text-text-secondary mt-1">
                  {total} aula{total !== 1 ? 's' : ''}
                  {progress > 0 && ` · ${progress}%`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
