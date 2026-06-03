'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

/**
 * Config global do SWR:
 * - Desliga refetch agressivo ao focar a janela.
 * - Mantém dedupe de 30s pra evitar fetch repetido em re-renders rápidos.
 * - Fetcher padrão usa fetch(url) → json (mesmo padrão usado nas páginas).
 */
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateIfStale: true,
        dedupingInterval: 30_000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
