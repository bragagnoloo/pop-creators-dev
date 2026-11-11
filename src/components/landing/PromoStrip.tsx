'use client';

import { useEffect, useState } from 'react';
import { isPromoActive, PROMO_DEADLINE_MS, PROMO_LABEL } from '@/services/subscriptions';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Faixa da Black Friday no topo da LP (dentro da navbar fixa). Só texto e
 * contador, sem botão. Quem decide exibir é a página (no servidor, para o
 * hero reservar a altura); aqui a faixa sai já no primeiro paint, o contador
 * preenche ao montar (depende de Date.now) e a faixa some se o prazo passar
 * com a página aberta.
 */
export default function PromoStrip() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(isPromoActive() ? PROMO_DEADLINE_MS - Date.now() : 0);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (remaining !== null && remaining <= 0) return null;

  const s = Math.floor((remaining ?? 0) / 1000);
  const units = [
    { value: Math.floor(s / 86400), label: 'd' },
    { value: Math.floor((s % 86400) / 3600), label: 'h' },
    { value: Math.floor((s % 3600) / 60), label: 'm' },
    { value: s % 60, label: 's' },
  ];

  return (
    <div className="gradient-bg text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 sm:h-11 flex items-center justify-center gap-3 sm:gap-6">
        <span className="hidden sm:inline-flex items-center rounded-full bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
          Black Friday
        </span>
        <p className="text-[11px] sm:text-sm font-medium leading-tight">
          <span className="sm:hidden font-black uppercase">Black Friday: </span>
          <strong className="font-black">{PROMO_LABEL}</strong> no <span className="hidden sm:inline">Plano </span>Anual
        </p>
        <div
          role="timer"
          aria-label="Tempo restante da oferta"
          className={`flex items-center gap-1 transition-opacity ${remaining === null ? 'opacity-0' : ''}`}
        >
          {units.map(u => (
            <span
              key={u.label}
              className="rounded-md bg-black/40 px-1.5 py-0.5 text-[11px] sm:text-xs font-bold tabular-nums"
            >
              {u.label === 'd' ? u.value : pad(u.value)}
              <span className="ml-px font-medium text-white/70">{u.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
