'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ROUTES } from '@/lib/constants';

/**
 * Banner promocional de aniversário (POPline 20 anos — 20% OFF).
 * Renderizado no topo do dashboard APENAS para usuários sem assinatura ativa
 * (plano free). O gating fica no DashboardLayout; aqui é só a apresentação.
 * Imagem única (~5.3:1) usada em desktop e mobile.
 */
export default function PromoBanner() {
  return (
    <Link
      href={ROUTES.PLANOS}
      aria-label="POPline 20 anos: 20% OFF em qualquer assinatura com o cupom POPLINE20"
      className="group mb-6 block overflow-hidden rounded-2xl ring-1 ring-white/5 transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-popline-pink"
    >
      <Image
        src="/promo-popline20.png"
        alt="POPline 20 anos — 20% OFF em qualquer assinatura. Use o cupom POPLINE20."
        width={945}
        height={197}
        priority
        sizes="(max-width: 768px) 100vw, 1024px"
        className="h-auto w-full"
      />
    </Link>
  );
}
