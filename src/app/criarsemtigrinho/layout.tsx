import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Criar sem Tigrinho | POPline Creators',
  description:
    'É possível viver da internet sem divulgar apostas. O #CriarSemTigrinho reúne oportunidades reais de monetização para creators, como campanhas com marcas, UGC, afiliados, plataformas e editais. Crie mais. Monetize melhor.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Criar sem Tigrinho | POPline Creators',
    description:
      'Oportunidades reais de monetização para creators, de forma ética e sustentável. Crie mais. Monetize melhor.',
    type: 'website',
  },
};

export default function CriarSemTigrinhoLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
