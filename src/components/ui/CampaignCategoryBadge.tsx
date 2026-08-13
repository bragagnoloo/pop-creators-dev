import type { CampaignCategory } from '@/types';
import {
  CAMPAIGN_CATEGORIES,
  getCampaignCategoryDef,
  type CampaignCategoryFlags,
} from '@/lib/campaign-categories';
import Badge from './Badge';

/**
 * Badge da categoria da campanha. Aceita a categoria já derivada (B2B, que
 * recebe campaign_type pronto da view) ou as flags da campanha (cards e lista do
 * admin). Retorna null para 'standard', que não tem badge — mesmo comportamento
 * de antes, quando cada call site fazia `{campaign.isX && <Badge .../>}`.
 */
type Props = { category: CampaignCategory } | { campaign: CampaignCategoryFlags };

export default function CampaignCategoryBadge(props: Props) {
  const def =
    'category' in props
      ? CAMPAIGN_CATEGORIES[props.category]
      : getCampaignCategoryDef(props.campaign);

  if (!def.badgeLabel || !def.badgeVariant) return null;

  return <Badge variant={def.badgeVariant}>{def.badgeLabel}</Badge>;
}
