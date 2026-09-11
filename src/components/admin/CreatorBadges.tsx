'use client';

import Badge, { type BadgeVariant } from '@/components/ui/Badge';
import type { CreatorBadgeData, CreatorTier } from '@/services/creator-badges';

/**
 * Selos internos do creator — SÓ painel admin, nunca em tela de usuário.
 * Regras e garantia de privacidade em @/services/creator-badges.
 *
 * Vermelho fica reservado ao selo de desclassificação: é o único que sinaliza
 * comportamento, então precisa saltar mais que o tier. "Flop" é cinza de
 * propósito — quem nunca foi aprovado ainda não fez nada de errado.
 */

// Record anotado pelo mesmo motivo do Badge: acrescentar um tier sem a chave
// correspondente tem que quebrar no tsc, não virar selo sem cor.
const TIERS: Record<CreatorTier, { label: string; variant: BadgeVariant; title: string }> = {
  flop:      { label: 'Flop',      variant: 'default', title: 'Já se candidatou, mas nunca foi aprovado' },
  iniciante: { label: 'Iniciante', variant: 'pink',    title: 'Aprovado em 1 a 5 campanhas' },
  super:     { label: 'Super',     variant: 'purple',  title: 'Aprovado em 6 a 10 campanhas' },
  master:    { label: 'Master',    variant: 'orange',  title: 'Aprovado em 11 ou mais campanhas' },
};

export default function CreatorBadges({ badges }: { badges: CreatorBadgeData | null | undefined }) {
  if (!badges) return null;

  const tier = badges.tier ? TIERS[badges.tier] : null;
  const desq = badges.disqualifiedCount;

  if (!tier && !badges.isNew && desq === 0) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
      {badges.isNew && (
        <span title="Primeira assinatura há menos de 30 dias">
          <Badge variant="warning">Novo</Badge>
        </span>
      )}
      {tier && (
        <span title={`${tier.title} · ${badges.approvedCount} de ${badges.applicationCount} candidatura(s)`}>
          <Badge variant={tier.variant}>{tier.label}</Badge>
        </span>
      )}
      {desq > 0 && (
        <span title={`${desq} desclassificação(ões) no histórico`}>
          <Badge variant="danger">{desq} desq.</Badge>
        </span>
      )}
    </span>
  );
}
