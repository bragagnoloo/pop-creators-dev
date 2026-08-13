'use client';

import CategoryCampaignsPage from '@/components/dashboard/CategoryCampaignsPage';
import CategoryIntro, { type CategoryIntroStep } from '@/components/dashboard/CategoryIntro';

const REVIEW_STEPS: CategoryIntroStep[] = [
  {
    title: 'Candidate-se',
    desc: 'Escolha uma oportunidade de Review aberta e envie sua candidatura.',
    icon: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
  },
  {
    title: 'Produza o review',
    desc: 'Siga o briefing e crie um conteúdo autêntico sobre o lançamento.',
    icon: (
      <>
        <path d="M12 3v10.55" />
        <circle cx="9" cy="16" r="3" />
        <path d="M12 3l6 2v3l-6-2" />
      </>
    ),
  },
  {
    title: 'Seja remunerado',
    desc: 'Cada review aprovado é uma campanha remunerada, publicada no prazo.',
    icon: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
];

const REVIEW_PARAGRAPHS = [
  <>
    Chegou o <strong className="text-text-primary">POPline Creators Review</strong>, a nova
    oportunidade para transformar sua opinião sobre música em remuneração.
  </>,
  <>
    Agora, além das campanhas tradicionais, você pode se candidatar para produzir reviews de
    singles, EPs, álbuns e outros lançamentos do mercado musical. Sua missão é criar conteúdos
    autênticos, criativos e relevantes, compartilhando análises, primeiras impressões,
    recomendações e pontos de vista que conectem sua audiência aos novos lançamentos.
  </>,
  <>
    Cada review aprovado é uma campanha remunerada. Basta se candidatar às oportunidades
    disponíveis, seguir o briefing e publicar o conteúdo dentro do prazo estabelecido.
  </>,
  <>
    Se você ama música, acompanha os lançamentos e sabe transformar sua opinião em conteúdo
    de qualidade, essa é a sua chance de monetizar sua voz e fazer parte das principais
    campanhas da indústria musical com o POPline Creators.
  </>,
];

export default function ReviewsPage() {
  return (
    <CategoryCampaignsPage
      category="review"
      intro={
        <CategoryIntro
          category="review"
          logo={{
            src: '/popline-review-logo.png',
            alt: 'POPline Creators Review',
            width: 1400,
            height: 730,
          }}
          paragraphs={REVIEW_PARAGRAPHS}
          steps={REVIEW_STEPS}
          statusLabel="Aguarde a abertura do primeiro Review"
        />
      }
    />
  );
}
