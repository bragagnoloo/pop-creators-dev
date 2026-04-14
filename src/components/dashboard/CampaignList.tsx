'use client';

import { useState, useEffect } from 'react';
import { Campaign, CampaignApplication, UserProfile } from '@/types';
import * as campaignService from '@/services/campaigns';
import * as userService from '@/services/users';
import * as subService from '@/services/subscriptions';
import { getProfileCompleteness } from '@/lib/profile';
import CampaignCard from './CampaignCard';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import UgcLogo from '@/components/ui/UgcLogo';
import Paywall from '@/components/ui/Paywall';

interface CampaignListProps {
  userId: string;
  onEditProfile: () => void;
}

export default function CampaignList({ userId, onEditProfile }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    setCampaigns(campaignService.getAllCampaigns().filter(c => c.status === 'open'));
    setApplications(campaignService.getUserApplications(userId));
  }, [userId]);

  const handleApply = (campaignId: string) => {
    if (!subService.isPaid(userId)) {
      setPaywallOpen(true);
      return;
    }
    const profile = userService.getProfile(userId);
    if (!profile) return;

    const { complete, missing } = getProfileCompleteness(profile);
    if (!complete) {
      setMissingFields(missing);
      setShowIncomplete(true);
      return;
    }

    campaignService.applyToCampaign(campaignId, userId);
    setApplications(campaignService.getUserApplications(userId));
  };

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Nenhuma campanha disponivel no momento.</p>
        <p className="text-sm text-text-secondary mt-2">Enquanto isso, descubra mais oportunidades na UGC+:</p>
        <a
          href="https://ugcplus.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 mt-5 px-6 py-3 rounded-xl glass-card hover:border-popline-pink/30 transition-all group"
        >
          <UgcLogo size={28} className="group-hover:scale-110 transition-transform" />
          <div className="text-left">
            <span className="text-sm font-semibold text-text-primary block">Explorar campanhas na UGC+</span>
            <span className="text-xs text-text-secondary">Candidate-se a mais campanhas de criadores</span>
          </div>
          <svg className="w-4 h-4 text-text-secondary group-hover:text-popline-pink group-hover:translate-x-0.5 transition-all ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Campanhas Disponiveis</h2>

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
              Para se candidatar a uma campanha, voce precisa preencher todos os campos do seu perfil. Faltam:
            </p>
            <ul className="space-y-1">
              {missingFields.map(field => (
                <li key={field} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-popline-pink shrink-0" />
                  {field}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowIncomplete(false)}>
                Fechar
              </Button>
              <Button className="flex-1" onClick={() => { setShowIncomplete(false); onEditProfile(); }}>
                Editar Perfil
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {campaigns.map(campaign => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            application={applications.find(a => a.campaignId === campaign.id) || null}
            onApply={() => handleApply(campaign.id)}
          />
        ))}
      </div>
    </div>
  );
}
