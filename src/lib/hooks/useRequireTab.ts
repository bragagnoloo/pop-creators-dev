'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { ROUTES } from '@/lib/constants';
import type { AdminTab } from '@/types';

const TAB_TO_HREF: Record<AdminTab, string> = {
  assinaturas: ROUTES.ADMIN_ASSINATURAS,
  users:       ROUTES.ADMIN_USERS,
  ranking:     ROUTES.ADMIN_RANKING,
};

/**
 * Em páginas /admin/{assinaturas,users,ranking}, redireciona campaign_admin
 * sem permissão pra primeira aba que ele tem acesso (extra) ou pra /admin/campaigns
 * (acesso default de qualquer campaign_admin). Master admin nunca é redirecionado.
 */
export function useRequireTab(tab: AdminTab) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role === 'admin') return;
    if (user.role !== 'campaign_admin') {
      router.replace(ROUTES.LOGIN);
      return;
    }
    if (user.extraTabs.includes(tab)) return;

    // Sem permissão pra esta aba — redireciona pra primeira aba acessível
    const firstExtra = user.extraTabs[0];
    const dest = firstExtra ? TAB_TO_HREF[firstExtra] : ROUTES.ADMIN_CAMPAIGNS;
    router.replace(dest);
  }, [user, isLoading, tab, router]);
}
