'use client';

import { useEffect } from 'react';

/**
 * Executa `load` uma vez quando o componente monta (ou quando as dependências mudam).
 *
 * O lint rule `react-hooks/set-state-in-effect` desencoraja chamar setState
 * dentro de useEffect porque o padrão certo em React 19 seria fetch via Server
 * Component ou uma lib de cache (TanStack Query, SWR) que internamente usa
 * `useSyncExternalStore`. Enquanto a migração para RSC não acontece, este hook
 * centraliza o padrão legítimo de "carregar estado inicial do Supabase" e
 * suprime o aviso num único ponto com justificativa explícita.
 *
 * Substituir este hook por RSC/TanStack ao migrar cada página.
 */
export function useLoadOnMount(load: () => void | Promise<void>, deps: React.DependencyList = []) {
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
