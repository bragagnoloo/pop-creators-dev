'use client';

import CategoryCampaignsPage from '@/components/dashboard/CategoryCampaignsPage';

/**
 * Sub-aba genérica: campanhas padrão em "Disponíveis", e também as convite em
 * "Participando" (elas não têm sub-aba própria).
 *
 * requireTerm={false} mantém o insert cru desta aba como sempre foi. As
 * categorias com sub-aba dedicada usam apply_with_term; alinhar a aba padrão é
 * uma mudança de escopo próprio, com o maior volume de candidaturas.
 */
export default function CampanhasPage() {
  return <CategoryCampaignsPage category="standard" requireTerm={false} />;
}
