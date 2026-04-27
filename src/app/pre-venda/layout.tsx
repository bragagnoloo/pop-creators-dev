import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'POPline Creators | Acesso Antecipado',
  description:
    'Seja um dos primeiros a entrar no maior ecossistema de criadores de conteúdo musical do Brasil. Garanta seu acesso antecipado.',
};

export default function PreVendaLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
