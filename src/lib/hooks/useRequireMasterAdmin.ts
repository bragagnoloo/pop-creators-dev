'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { ROUTES } from '@/lib/constants';

/**
 * Guard de página para abas exclusivas do master admin.
 *
 * O admin/layout.tsx deixa passar campaign_admin também, então páginas que só o
 * master pode ver precisam checar por conta própria. Diferente de useRequireTab,
 * aqui não há concessão possível: não passa por extra_admin_tabs.
 *
 * A proteção real é o requireMasterAdmin() nas rotas de API — isto é só UX.
 */
export function useRequireMasterAdmin() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role === 'admin') return;
    if (user.role === 'campaign_admin') {
      router.replace(ROUTES.ADMIN_CAMPAIGNS);
      return;
    }
    router.replace(ROUTES.LOGIN);
  }, [user, isLoading, router]);

  return { isMasterAdmin: user?.role === 'admin', isLoading };
}
