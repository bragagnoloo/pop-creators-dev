'use client';

import { useEffect, useState } from 'react';
import { PROMO_DEADLINE_MS } from '@/services/subscriptions';

function breakdown(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Contador regressivo (rosa) até o fim da promo "20 anos". Atualiza a cada
 * segundo. Renderiza null antes de montar (evita mismatch de hidratação, já
 * que o tempo depende de Date.now) e também quando o prazo já passou — então
 * some sozinho no instante em que a oferta termina.
 */
export default function PromoCountdown({ className = '' }: { className?: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(PROMO_DEADLINE_MS - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (remaining === null || remaining <= 0) return null;

  const { days, hours, minutes, seconds } = breakdown(remaining);

  return (
    <div
      role="timer"
      aria-label="Tempo restante da oferta"
      className={`flex items-center justify-center gap-1.5 rounded-lg border border-popline-pink/25 bg-popline-pink/10 px-2 py-1.5 ${className}`}
    >
      <svg
        className="h-3.5 w-3.5 shrink-0 text-popline-pink"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="text-[11px] font-medium text-popline-pink/80">Termina em</span>
      <span className="text-xs font-bold tabular-nums tracking-wide text-popline-pink">
        {days > 0 && `${days}d `}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}
