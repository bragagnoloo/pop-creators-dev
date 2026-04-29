'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

type IconProps = { className?: string };

const Icons = {
  Dashboard: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  Campanhas: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-8v18l-18-8z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  ),
  Aulas: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
  Carteira: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  ),
  Roteiros: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
      <path d="M5 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
      <path d="M19 14l.8 1.6L21.5 16l-1.7.4L19 18l-.8-1.6L16.5 16l1.7-.4z" />
    </svg>
  ),
  Ranking: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 4h3v3a3 3 0 0 1-3 3" />
      <path d="M7 4H4v3a3 3 0 0 0 3 3" />
    </svg>
  ),
  Planos: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
    </svg>
  ),
  Mais: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
};

const primaryItems = [
  { label: 'Home', href: ROUTES.DASHBOARD, icon: Icons.Dashboard, exact: true },
  { label: 'Campanhas', href: ROUTES.CAMPANHAS, icon: Icons.Campanhas },
  { label: 'Aulas', href: ROUTES.AULAS, icon: Icons.Aulas },
  { label: 'Carteira', href: ROUTES.CARTEIRA, icon: Icons.Carteira },
];

const moreItems = [
  { label: 'IA de Roteiros', href: ROUTES.ROTEIROS, icon: Icons.Roteiros },
  { label: 'Ranking', href: ROUTES.RANKING, icon: Icons.Ranking },
  { label: 'Planos', href: ROUTES.PLANOS, icon: Icons.Planos },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [showMais, setShowMais] = useState(false);
  const maisRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const maisIsActive = moreItems.some(item => isActive(item.href));

  useEffect(() => {
    if (!showMais) return;
    const handler = (e: MouseEvent) => {
      if (maisRef.current && !maisRef.current.contains(e.target as Node)) {
        setShowMais(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMais]);

  // Close popover on navigation
  useEffect(() => {
    setShowMais(false);
  }, [pathname]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border">
      <div className="grid grid-cols-5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {primaryItems.map(({ label, href, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 min-h-[56px] px-1 relative transition-colors ${
                active ? 'text-popline-pink' : 'text-text-secondary'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-popline-pink rounded-full" />
              )}
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}

        {/* Mais */}
        <div ref={maisRef} className="relative flex flex-col items-center justify-center">
          {showMais && (
            <div className="absolute bottom-full mb-2 right-0 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
              {moreItems.map(({ label, href, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      active
                        ? 'text-popline-pink bg-popline-pink/10'
                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowMais(v => !v)}
            aria-label="Mais opções"
            aria-expanded={showMais}
            className={`flex flex-col items-center justify-center gap-1 min-h-[56px] w-full px-1 relative transition-colors ${
              maisIsActive || showMais ? 'text-popline-pink' : 'text-text-secondary'
            }`}
          >
            {(maisIsActive || showMais) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-popline-pink rounded-full" />
            )}
            <Icons.Mais className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-medium leading-none">Mais</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
