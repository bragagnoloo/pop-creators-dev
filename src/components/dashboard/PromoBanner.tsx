'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ROUTES } from '@/lib/constants';

/**
 * Banner promocional da Black Friday (30% OFF no Plano Anual).
 * Renderizado no topo do dashboard para qualquer plano enquanto a promo
 * estiver no ar. O gating fica no DashboardLayout; aqui é só a apresentação. Uma arte só (~3:1) para todas
 * as telas: o texto dela é grande o bastante para ler no celular.
 */
export default function PromoBanner() {
  return (
    <Link
      href={ROUTES.PLANOS}
      aria-label="Black Friday: 30% OFF no Plano Anual"
      className="group mb-6 block overflow-hidden rounded-2xl ring-1 ring-white/5 transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-popline-pink"
    >
      <Image
        src="/banner-black-friday.png"
        alt="POPline Creators Black Friday: 30% OFF no plano anual."
        width={4334}
        height={1452}
        sizes="(min-width: 1024px) 1024px, 100vw"
        className="block h-auto w-full"
      />
    </Link>
  );
}
