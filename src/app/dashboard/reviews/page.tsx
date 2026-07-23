'use client';

import Image from 'next/image';
import { useState, useMemo, useEffect } from 'react';
import { pixelCustom, pixelViewContent } from '@/lib/pixel';
import { trackPaywallShown } from '@/lib/paywall-tracking';
import useSWR from 'swr';
import { useAuth } from '@/providers/AuthProvider';
import * as campaignService from '@/services/campaigns';
import * as userService from '@/services/users';
import * as subService from '@/services/subscriptions';
import { getProfileCompleteness } from '@/lib/profile';
import CampaignCard from '@/components/dashboard/CampaignCard';
import Paywall from '@/components/ui/Paywall';
import ParticipatingCard from '@/components/dashboard/ParticipatingCard';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

type Filter = 'available' | 'participating';

export default function ReviewsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('available');
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    pixelViewContent({ content_name: 'Reviews POPline Creators' });
  }, []);

  const { data: campaigns = [] } = useSWR('campaigns', campaignService.getAllCampaigns);
  const { data: applications = [], mutate: mutateApplications } = useSWR(
    user ? ['applications', user.id] : null,
    ([, uid]) => campaignService.getUserApplications(uid)
  );

  const appliedIds = useMemo(
    () => new Set(applications.map(a => a.campaignId)),
    [applications]
  );

  // Só campanhas Review entram nesta aba.
  const reviews = useMemo(() => campaigns.filter(c => c.isReview), [campaigns]);

  const visible = useMemo(() => {
    if (filter === 'available') {
      return reviews.filter(c => c.status === 'open' && !appliedIds.has(c.id));
    }
    return reviews.filter(c => appliedIds.has(c.id));
  }, [reviews, appliedIds, filter]);

  const handleApply = async (campaignId: string) => {
    if (!user) return;
    if (!(await subService.isPaid(user.id))) {
      trackPaywallShown(user.id);
      setPaywallOpen(true);
      return;
    }
    const profile = await userService.getProfile(user.id);
    if (!profile) return;

    const { complete, missing } = getProfileCompleteness(profile);
    if (!complete) {
      setMissingFields(missing);
      setShowIncomplete(true);
      return;
    }

    await campaignService.applyToCampaign(campaignId, user.id);
    const campaign = reviews.find(c => c.id === campaignId);
    pixelCustom('AppliedToCampaign', { campaign_id: campaignId, campaign_title: campaign?.title });
    mutateApplications();
  };

  const counts = {
    available: reviews.filter(c => c.status === 'open' && !appliedIds.has(c.id)).length,
    participating: reviews.filter(c => appliedIds.has(c.id)).length,
  };

  // Sem nenhuma Review cadastrada: mostra a apresentação da categoria.
  const isEmpty = reviews.length === 0;

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-6">Reviews</h1>

      {isEmpty ? (
        <ReviewsIntro />
      ) : (
        <>
          {/* Filter toggle */}
          <div className="inline-flex p-1 bg-white/5 border border-border rounded-xl mb-6">
            <FilterButton
              active={filter === 'available'}
              onClick={() => setFilter('available')}
              label="Disponíveis"
              count={counts.available}
            />
            <FilterButton
              active={filter === 'participating'}
              onClick={() => setFilter('participating')}
              label="Participando"
              count={counts.participating}
            />
          </div>

          {visible.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary">
                {filter === 'available'
                  ? 'Nenhuma Review disponível no momento.'
                  : 'Você ainda não está participando de nenhuma Review.'}
              </p>
            </div>
          ) : filter === 'participating' ? (
            <div className="space-y-3">
              {visible.map(campaign => {
                const app = applications.find(a => a.campaignId === campaign.id);
                if (!app || !user) return null;
                return (
                  <ParticipatingCard
                    key={campaign.id}
                    campaign={campaign}
                    application={app}
                    userId={user.id}
                    onWithdraw={mutateApplications}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {visible.map(campaign => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  application={applications.find(a => a.campaignId === campaign.id) || null}
                  onApply={() => handleApply(campaign.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Paywall
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        context="campaigns"
      />

      {showIncomplete && (
        <Modal isOpen onClose={() => setShowIncomplete(false)} title="Perfil Incompleto">
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">
              Para se candidatar a uma Review, você precisa preencher todos os campos do seu perfil. Faltam:
            </p>
            <ul className="space-y-1">
              {missingFields.map(field => (
                <li key={field} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-popline-purple shrink-0" />
                  {field}
                </li>
              ))}
            </ul>
            <Button variant="secondary" className="w-full" onClick={() => setShowIncomplete(false)}>
              Fechar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const REVIEW_STEPS = [
  {
    title: 'Candidate-se',
    desc: 'Escolha uma oportunidade de Review aberta e envie sua candidatura.',
    icon: (
      <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    ),
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

function ReviewsIntro() {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-popline-purple bg-surface shadow-[0_0_28px_-4px_var(--color-popline-purple),inset_0_0_24px_-14px_var(--color-popline-purple)]">
      {/* Brilho roxo de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--color-popline-purple) 0%, transparent 70%)', opacity: 0.25 }}
      />

      <div className="relative px-6 py-12 sm:px-10 sm:py-14 text-center">
        <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-popline-purple/15 text-popline-purple-light border border-popline-purple/40 mb-6">
          Nova categoria
        </span>

        {/* Logo POPline Creators Review (wordmark neon) */}
        <Image
          src="/popline-review-logo.png"
          alt="POPline Creators Review"
          width={1400}
          height={730}
          priority
          className="mx-auto mb-6 h-auto w-full max-w-md drop-shadow-[0_0_28px_rgba(124,58,237,0.45)]"
        />

        <div className="max-w-2xl mx-auto space-y-4 text-text-secondary leading-relaxed">
          <p>
            Chegou o <strong className="text-text-primary">POPline Creators Review</strong>, a nova
            oportunidade para transformar sua opinião sobre música em remuneração.
          </p>
          <p>
            Agora, além das campanhas tradicionais, você pode se candidatar para produzir reviews de
            singles, EPs, álbuns e outros lançamentos do mercado musical. Sua missão é criar conteúdos
            autênticos, criativos e relevantes, compartilhando análises, primeiras impressões,
            recomendações e pontos de vista que conectem sua audiência aos novos lançamentos.
          </p>
          <p>
            Cada review aprovado é uma campanha remunerada. Basta se candidatar às oportunidades
            disponíveis, seguir o briefing e publicar o conteúdo dentro do prazo estabelecido.
          </p>
          <p>
            Se você ama música, acompanha os lançamentos e sabe transformar sua opinião em conteúdo
            de qualidade, essa é a sua chance de monetizar sua voz e fazer parte das principais
            campanhas da indústria musical com o POPline Creators.
          </p>
        </div>

        {/* Como funciona — 3 passos */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3 text-left">
          {REVIEW_STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-border bg-background/60 p-5 transition-colors hover:border-popline-purple/40"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-popline-purple/15 text-popline-purple-light">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {step.icon}
                </svg>
              </div>
              <span className="absolute right-4 top-4 text-2xl font-bold text-popline-purple/20">
                {i + 1}
              </span>
              <h3 className="font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-text-secondary leading-snug">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Selo de status */}
        <div className="mt-10 inline-flex items-center gap-2.5 rounded-full border border-popline-purple/40 bg-popline-purple/10 px-5 py-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-popline-purple-light opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-popline-purple-light" />
          </span>
          <span className="text-sm font-semibold text-popline-purple-light">
            Aguarde a abertura do primeiro Review
          </span>
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
        active ? 'bg-popline-purple text-white' : 'text-text-secondary hover:text-white'
      }`}
    >
      {label}
      <span
        className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/20' : 'bg-white/5'
        }`}
      >
        {count}
      </span>
    </button>
  );
}
