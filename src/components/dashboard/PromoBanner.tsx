'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ROUTES } from '@/lib/constants';

/**
 * Banner promocional de aniversário (POPline 20 anos — 20% OFF).
 * Renderizado no topo do dashboard APENAS para usuários sem assinatura ativa
 * (plano free). O gating fica no DashboardLayout; aqui é só a apresentação.
 * Duas artes: tira horizontal (~4.8:1) no desktop e versão mais alta (16:9)
 * no mobile, alternadas por breakpoint (md = 768px). Só a arte visível é
 * baixada (a oculta usa display:none e não faz preload, pois sem `priority`).
 */
export default function PromoBanner() {
  return (
    <Link
      href={ROUTES.PLANOS}
      aria-label="POPline 20 anos: 20% OFF em qualquer assinatura com o cupom POPLINE20"
      className="group mb-6 block overflow-hidden rounded-2xl ring-1 ring-white/5 transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-popline-pink"
    >
      {/* Mobile (< md): arte mais alta (16:9) */}
      <Image
        src="/banner-mobile-20anos.png"
        alt="POPline 20 anos — 20% OFF em qualquer assinatura. Use o cupom POPLINE20."
        width={1680}
        height={943}
        sizes="100vw"
        className="block h-auto w-full md:hidden"
      />
      {/* Desktop (>= md): tira horizontal (~4.8:1) */}
      <Image
        src="/promo-popline20.png"
        alt="POPline 20 anos — 20% OFF em qualquer assinatura. Use o cupom POPLINE20."
        width={945}
        height={197}
        sizes="1024px"
        className="hidden h-auto w-full md:block"
      />
    </Link>
  );
}
