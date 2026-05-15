'use client';

import Card from '@/components/ui/Card';
import type { Campaign } from '@/types';
import * as walletService from '@/services/wallet';

interface Props {
  campaign: Campaign;
}

export default function Stage00Opening({ campaign }: Props) {
  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 00 — Abertura</h3>
      <p className="text-xs text-text-secondary mb-4">
        Dados informados na criação. Edite a campanha para alterá-los.
      </p>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-text-secondary uppercase tracking-wide">Status</dt>
          <dd className="text-text-primary font-medium">{campaign.status}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary uppercase tracking-wide">Entregas por criador</dt>
          <dd className="text-text-primary font-medium">{campaign.deliveryCount ?? 1}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary uppercase tracking-wide">Prazo geral</dt>
          <dd className="text-text-primary font-medium">
            {campaign.deadline ? new Date(campaign.deadline).toLocaleDateString('pt-BR') : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary uppercase tracking-wide">Compensação</dt>
          <dd className="text-text-primary font-medium space-x-2">
            {campaign.hasCache && campaign.cache > 0 && (
              <span className="text-emerald-400">Cachê {walletService.formatBRL(campaign.cache)}</span>
            )}
            {campaign.hasPermuta && <span className="text-sky-400">Permuta</span>}
            {campaign.hasCommission && (
              <span className="text-purple-400">
                {campaign.commissionPercentage != null
                  ? `${campaign.commissionPercentage}% comissão`
                  : 'Comissão'}
              </span>
            )}
            {!campaign.hasCache && !campaign.hasPermuta && !campaign.hasCommission && '—'}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-text-secondary uppercase tracking-wide">Descrição</dt>
          <dd className="text-text-primary whitespace-pre-line">{campaign.description || '—'}</dd>
        </div>
      </dl>
    </Card>
  );
}
