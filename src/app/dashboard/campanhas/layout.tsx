import type { ReactNode } from 'react';
import CategoryTabs from '@/components/dashboard/CategoryTabs';

/**
 * Casca das sub-abas de campanha. O título e a barra de categorias vivem aqui
 * para persistirem entre as sub-rotas — só o conteúdo suspende ao navegar.
 */
export default function CampanhasLayout({ children }: { children: ReactNode }) {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-6">Campanhas</h1>
      <CategoryTabs />
      {children}
    </div>
  );
}
