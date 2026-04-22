'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { Campaign, CampaignApplication, CampaignDelivery } from '@/types';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import * as deliveryService from '@/services/deliveries';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface Props {
  campaign: Campaign;
  application: CampaignApplication;
  userId: string;
}

const appStatusMap: Record<CampaignApplication['status'], { label: string; variant: 'warning' | 'success' | 'default' | 'pink' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  approved: { label: 'Participando', variant: 'success' },
  rejected: { label: 'Recusada', variant: 'default' },
};

export default function ParticipatingCard({ campaign, application, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<CampaignDelivery[]>([]);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);

  const load = useCallback(async () => {
    if (application.status !== 'approved') {
      setDeliveries([]);
      return;
    }
    const count = campaign.deliveryCount ?? 1;
    const list = await deliveryService.ensureDeliveries(campaign.id, userId, count);
    setDeliveries(list);
    setUrlDrafts(Object.fromEntries(list.map(d => [d.id, d.contentUrl || ''])));
  }, [campaign.id, campaign.deliveryCount, application.status, userId]);

  useLoadOnMount(load, [load]);

  const status = appStatusMap[application.status];
  const canShowDeliveries = application.status === 'approved';

  const handleSaveUrl = async (deliveryId: string) => {
    const url = urlDrafts[deliveryId]?.trim() || null;
    await deliveryService.updateDelivery(deliveryId, { contentUrl: url });
    setSavedId(deliveryId);
    setTimeout(() => setSavedId(null), 1500);
    load();
  };

  const hasBriefing = !!campaign.briefing?.trim();

  const handleDownloadBriefing = () => {
    if (!hasBriefing) return;
    const safeTitle = campaign.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 50);
    const blob = new Blob([campaign.briefing!], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `briefing-${safeTitle || 'campanha'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="!p-0 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
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
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{campaign.title}</h3>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            {(() => {
              if (!canShowDeliveries) return null;
              const next = deliveries
                .filter(d => d.scheduledDate)
                .map(d => new Date(d.scheduledDate!).getTime())
                .sort((a, b) => a - b)[0];
              const count = `${deliveries.length} entrega${deliveries.length > 1 ? 's' : ''}`;
              return next
                ? `Próxima entrega: ${new Date(next).toLocaleDateString('pt-BR')} · ${count}`
                : count;
            })()}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-text-secondary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {showBriefing && hasBriefing && (
        <Modal isOpen onClose={() => setShowBriefing(false)} title={`Briefing · ${campaign.title}`}>
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto p-4 rounded-xl bg-background border border-border">
              <p className="text-sm whitespace-pre-line">{campaign.briefing}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowBriefing(false)}>
                Fechar
              </Button>
              <Button className="flex-1" onClick={handleDownloadBriefing}>
                Baixar briefing
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-2 space-y-4 border-t border-border">
            <p className="text-sm text-text-secondary whitespace-pre-line">{campaign.description}</p>

            {canShowDeliveries ? (
              <>
                {/* Briefing */}
                <div>
                  {hasBriefing ? (
                    <Button size="sm" variant="secondary" onClick={() => setShowBriefing(true)}>
                      Ver briefing
                    </Button>
                  ) : (
                    <p className="text-sm text-text-secondary italic">
                      Aguarde pela entrega do Briefing
                    </p>
                  )}
                </div>

                {deliveries.length === 0 ? (
                  <p className="text-sm text-text-secondary italic">Aguardando entregas serem configuradas.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Suas entregas</p>
                    {deliveries.map(d => (
                      <div key={d.id} className="p-3 rounded-xl bg-background border border-border space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium">Entrega {d.index}</p>
                          <p className="text-xs text-text-secondary">
                            {d.scheduledDate
                              ? `Data: ${new Date(d.scheduledDate).toLocaleDateString('pt-BR')}`
                              : 'Data a definir'}
                          </p>
                        </div>
                        {d.scheduledDate ? (
                          <div className="flex gap-2 flex-col sm:flex-row">
                            <input
                              type="url"
                              value={urlDrafts[d.id] ?? ''}
                              onChange={e => setUrlDrafts(prev => ({ ...prev, [d.id]: e.target.value }))}
                              placeholder="https://instagram.com/p/..."
                              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink"
                            />
                            <Button size="sm" onClick={() => handleSaveUrl(d.id)}>
                              {savedId === d.id ? 'Salvo ✓' : 'Salvar URL'}
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-text-secondary italic">
                            Aguarde pelas datas das suas entregas
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-text-secondary italic">
                {application.status === 'pending'
                  ? 'Sua candidatura está aguardando aprovação. Assim que aprovada, as entregas aparecem aqui.'
                  : 'Candidatura recusada.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
