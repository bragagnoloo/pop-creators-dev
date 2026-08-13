'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CAMPAIGN_SUB_TABS } from '@/lib/campaign-categories';

/**
 * Barra de sub-abas de /dashboard/campanhas.
 *
 * Cada categoria com página própria vira uma sub-aba em vez de um item de
 * sidebar — com quatro categorias, uma aba de topo para cada não escalava.
 * A sub-aba ativa usa a cor da categoria (rosa/roxo/laranja), que é o sinal
 * visual que a sidebar dava antes.
 *
 * Sem contadores de propósito: exigiriam um segundo fetch e ficariam fora de
 * sincronia com o SWR de cada página. Os números seguem no FilterToggle.
 */
export default function CategoryTabs() {
  const pathname = usePathname();

  return (
    <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex w-max gap-1 p-1 bg-white/5 border border-border rounded-xl">
        {CAMPAIGN_SUB_TABS.map(def => {
          const active = pathname === def.route;
          return (
            <Link
              key={def.id}
              href={def.route}
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? def.theme.subTabActive : 'text-text-secondary hover:text-white'
              }`}
            >
              {def.subTabLabel}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
