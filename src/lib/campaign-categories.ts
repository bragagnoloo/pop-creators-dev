import { ROUTES } from '@/lib/constants';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { Campaign, CampaignCategory } from '@/types';

/**
 * Registro central das categorias de campanha.
 *
 * Contexto: até a migration 0035 a categoria era recalculada em ternários
 * aninhados espalhados por ~15 arquivos (badge, moldura, filtro de aba, form do
 * admin, view do B2B). Com a quarta categoria isso deixou de escalar. Aqui fica
 * a fonte única de rótulo, cor, rota e copy; a quinta categoria custa uma
 * entrada neste objeto e uma page de ~15 linhas.
 *
 * IMPORTANTE — as flags continuam sendo a única verdade. `Campaign` carrega
 * is_invite/is_review/is_radar como vieram do banco, e a categoria é DERIVADA
 * por getCampaignCategory(). Não existe campo `category` no objeto nem coluna no
 * schema: duas representações da mesma informação no mesmo objeto poderiam
 * dessincronizar, e um campo derivado obrigaria a excluí-lo do
 * Omit<Campaign, ...> de createCampaign em cada call site.
 *
 * IMPORTANTE — toda classe do Tailwind aqui é string literal COMPLETA. O
 * scanner do Tailwind v4 lê este arquivo, mas não resolve interpolação: algo
 * como `border-popline-${cor}` simplesmente não seria gerado no CSS.
 */

/** Só as flags — aceita um Campaign inteiro ou qualquer objeto com as três. */
export type CampaignCategoryFlags = Pick<Campaign, 'isInvite' | 'isReview' | 'isRadar'>;

export type CampaignCategoryTheme = {
  /** Moldura + glow do CampaignCard/ParticipatingCard. '' = sem destaque. */
  cardAccent: string;
  /** Botão ativo da barra de sub-abas. */
  subTabActive: string;
  /** Casca do hero de apresentação da categoria. */
  introShell: string;
  /** Valor CSS puro do glow radial do hero (vai em style inline). */
  glowVar: string;
  /** drop-shadow do logo no hero. */
  logoGlow: string;
  /** Pílula "Nova categoria" e selo de status do hero. */
  pill: string;
  /** hover:border-... dos cards de passo do hero. */
  stepHover: string;
  /** Tile do ícone de cada passo. */
  stepIcon: string;
  /** Número fantasma (1, 2, 3) de cada passo. */
  stepNumber: string;
  /** Bolinha animada do selo de status. */
  dot: string;
  /** Botão ativo do toggle Disponíveis/Participando. */
  filterActive: string;
  /** Bullet da lista de campos faltando no modal "Perfil Incompleto". */
  bullet: string;
  /** Classe do parágrafo de ajuda no form do admin. */
  helpTextClass: string;
};

/**
 * Copy da sub-aba. Frases INTEIRAS de propósito: o gênero muda entre categorias
 * ("de nenhuma Review" vs "de nenhum Radar"), então não dá para templatizar a
 * partir de um rótulo só.
 */
export type CampaignCategoryTabCopy = {
  pixelContentName: string;
  emptyAvailable: string;
  emptyParticipating: string;
  incompleteProfileIntro: string;
};

export type CampaignCategoryDef = {
  id: CampaignCategory;
  /** Flag correspondente em Campaign. null = ausência de flags (standard). */
  field: 'isInvite' | 'isReview' | 'isRadar' | null;
  /** Badge curto no card e na lista do admin. null = não renderiza badge. */
  badgeLabel: string | null;
  badgeVariant: BadgeVariant | null;
  /** Rótulo curto: B2B, CSV e badges. Idêntico ao TYPE_LABEL histórico. */
  shortLabel: string;
  /** Rótulo longo: badge readonly do form de campanhas. */
  adminLabel: string;
  /** <option> do select "Tipo de campanha". */
  optionLabel: string;
  /** Ajuda exibida ao selecionar a opção no form. null = sem ajuda. */
  helpText: string | null;
  /** Rótulo na barra de sub-abas. null = não tem sub-aba própria. */
  subTabLabel: string | null;
  /** Sub-aba onde a categoria vive. */
  route: string;
  /** Nunca aparece na descoberta pública (só convite). */
  hiddenFromDiscovery: boolean;
  theme: CampaignCategoryTheme;
  /** null = não tem sub-aba própria (usa a genérica de Campanhas). */
  tabCopy: CampaignCategoryTabCopy | null;
};

