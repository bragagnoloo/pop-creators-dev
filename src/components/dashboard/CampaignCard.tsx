'use client';

import { Campaign, CampaignApplication } from '@/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface CampaignCardProps {
  campaign: Campaign;
  application?: CampaignApplication | null;
  onApply: () => void;
}

const appStatusMap: Record<CampaignApplication['status'], { label: string; variant: 'warning' | 'success' | 'default' | 'pink' }> = {
  pending: { label: 'Inscrito - Pendente', variant: 'warning' },
  approved: { label: 'Aprovado', variant: 'success' },
  rejected: { label: 'Rejeitado', variant: 'default' },
};

export default function CampaignCard({ campaign, application, onApply }: CampaignCardProps) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-4 mb-3">
        {campaign.imageUrl ? (
          <img src={campaign.imageUrl} alt={campaign.title} className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg">{campaign.title}</h3>
          <Badge variant="success">Inscricoes Abertas</Badge>
        </div>
      </div>

      <p className="text-sm text-text-secondary flex-1 mb-4 line-clamp-3">
        {campaign.description}
      </p>

      <div className="flex items-center justify-end">
        {application ? (
          <Badge variant={appStatusMap[application.status].variant}>
            {appStatusMap[application.status].label}
          </Badge>
        ) : (
          <Button size="sm" onClick={onApply}>Participar</Button>
        )}
      </div>
    </Card>
  );
}
