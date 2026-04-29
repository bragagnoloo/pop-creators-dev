'use client';

import { useState, useMemo } from 'react';
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

export default function CampanhasPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('available');
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const { data: campaigns = [] } = useSWR('campaigns', campaignService.getAllCampaigns);
  const { data: applications = [], mutate: mutateApplications } = useSWR(
    user ? ['applications', user.id] : null,
    ([, uid]) => campaignService.getUserApplications(uid)
  );

  const appliedIds = useMemo(
    () => new Set(applications.map(a => a.campaignId)),
    [applications]
  );

  const visible = useMemo(() => {
    if (filter === 'available') {
      return campaigns.filter(c => c.status === 'open' && !appliedIds.has(c.id));
    }
    return campaigns.filter(c => appliedIds.has(c.id));
  }, [campaigns, appliedIds, filter]);

  const handleApply = async (campaignId: string) => {
    if (!user) return;
    if (!(await subService.isPaid(user.id))) {
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
    mutateApplications();
  };

  const counts = {
    available: campaigns.filter(c => c.status === 'open' && !appliedIds.has(c.id)).length,
    participating: campaigns.filter(c => appliedIds.has(c.id)).length,
  };

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-6">Campanhas</h1>

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
              ? 'Nenhuma campanha disponível no momento.'
              : 'Você ainda não está participando de nenhuma campanha.'}
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

      <Paywall
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="Candidatar-se a campanhas"
        description="Para se candidatar a campanhas você precisa ter um plano ativo."
      />

      {showIncomplete && (
        <Modal isOpen onClose={() => setShowIncomplete(false)} title="Perfil Incompleto">
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">
              Para se candidatar a uma campanha, você precisa preencher todos os campos do seu perfil. Faltam:
            </p>
            <ul className="space-y-1">
              {missingFields.map(field => (
                <li key={field} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-popline-pink shrink-0" />
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
        active ? 'bg-popline-pink text-white' : 'text-text-secondary hover:text-white'
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