/** Tema neutro — categorias sem destaque visual próprio herdam o rosa da marca. */
const NEUTRAL_THEME: CampaignCategoryTheme = {
  cardAccent: '',
  subTabActive: 'bg-popline-pink text-white',
  introShell: '',
  glowVar: 'var(--color-popline-pink)',
  logoGlow: '',
  pill: 'bg-popline-pink/15 text-popline-light border-popline-pink/40',
  stepHover: 'hover:border-popline-pink/40',
  stepIcon: 'bg-popline-pink/15 text-popline-light',
  stepNumber: 'text-popline-pink/20',
  dot: 'bg-popline-light',
  filterActive: 'bg-popline-pink text-white',
  bullet: 'bg-popline-pink',
  helpTextClass: 'text-xs text-popline-pink/90 mt-0.5',
};

export const CAMPAIGN_CATEGORIES: Record<CampaignCategory, CampaignCategoryDef> = {
  standard: {
    id: 'standard',
    field: null,
    badgeLabel: null,
    badgeVariant: null,
    shortLabel: 'Padrão',
    adminLabel: 'Padrão (pública)',
    optionLabel: 'Padrão — pública, aberta a inscrições',
    helpText: null,
    subTabLabel: 'Campanhas',
    route: ROUTES.CAMPANHAS,
    hiddenFromDiscovery: false,
    theme: NEUTRAL_THEME,
    tabCopy: {
      pixelContentName: 'Campanhas POPline Creators',
      emptyAvailable: 'Nenhuma campanha disponivel no momento.',
      emptyParticipating: 'Voce ainda nao esta participando de nenhuma campanha.',
      incompleteProfileIntro:
        'Para se candidatar a uma campanha, voce precisa preencher todos os campos do seu perfil. Faltam:',
    },
  },

  invite: {
    id: 'invite',
    field: 'isInvite',
    badgeLabel: 'Convite',
    badgeVariant: 'pink',
    shortLabel: 'Convite',
    adminLabel: 'Convite (oculta)',
    optionLabel: 'Convite — confidencial, oculta dos usuários',
    helpText:
      'Campanha oculta: não aparece para os usuários. Os participantes são adicionados ' +
      'manualmente na Etapa 01 — Adicionar Convidados, dentro do painel da campanha.',
    // Convite não tem sub-aba: aparece em "Participando" da sub-aba Campanhas.
    subTabLabel: null,
    route: ROUTES.CAMPANHAS,
    hiddenFromDiscovery: true,
    theme: {
      ...NEUTRAL_THEME,
      cardAccent: ' border-2 !border-popline-pink shadow-[0_0_16px_-2px_var(--color-popline-pink)]',
    },
    tabCopy: null,
  },

  review: {
    id: 'review',
    field: 'isReview',
    badgeLabel: 'Review',
    badgeVariant: 'purple',
    shortLabel: 'Review',
    adminLabel: 'Review',
    optionLabel: 'Review — POPline Creators Review (pública, sub-aba própria)',
    helpText:
      'Review pública: aparece na sub-aba Reviews de Campanhas (moldura roxa) e no dashboard ' +
      'dos assinantes, que se candidatam normalmente. Não aparece na sub-aba Campanhas.',
    subTabLabel: 'Reviews',
    route: ROUTES.CAMPANHAS_REVIEWS,
    hiddenFromDiscovery: false,
    theme: {
      cardAccent: ' border-2 !border-popline-purple shadow-[0_0_22px_-3px_var(--color-popline-purple)]',
      subTabActive: 'bg-popline-purple text-white',
      introShell:
        'border-2 border-popline-purple shadow-[0_0_28px_-4px_var(--color-popline-purple),inset_0_0_24px_-14px_var(--color-popline-purple)]',
      glowVar: 'var(--color-popline-purple)',
      logoGlow: 'drop-shadow-[0_0_28px_rgba(124,58,237,0.45)]',
      pill: 'bg-popline-purple/15 text-popline-purple-light border-popline-purple/40',
      stepHover: 'hover:border-popline-purple/40',
      stepIcon: 'bg-popline-purple/15 text-popline-purple-light',
      stepNumber: 'text-popline-purple/20',
      dot: 'bg-popline-purple-light',
      filterActive: 'bg-popline-purple text-white',
      bullet: 'bg-popline-purple',
      helpTextClass: 'text-xs text-popline-purple mt-0.5',
    },
    tabCopy: {
      pixelContentName: 'Reviews POPline Creators',
      emptyAvailable: 'Nenhuma Review disponível no momento.',
      emptyParticipating: 'Você ainda não está participando de nenhuma Review.',
      incompleteProfileIntro:
        'Para se candidatar a uma Review, você precisa preencher todos os campos do seu perfil. Faltam:',
    },
  },

  radar: {
    id: 'radar',
    field: 'isRadar',
    badgeLabel: 'Radar',
    badgeVariant: 'orange',
    shortLabel: 'Radar',
    adminLabel: 'Radar',
    optionLabel: 'Radar — POPline Creators Radar (pública, sub-aba própria)',
    helpText:
      'Radar público: aparece na sub-aba Radar de Campanhas (moldura laranja) e no dashboard ' +
      'dos assinantes, que se candidatam normalmente. Não aparece na sub-aba Campanhas.',
    subTabLabel: 'Radar',
    route: ROUTES.CAMPANHAS_RADAR,
    hiddenFromDiscovery: false,
    theme: {
      cardAccent: ' border-2 !border-popline-orange shadow-[0_0_26px_-3px_var(--color-popline-orange)]',
      subTabActive: 'bg-popline-orange text-white',
      introShell:
        'border-2 border-popline-orange shadow-[0_0_28px_-4px_var(--color-popline-orange),inset_0_0_24px_-14px_var(--color-popline-orange)]',
      glowVar: 'var(--color-popline-orange)',
      logoGlow: 'drop-shadow-[0_0_28px_rgba(255,122,24,0.45)]',
      pill: 'bg-popline-orange/15 text-popline-orange-light border-popline-orange/40',
      stepHover: 'hover:border-popline-orange/40',
      stepIcon: 'bg-popline-orange/15 text-popline-orange-light',
      stepNumber: 'text-popline-orange/20',
      dot: 'bg-popline-orange-light',
      filterActive: 'bg-popline-orange text-white',
      bullet: 'bg-popline-orange',
      helpTextClass: 'text-xs text-popline-orange mt-0.5',
    },
    tabCopy: {
      pixelContentName: 'Radar POPline Creators',
      emptyAvailable: 'Nenhum Radar disponível no momento.',
      emptyParticipating: 'Você ainda não está participando de nenhum Radar.',
      incompleteProfileIntro:
        'Para se candidatar a um Radar, você precisa preencher todos os campos do seu perfil. Faltam:',
    },
  },
};

