'use client';

import { useState, useMemo, useEffect, type ReactNode } from 'react';
import useSWR from 'swr';
import { pixelCustom, pixelViewContent } from '@/lib/pixel';
import { trackPaywallShown } from '@/lib/paywall-tracking';
import { useAuth } from '@/providers/AuthProvider';
import * as campaignService from '@/services/campaigns';
import * as userService from '@/services/users';
import * as subService from '@/services/subscriptions';
import { getProfileCompleteness } from '@/lib/profile';
import { CURRENT_TERM_VERSION } from '@/lib/constants';
import {
  CAMPAIGN_CATEGORIES,
  belongsToSubTab,
  isHiddenFromDiscovery,
} from '@/lib/campaign-categories';
import type { CampaignCategory } from '@/types';
import CampaignCard from '@/components/dashboard/CampaignCard';
import ParticipatingCard from '@/components/dashboard/ParticipatingCard';
import FilterToggle from '@/components/dashboard/FilterToggle';
import CampaignTermModal from '@/components/campaigns/CampaignTermModal';
import Paywall from '@/components/ui/Paywall';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

type Filter = 'available' | 'participating';

interface CategoryCampaignsPageProps {
  category: CampaignCategory;
  /** Hero exibido quando a categoria ainda não tem nenhuma campanha. */
  intro?: ReactNode;
  /**
   * Exigir aceite do termo (RPC apply_with_term + e-mail) em vez do insert cru.
   * Default true. Ver comentário em handleApply.
   */
  requireTerm?: boolean;
}

/**
 * Corpo compartilhado das sub-abas de campanha (/dashboard/campanhas e suas
 * sub-rotas por categoria). Antes era um arquivo por aba, com ~250 linhas
 * duplicadas entre campanhas/ e reviews/.
 */
export default function CategoryCampaignsPage({
  category,
  intro,
  requireTerm = true,
}: CategoryCampaignsPageProps) {
  const { user } = useAuth();
  const def = CAMPAIGN_CATEGORIES[category];
  const copy = def.tabCopy;

  const [filter, setFilter] = useState<Filter>('available');
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [termForCampaignId, setTermForCampaignId] = useState<string | null>(null);
  const [termLoading, setTermLoading] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);

  useEffect(() => {
    if (copy) pixelViewContent({ content_name: copy.pixelContentName });
  }, [copy]);

  // Mesma chave global de sempre: as sub-abas compartilham o cache do SWR.
  const { data: campaigns = [], error, isLoading } = useSWR(
    'campaigns',
    campaignService.getAllCampaigns
  );
  const { data: applications = [], mutate: mutateApplications } = useSWR(
    user ? ['applications', user.id] : null,
    ([, uid]) => campaignService.getUserApplications(uid)
  );

  const appliedIds = useMemo(
    () => new Set(applications.map(a => a.campaignId)),
    [applications]
  );

  const ofCategory = useMemo(
    () => campaigns.filter(c => belongsToSubTab(c, category)),
    [campaigns, category]
  );

  // Convite nunca entra em "Disponíveis" — só aparece em "Participando", depois
  // que o admin adiciona o usuário. Nas sub-abas dedicadas o filtro é inócuo.
  const available = useMemo(
    () =>
      ofCategory.filter(
        c => c.status === 'open' && !appliedIds.has(c.id) && !isHiddenFromDiscovery(c)
      ),
    [ofCategory, appliedIds]
  );
  const participating = useMemo(
    () => ofCategory.filter(c => appliedIds.has(c.id)),
    [ofCategory, appliedIds]
  );
  const visible = filter === 'available' ? available : participating;

  const runApply = async (campaignId: string) => {
    const campaign = ofCategory.find(c => c.id === campaignId);
    pixelCustom('AppliedToCampaign', {
      campaign_id: campaignId,
      campaign_title: campaign?.title,
    });
    if (user) {
      fetch('/api/email/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'application-received',
          data: { userId: user.id, campaignTitle: campaign?.title ?? '' },
        }),
      }).catch(() => {});
    }
    // Revalida em vez de usar o retorno: apply_with_term devolve a application
    // parcial (sem joined_whatsapp_group/joined_at), então não serve como estado.
    mutateApplications();
  };

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

    if (!requireTerm) {
      await campaignService.applyToCampaign(campaignId, user.id);
      await runApply(campaignId);
      return;
    }

    // Abre o termo antes de efetivar — o aceite é registrado em
    // campaign_term_acceptances pela RPC, junto da criação da candidatura.
    setTermError(null);
    setTermForCampaignId(campaignId);
  };

  const handleAcceptTerm = async () => {
    if (!termForCampaignId) return;
    setTermLoading(true);
    setTermError(null);
    const result = await campaignService.applyToCampaignWithTerm(
      termForCampaignId,
      CURRENT_TERM_VERSION
    );
    setTermLoading(false);
    if (!result.success) {
      setTermError(result.error);
      return;
    }
    await runApply(termForCampaignId);
    setTermForCampaignId(null);
  };

  // Hero só quando a categoria realmente não tem campanha. Sem o guard de
  // error/isLoading, uma falha de rede renderizaria "aguarde a abertura" como se
  // a categoria estivesse vazia — os fetchers descartam o erro e devolvem [].
  const showIntro = Boolean(intro) && ofCategory.length === 0 && !error && !isLoading;

  return (
    <>
      {showIntro ? (
        intro
      ) : (
        <>
          <FilterToggle
            value={filter}
            onChange={setFilter}
            activeClass={def.theme.filterActive}
            options={[
              { value: 'available', label: 'Disponíveis', count: available.length },
              { value: 'participating', label: 'Participando', count: participating.length },
            ]}
          />

          {visible.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary">
                {filter === 'available' ? copy?.emptyAvailable : copy?.emptyParticipating}
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

      <Paywall isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} context="campaigns" />

      <CampaignTermModal
        isOpen={termForCampaignId !== null}
        onClose={() => {
          if (termLoading) return;
          setTermForCampaignId(null);
          setTermError(null);
        }}
        onAccept={handleAcceptTerm}
        loading={termLoading}
      />
      {termError && termForCampaignId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-xl">
          {termError}
        </div>
      )}

      {showIncomplete && (
        <Modal isOpen onClose={() => setShowIncomplete(false)} title="Perfil Incompleto">
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">{copy?.incompleteProfileIntro}</p>
            <ul className="space-y-1">
              {missingFields.map(field => (
                <li key={field} className="flex items-center gap-2 text-sm">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${def.theme.bullet}`} />
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
    </>
  );
}
