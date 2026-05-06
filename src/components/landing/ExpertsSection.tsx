'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

type ExpertLesson = {
  id: string;
  title: string;
  expert: string;
  thumbnail_url: string | null;
  description: string;
};

type ExpertData = {
  name: string;
  thumbnail_url: string | null;
  lessonCount: number;
  featuredTitle: string;
};

function groupByExpert(lessons: ExpertLesson[]): ExpertData[] {
  const map = new Map<string, ExpertData>();
  for (const lesson of lessons) {
    if (!map.has(lesson.expert)) {
      map.set(lesson.expert, {
        name: lesson.expert,
        thumbnail_url: lesson.thumbnail_url,
        lessonCount: 1,
        featuredTitle: lesson.title,
      });
    } else {
      map.get(lesson.expert)!.lessonCount++;
    }
  }
  return Array.from(map.values());
}

const PLACEHOLDER_GRADIENTS = [
  'from-popline-magenta/40 via-popline-pink/20 to-popline-light/10',
  'from-purple-700/40 via-popline-magenta/20 to-popline-pink/10',
  'from-popline-pink/40 via-purple-600/20 to-popline-magenta/10',
  'from-indigo-700/40 via-popline-magenta/20 to-purple-500/10',
];

export default function ExpertsSection({ lessons }: { lessons: ExpertLesson[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const experts = groupByExpert(lessons);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [updateScrollState]);

  if (experts.length === 0) return null;

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    const card = el?.querySelector<HTMLElement>('[data-expert-card]');
    el?.scrollBy({ left: dir === 'left' ? -((card?.offsetWidth ?? 208) + 16) : (card?.offsetWidth ?? 208) + 16, behavior: 'smooth' });
  };

  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-popline-pink/30 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-popline-magenta/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header — centralizado */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-popline-pink mb-3">
          Aprenda com referências
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
          Aulas com quem{' '}
          <span className="gradient-text">entende do mercado</span>
        </h2>
        <p className="text-text-secondary text-base sm:text-lg max-w-xl mx-auto">
          Experts do universo musical, criativo e de marketing digital — conteúdo exclusivo para você crescer.
        </p>

        {/* Setas centralizadas abaixo do título */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            type="button"
            onClick={() => scrollBy('left')}
            disabled={!canScrollLeft}
            aria-label="Anterior"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:border-popline-pink/30 hover:text-popline-pink"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollBy('right')}
            disabled={!canScrollRight}
            aria-label="Próximo"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:border-popline-pink/30 hover:text-popline-pink"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Carousel — centralizado por max-width */}
      <div className="max-w-6xl mx-auto relative px-4 sm:px-6 lg:px-8">
        {/* Fade esquerda */}
        <div
          className="absolute left-4 sm:left-6 lg:left-8 top-0 bottom-0 w-10 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity duration-300"
          style={{ opacity: canScrollLeft ? 1 : 0 }}
        />
        {/* Fade direita */}
        <div
          className="absolute right-4 sm:right-6 lg:right-8 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity duration-300"
          style={{ opacity: canScrollRight ? 1 : 0 }}
        />

        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          {experts.map((expert, i) => (
            <div
              key={expert.name}
              data-expert-card
              className="flex-none w-44 sm:w-52 md:w-56 lg:w-60 snap-start"
            >
              <ExpertCard expert={expert} index={i} />
            </div>
          ))}
          <div className="flex-none w-1 shrink-0" aria-hidden />
        </div>
      </div>

      <p className="text-center text-sm text-text-secondary mt-10 px-4">
        Novos experts e aulas adicionados regularmente.{' '}
        <a href="#planos" className="text-popline-light hover:text-popline-pink transition-colors font-medium">
          Assine para acessar tudo →
        </a>
      </p>
    </section>
  );
}

function ExpertCard({ expert, index }: { expert: ExpertData; index: number }) {
  const gradient = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length];
  const initials = expert.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className="group relative rounded-2xl overflow-hidden bg-surface border border-border hover:border-popline-pink/30 transition-all duration-300 cursor-default"
      style={{ height: '280px' }}
    >
      {expert.thumbnail_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expert.thumbnail_url}
            alt={expert.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </>
      ) : (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
          <div className="absolute inset-0 grid-bg opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-black text-white/15 select-none">{initials}</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </>
      )}

      <div className="absolute top-3 left-3 z-10">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full gradient-bg text-white shadow-lg">
          Expert
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <p className="text-[11px] text-popline-light font-medium mb-0.5 line-clamp-1">{expert.featuredTitle}</p>
        <h3 className="text-sm font-bold text-text-primary leading-tight">{expert.name}</h3>
        <p className="text-[11px] text-text-secondary mt-1">
          {expert.lessonCount} {expert.lessonCount === 1 ? 'aula' : 'aulas'}
        </p>
      </div>

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ring-1 ring-inset ring-popline-pink/20 rounded-2xl" />
    </div>
  );
}