/** Ordem do select do admin e do filtro de tipo do B2B. */
export const CAMPAIGN_CATEGORY_ORDER: CampaignCategory[] = [
  'standard',
  'invite',
  'review',
  'radar',
];

/** Barra de sub-abas de /dashboard/campanhas, na ordem exibida. */
export const CAMPAIGN_SUB_TABS: CampaignCategoryDef[] = CAMPAIGN_CATEGORY_ORDER
  .map(id => CAMPAIGN_CATEGORIES[id])
  .filter(def => def.subTabLabel !== null);

/**
 * Ordem de detecção. O constraint campaigns_type_exclusive garante no máximo uma
 * flag ligada; esta ordem existe para a derivação ser total e determinística
 * mesmo assim — e é ela que substitui a precedência de moldura que antes ficava
 * hardcoded no ParticipatingCard (Review ganhava do Convite).
 *
 * Tem que bater com o `case` de campaign_type da view b2b_finance_overview
 * (migration 0035), senão front e B2B classificam diferente.
 */
const DETECTION_ORDER: CampaignCategory[] = ['review', 'radar', 'invite'];

export function getCampaignCategory(c: CampaignCategoryFlags): CampaignCategory {
  for (const id of DETECTION_ORDER) {
    const field = CAMPAIGN_CATEGORIES[id].field;
    if (field && c[field]) return id;
  }
  return 'standard';
}

export function getCampaignCategoryDef(c: CampaignCategoryFlags): CampaignCategoryDef {
  return CAMPAIGN_CATEGORIES[getCampaignCategory(c)];
}

/** Flags para o insert, a partir da categoria escolhida no form do admin. */
export function categoryFlags(category: CampaignCategory): CampaignCategoryFlags {
  return {
    isInvite: category === 'invite',
    isReview: category === 'review',
    isRadar: category === 'radar',
  };
}

/**
 * Tem sub-aba DEDICADA → não aparece na sub-aba genérica de Campanhas.
 *
 * Comparação por rota, não por subTabLabel: 'standard' tem rótulo na barra
 * ("Campanhas"), mas a sub-aba dele É a genérica — usar o rótulo aqui excluiria
 * as campanhas padrão da própria aba. 'invite' também mora na genérica.
 */
export function hasOwnSubTab(c: CampaignCategoryFlags): boolean {
  return getCampaignCategoryDef(c).route !== ROUTES.CAMPANHAS;
}

/** Oculta da descoberta pública (só convite). */
export function isHiddenFromDiscovery(c: CampaignCategoryFlags): boolean {
  return getCampaignCategoryDef(c).hiddenFromDiscovery;
}

/** Converte string livre (ex.: value de <select>) em categoria válida. */
export function parseCampaignCategory(value: string): CampaignCategory | null {
  return (CAMPAIGN_CATEGORY_ORDER as string[]).includes(value)
    ? (value as CampaignCategory)
    : null;
}
