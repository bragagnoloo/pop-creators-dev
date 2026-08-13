'use client';

import CategoryCampaignsPage from '@/components/dashboard/CategoryCampaignsPage';
import CategoryIntro, { type CategoryIntroStep } from '@/components/dashboard/CategoryIntro';

const RADAR_STEPS: CategoryIntroStep[] = [
  {
    title: 'Entre no radar',
    desc: 'Escolha um artista em campanha aberta e envie sua candidatura.',
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
        <path d="M12 12l7-7" />
      </>
    ),
  },
  {
    title: 'Conheça e escute',
    desc: 'Ouça o trabalho, entenda a trajetória e forme sua opinião antes de gravar.',
    icon: (
      <>
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
        <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </>
    ),
  },
  {
    title: 'Recomende de verdade',
    desc: 'Publique sua recomendação autêntica e receba o cachê da campanha.',
    icon: (
      <>
        <path d="M3 11l18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </>
    ),
  },
];

const RADAR_PARAGRAPHS = [
  <>
    Chegou o <strong className="text-text-primary">POPline Creators Radar</strong>, a categoria
    feita para quem descobre um artista antes de todo mundo.
  </>,
  <>
    A proposta é conectar novos artistas a criadores apaixonados por música e cultura pop. Você
    conhece a trajetória do artista, ouve o trabalho dele e compartilha uma recomendação
    autêntica com a sua comunidade.
  </>,
  <>
    Mais do que divulgar uma música, o Radar é sobre despertar curiosidade: apresentar talentos
    em ascensão e mostrar por que aquele artista merece entrar no radar de mais gente. O
    conteúdo é seu. Sua opinião, sua linguagem, seu jeito de contar.
  </>,
  <>
    É a oportunidade de ser um dos primeiros a apresentar o próximo grande nome da música ao seu
    público.
  </>,
];

export default function RadarPage() {
  return (
    <CategoryCampaignsPage
      category="radar"
      intro={
        <CategoryIntro
          category="radar"
          logo={{
            src: '/popline-radar-logo.png',
            alt: 'POPline Creators Radar',
            width: 928,
            height: 520,
          }}
          paragraphs={RADAR_PARAGRAPHS}
          steps={RADAR_STEPS}
          statusLabel="Aguarde a abertura do primeiro Radar"
        />
      }
    />
  );
}
