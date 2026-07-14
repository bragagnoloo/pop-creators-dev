import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'POPline Creators | Campanha Confidencial',
  description:
    'Formulário de inscrição para criadores pré-selecionados da campanha confidencial POPline Creators.',
  robots: { index: false, follow: false },
};

export default function CampanhaConfidencialLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
