'use client';

import Image from 'next/image';
import { Campaign, CampaignApplication } from '@/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatBRL } from '@/services/wallet';

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

function CompensationChips({ campaign }: { campaign: Campaign }) {
  const chips: { key: string; className: string; label: string }[] = [];
  if (campaign.hasCache && campaign.cache > 0) {
    chips.push({
      key: 'cache',
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      label: formatBRL(campaign.cache),
    });
  }
  if (campaign.hasPermuta) {
    chips.push({
      key: 'permuta',
      className: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      label: 'Permuta',
    });
  }
  if (campaign.hasCommission) {
    const pct = campaign.commissionPercentage;
    chips.push({
      key: 'commission',
      className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      label: pct != null ? `${pct}% comissão` : 'Comissão',
    });
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {chips.map(c => (
        <span
          key={c.key}
          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${c.className}`}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

export default function CampaignCard({ campaign, application, onApply }: CampaignCardProps) {
  const showAcceptAllNote = !application && (
    (campaign.hasCache ? 1 : 0) + (campaign.hasPermuta ? 1 : 0) + (campaign.hasCommission ? 1 : 0)
  ) > 1;

  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-4 mb-3">
        {campaign.imageUrl ? (
          <Image
            src={campaign.imageUrl}
            alt={campaign.title}
            width={48}
            height={48}
            className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
            sizes="48px"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg">{campaign.title}</h3>
          <CompensationChips campaign={campaign} />
          <Badge variant="success">Inscricoes Abertas</Badge>
        </div>
      </div>

      <p className="text-sm text-text-secondary flex-1 mb-4 line-clamp-3">
        {campaign.description}
      </p>

      {showAcceptAllNote && (
        <p className="text-[11px] text-text-secondary/80 italic mb-3">
          Ao se candidatar, você aceita todos os tipos de compensação desta campanha.
        </p>
      )}

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
