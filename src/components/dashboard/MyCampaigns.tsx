'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Campaign, CampaignApplication } from '@/types';
import * as campaignService from '@/services/campaigns';
import Badge from '@/components/ui/Badge';
import ParticipatingCard from './ParticipatingCard';

interface MyCampaignsProps {
  userId: string;
}

const appStatusMap: Record<CampaignApplication['status'], { label: string; variant: 'warning' | 'success' | 'default' | 'pink' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  approved: { label: 'Participando', variant: 'success' },
  rejected: { label: 'Rejeitado', variant: 'default' },
};

const campaignStatusLabel: Record<Campaign['status'], string> = {
  open: 'Inscricoes Abertas',
  in_progress: 'Em Andamento',
  completed: 'Finalizada',
};

function CampaignRow({ campaign, application }: { campaign: Campaign; application: CampaignApplication }) {
  const s = appStatusMap[application.status];
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-background border border-border">
      {campaign.imageUrl ? (
        <Image
          src={campaign.imageUrl}
          alt={campaign.title}
          width={40}
          height={40}
          className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
          sizes="40px"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{campaign.title}</h4>
        <p className="text-xs text-text-secondary mt-0.5">{campaignStatusLabel[campaign.status]}</p>
      </div>
      <Badge variant={s.variant}>{s.label}</Badge>
    </div>
  );
}

export default function MyCampaigns({ userId }: MyCampaignsProps) {
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    (async () => {
      setApplications(await campaignService.getUserApplications(userId));
      setCampaigns(await campaignService.getAllCampaigns());
    })();
  }, [userId]);

  const getCampaign = (id: string) => campaigns.find(c => c.id === id);

  const inscribed = applications.filter(a => a.status === 'pending');
  const participating = applications.filter(a => a.status === 'approved');
  const rejected = applications.filter(a => a.status === 'rejected');

  if (applications.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Participating */}
      {participating.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Minhas Campanhas</h2>
          <div className="space-y-3">
            {participating.map(app => {
              const campaign = getCampaign(app.campaignId);
              if (!campaign) return null;
              return (
                <ParticipatingCard
                  key={app.id}
                  campaign={campaign}
                  application={app}
                  userId={userId}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Inscribed (pending) */}
      {inscribed.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Inscricoes Pendentes</h2>
          <div className="space-y-3">
            {inscribed.map(app => {
              const campaign = getCampaign(app.campaignId);
              if (!campaign) return null;
              return <CampaignRow key={app.id} campaign={campaign} application={app} />;
            })}
          </div>
        </div>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Inscricoes Recusadas</h2>
          <div className="space-y-3">
            {rejected.map(app => {
              const campaign = getCampaign(app.campaignId);
              if (!campaign) return null;
              return <CampaignRow key={app.id} campaign={campaign} application={app} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
