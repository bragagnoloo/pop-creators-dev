export type PaywallContext = 'campaigns' | 'scripts' | 'lessons' | 'default';

export interface PaywallPreset {
  description: string;
  features: string[];
  plansHeading: string;
}

/**
 * Título fixo em todos os contextos.
 */
export const PAYWALL_TITLE = 'Olá Creator, você ainda não é Assinante POPline Creators';

/**
 * Mensagens personalizadas conforme o recurso que disparou o paywall.
 * Aumenta a conversão porque o copy "fala a linguagem" do contexto.
 */
export const PAYWALL_PRESETS: Record<PaywallContext, PaywallPreset> = {
  campaigns: {
    description:
      'Nossas campanhas são exclusivas para assinantes e você está a poucos cliques de se candidatar à sua primeira. Ao se tornar assinante seu acesso à candidatura é liberado automaticamente.',
    features: [
      'Campanhas exclusivas para assinantes',
      'Menos concorrência',
      'Alta taxa de aprovação',
      'Receba produtos e cachê como creator',
    ],
    plansHeading: 'Escolha seu plano e candidate-se agora',
  },
  scripts: {
    description:
      'Roteiros gerados por IA com base nos formatos que mais convertem em UGC. Cole o briefing da marca e receba um roteiro pronto em segundos.',
    features: [
      'Roteiros ilimitados com IA',
      'Variações de tom e formato',
      'Adaptado pra Reels, TikTok e Shorts',
      'Aumente o ritmo de produção de conteúdo',
    ],
    plansHeading: 'Escolha seu plano e libere a IA',
  },
  lessons: {
    description:
      'Acesso a todas as oficinas que ensinam como se tornar a escolha preferida das marcas e dominar o mercado de UGC.',
    features: [
      'Domine o mercado UGC',
      'Aprenda a se posicionar com as marcas',
      'Conteúdo dos melhores creators',
      'Aulas novas toda semana',
    ],
    plansHeading: 'Escolha seu plano e comece a estudar',
  },
  default: {
    description: 'Esse recurso faz parte dos planos pagos.',
    features: [
      'Candidatar-se a campanhas',
      'Assistir todas as oficinas',
      'Gerar roteiros com IA',
      'Modificador de prioridade em campanhas',
    ],
    plansHeading: 'Escolha seu plano',
  },
};
