'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Opportunity, OppCategory } from '@/types';
import { pixelViewContent } from '@/lib/pixel';

const CATEGORY_LABEL: Record<OppCategory, string> = {
  freelance: 'Freelance',
  agencias: 'Agências',
  plataformas: 'Plataformas',
  marcas: 'Campanhas com Marcas',
  ugc: 'UGC',
  afiliados: 'Afiliados',
};

type Filter = 'todas' | OppCategory;

const FILTER_ORDER: OppCategory[] = ['freelance', 'agencias', 'plataformas', 'marcas', 'ugc', 'afiliados'];

export default function OpportunitiesExplorer({ opportunities }: { opportunities: Opportunity[] }) {
  const [filter, setFilter] = useState<Filter>('todas');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    pixelViewContent({ content_name: 'Criar Sem Tigrinho' });
  }, []);

  // Só mostra chips de categorias que realmente têm itens.
  const availableCategories = useMemo(() => {
    const present = new Set(opportunities.flatMap((o) => o.categories));
    return FILTER_ORDER.filter((c) => present.has(c));
  }, [opportunities]);

  const filtered = useMemo(
    () => (filter === 'todas' ? opportunities : opportunities.filter((o) => o.categories.includes(filter))),
    [opportunities, filter]
  );

  if (opportunities.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center">
        <p className="text-text-secondary">Novas oportunidades chegando em breve. 👀</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filtro de categorias */}
      {availableCategories.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <FilterChip active={filter === 'todas'} onClick={() => { setFilter('todas'); setOpenId(null); }}>
            Todas
          </FilterChip>
          {availableCategories.map((c) => (
            <FilterChip key={c} active={filter === c} onClick={() => { setFilter(c); setOpenId(null); }}>
              {CATEGORY_LABEL[c]}
            </FilterChip>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {filtered.map((o) => (
          <OpportunityCard
            key={o.id}
            opportunity={o}
            open={openId === o.id}
            onToggle={() => setOpenId((prev) => (prev === o.id ? null : o.id))}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all cursor-pointer ${
        active
          ? 'gradient-bg text-white border-transparent shadow-lg shadow-popline-pink/20'
          : 'glass-card text-text-secondary border-white/5 hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function OpportunityCard({
  opportunity,
  open,
  onToggle,
}: {
  opportunity: Opportunity;
  open: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // Mede a altura real do conteúdo e anima `height` (px) — mais fluido que
  // grid-rows/max-height, sobretudo por não reblurrar o backdrop a cada frame.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setHeight(open ? el.scrollHeight : 0);
    if (!open) return;
    // Reajusta se o conteúdo mudar de tamanho (fontes, resize).
    const ro = new ResizeObserver(() => setHeight(el.scrollHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  return (
    <div
      className={`rounded-2xl border bg-surface/70 transition-colors duration-200 relative overflow-hidden ${
        open ? 'border-popline-pink/40' : 'border-white/5 hover:border-white/10'
      }`}
      style={{ contain: 'layout paint' }}
    >
      {/* Cabeçalho clicável */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full text-left p-5 flex items-start gap-4 cursor-pointer"
      >
        {/* Logo / inicial */}
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-background/60 border border-white/5 shrink-0 flex items-center justify-center">
          {opportunity.logoUrl ? (
            <Image
              src={opportunity.logoUrl}
              alt={opportunity.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
              sizes="48px"
            />
          ) : (
            <span className="text-lg font-bold gradient-text">
              {opportunity.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold leading-tight">{opportunity.name}</h3>
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            {opportunity.categories.map(cat => (
              <span key={cat} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-popline-pink/15 text-popline-light">
                {CATEGORY_LABEL[cat]}
              </span>
            ))}
          </div>
          <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">{opportunity.shortDesc}</p>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-text-secondary shrink-0 mt-1 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Conteúdo expandido — anima `height` medido (fluido, sem reblurrar o backdrop) */}
      <div
        className="overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ height, opacity: open ? 1 : 0, willChange: 'height' }}
      >
        <div ref={contentRef} className="px-5 pb-5 pt-0">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-popline-pink/30 to-transparent mb-4" />
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
            {opportunity.fullDesc}
          </p>
          <a
            href={opportunity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center justify-center gap-2 w-full gradient-bg gradient-bg-hover text-white font-semibold shadow-lg shadow-popline-pink/20 px-5 py-2.5 rounded-xl text-sm transition-colors duration-200"
          >
            Visitar plataforma
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
