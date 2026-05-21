'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { Campaign, CampaignApplication, CampaignDelivery, CampaignNoticeCounts, DeliveryRevision, PublicationRevision } from '@/types';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import * as deliveryService from '@/services/deliveries';
import * as walletService from '@/services/wallet';
import * as campaignService from '@/services/campaigns';
import * as revisionsService from '@/services/delivery-revisions';
import * as pubRevisionsService from '@/services/publication-revisions';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import CampaignNotices from './CampaignNotices';
import CreatorProgressBar from './CreatorProgressBar';

interface Props {
  campaign: Campaign;
  application: CampaignApplication;
  userId: string;
  noticeCounts?: CampaignNoticeCounts;
  onNoticesRead?: () => void;
  onWithdraw?: () => void;
}

const appStatusMap: Record<CampaignApplication['status'], { label: string; variant: 'warning' | 'success' | 'default' | 'pink' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  approved: { label: 'Participando', variant: 'success' },
  rejected: { label: 'Recusada', variant: 'default' },
};

export default function ParticipatingCard({ campaign, application, userId, noticeCounts, onNoticesRead, onWithdraw }: Props) {
  const [open, setOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<CampaignDelivery[]>([]);
  const [revisionsByDelivery, setRevisionsByDelivery] = useState<Map<string, DeliveryRevision[]>>(new Map());
  const [pubRevisionsByDelivery, setPubRevisionsByDelivery] = useState<Map<string, PublicationRevision[]>>(new Map());
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [revisionUrlDrafts, setRevisionUrlDrafts] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedPubId, setSavedPubId] = useState<string | null>(null);
  const [savedRevisionId, setSavedRevisionId] = useState<string | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    if (application.status !== 'approved') {
      setDeliveries([]);
      return;
    }
    const count = campaign.deliveryCount ?? 1;
    const list = await deliveryService.ensureDeliveries(campaign.id, userId, count);
    setDeliveries(list);
    setUrlDrafts(Object.fromEntries(list.map(d => [d.id, d.contentUrl || ''])));

    // Busca revisões de cada delivery e agrupa
    const allRevisions = await revisionsService.getRevisionsForCampaign(campaign.id);
    const revMap = new Map<string, DeliveryRevision[]>();
    const draftMap: Record<string, string> = {};
    for (const rev of allRevisions) {
      const arr = revMap.get(rev.deliveryId) ?? [];
      arr.push(rev);
      revMap.set(rev.deliveryId, arr);
      draftMap[rev.id] = rev.revisedUrl ?? '';
    }
    setRevisionsByDelivery(revMap);
    setRevisionUrlDrafts(draftMap);

    // Busca revisões de publicação e agrupa por delivery
    const allPubRevisions = await pubRevisionsService.getPublicationRevisionsForCampaign(campaign.id);
    const pubMap = new Map<string, PublicationRevision[]>();
    for (const rev of allPubRevisions) {
      const arr = pubMap.get(rev.deliveryId) ?? [];
      arr.push(rev);
      pubMap.set(rev.deliveryId, arr);
    }
    setPubRevisionsByDelivery(pubMap);
  }, [campaign.id, campaign.deliveryCount, application.status, userId]);

  useLoadOnMount(load, [load]);

  const status = application.disqualifiedAt
    ? { label: 'Desclassificado', variant: 'default' as const }
    : appStatusMap[application.status];
  const canShowDeliveries = application.status === 'approved';
  const isActive = canShowDeliveries && !application.disqualifiedAt;

  const handleSaveUrl = async (deliveryId: string) => {
    const url = urlDrafts[deliveryId]?.trim() || null;
    await deliveryService.updateDelivery(deliveryId, { contentUrl: url });
    setSavedId(deliveryId);
    setTimeout(() => setSavedId(null), 1500);
    load();
  };

  const handleSaveRevisionUrl = async (revisionId: string) => {
    const url = revisionUrlDrafts[revisionId]?.trim() || null;
    if (!url) return;
    await revisionsService.setRevisedUrl(revisionId, url);
    setSavedRevisionId(revisionId);
    setTimeout(() => setSavedRevisionId(null), 1500);
    load();
  };

  const hasBriefingText = !!campaign.briefing?.trim();
  const hasBriefingFile = !!campaign.briefingFileUrl;
  const hasBriefing = hasBriefingText || hasBriefingFile;

  const handleDownloadBriefing = () => {
    if (!hasBriefingText) return;
    const safeTitle = campaign.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 50);
    const blob = new Blob([campaign.briefing!], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `briefing-${safeTitle || 'campanha'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenBriefingFile = async () => {
    if (!campaign.briefingFileUrl) return;
    const supabase = (await import('@/lib/supabase/client')).createClient();
    const { data, error: sErr } = await supabase.storage
      .from('campaign-briefings')
      .createSignedUrl(campaign.briefingFileUrl, 3600);
    if (sErr || !data?.signedUrl) {
      alert('Não foi possível abrir o briefing. Tente novamente.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    await campaignService.withdrawApplication(application.id);
    setConfirmWithdraw(false);
    onWithdraw?.();
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
            {noticeCounts && noticeCounts.unread > 0 && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-black"
                title={`${noticeCounts.unread} aviso${noticeCounts.unread > 1 ? 's' : ''} não lido${noticeCounts.unread > 1 ? 's' : ''}`}
              >
                {noticeCounts.unread} novo{noticeCounts.unread > 1 ? 's' : ''}
              </span>
            )}
            {noticeCounts && noticeCounts.read > 0 && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white"
                title={`${noticeCounts.read} aviso${noticeCounts.read > 1 ? 's' : ''} lido${noticeCounts.read > 1 ? 's' : ''}`}
              >
                {noticeCounts.read} lido{noticeCounts.read > 1 ? 's' : ''}
              </span>
            )}
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

      {confirmWithdraw && (
        <Modal isOpen onClose={() => setConfirmWithdraw(false)} title="Retirar candidatura">
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">
              Tem certeza que deseja retirar sua candidatura de <strong>{campaign.title}</strong>? Você poderá se candidatar novamente enquanto a campanha estiver aberta.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmWithdraw(false)}>
                Cancelar
              </Button>
              <Button variant="danger" className="flex-1" disabled={withdrawing} onClick={handleWithdraw}>
                {withdrawing ? 'Retirando...' : 'Retirar candidatura'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showBriefing && hasBriefing && (
        <Modal isOpen onClose={() => setShowBriefing(false)} title={`Briefing · ${campaign.title}`}>
          <div className="space-y-4">
            {hasBriefingText && (
              <div className="max-h-96 overflow-y-auto p-4 rounded-xl bg-background border border-border">
                <p className="text-sm whitespace-pre-line">{campaign.briefing}</p>
              </div>
            )}
            {hasBriefingFile && (
              <div className="p-3 rounded-xl bg-popline-pink/10 border border-popline-pink/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Arquivo do briefing</p>
                  <p className="text-xs text-text-secondary truncate">
                    {campaign.briefingFileUrl?.split('/').pop()}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={handleOpenBriefingFile}>
                  Abrir arquivo
                </Button>
              </div>
            )}
            {!hasBriefingText && !hasBriefingFile && (
              <p className="text-sm text-text-secondary italic">Briefing ainda não disponível.</p>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowBriefing(false)}>
                Fechar
              </Button>
              {hasBriefingText && (
                <Button className="flex-1" onClick={handleDownloadBriefing}>
                  Baixar texto
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-2 space-y-4 border-t border-border">
            {application.disqualifiedAt && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40">
                <p className="text-sm font-semibold text-red-300">Você foi desclassificado(a) desta campanha</p>
                {application.disqualificationReason && (
                  <p className="text-xs text-red-200/90 mt-1 whitespace-pre-line">
                    Motivo: {application.disqualificationReason}
                  </p>
                )}
              </div>
            )}

            {canShowDeliveries && !application.disqualifiedAt && (
              <CreatorProgressBar application={application} deliveries={deliveries} className="pt-2" />
            )}

            {isActive && !application.joinedWhatsappGroup && (
              campaign.whatsappGroupLink ? (
                <a
                  href={campaign.whatsappGroupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15 transition-colors"
                >
                  <p className="text-sm font-semibold text-emerald-300">Entre no grupo do WhatsApp →</p>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Toque aqui para acessar o grupo da campanha
                  </p>
                </a>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm font-semibold text-amber-300">Aguarde o link do grupo do WhatsApp</p>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    A equipe ainda vai disponibilizar o link. Volte em instantes.
                  </p>
                </div>
              )
            )}

            <p className="text-sm text-text-secondary whitespace-pre-line">{campaign.description}</p>

            {/* Detalhes de compensação */}
            {(campaign.hasCache || campaign.hasPermuta || campaign.hasCommission) && (
              <div className="p-3 rounded-lg bg-background border border-border space-y-1.5">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Compensação</p>
                {campaign.hasCache && campaign.cache > 0 && (
                  <p className="text-sm">
                    <span className="text-emerald-400 font-medium">Cachê:</span>{' '}
                    {walletService.formatBRL(campaign.cache)}
                  </p>
                )}
                {campaign.hasPermuta && (
                  <p className="text-sm">
                    <span className="text-sky-400 font-medium">Permuta:</span>{' '}
                    {campaign.permutaDescription || 'Detalhes a combinar'}
                  </p>
                )}
                {campaign.hasCommission && (
                  <p className="text-sm">
                    <span className="text-purple-400 font-medium">Comissão:</span>{' '}
                    {campaign.commissionPercentage != null ? `${campaign.commissionPercentage}% sobre vendas` : 'Comissão sobre vendas'}
                    {campaign.commissionDescription ? ` — ${campaign.commissionDescription}` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Avisos: só carrega quando card aberto para economizar requests */}
            {open && isActive && (
              <CampaignNotices
                campaignId={campaign.id}
                userId={userId}
                onReadsChanged={onNoticesRead}
              />
            )}

            {application.status === 'pending' && onWithdraw && (
              <Button
                variant="danger"
                size="sm"
                className="w-fit"
                onClick={e => { e.stopPropagation(); setConfirmWithdraw(true); }}
              >
                Retirar candidatura
              </Button>
            )}

            {isActive ? (
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
                    {deliveries.map(d => {
                      const status = d.deliverableStatus ?? 'pending';
                      const statusBadge =
                        status === 'approved'
                          ? { label: 'Aprovado ✓', variant: 'success' as const }
                          : status === 'needs_revision'
                            ? { label: 'Precisa de correção', variant: 'pink' as const }
                            : { label: 'Aguardando análise', variant: 'warning' as const };
                      const revs = revisionsByDelivery.get(d.id) ?? [];
                      const lastRev = revs.length > 0 ? revs[revs.length - 1] : null;
                      // URL original só é editável quando ainda não há revisões pedidas
                      // E a entrega não foi aprovada
                      const originalEditable = status !== 'approved' && revs.length === 0;
                      return (
                        <div key={d.id} className="p-3 rounded-xl bg-background border border-border space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium">Entrega {d.index}</p>
                            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                          </div>

                          {d.scheduledDate ? (
                            <div className="p-2 rounded-lg bg-background border border-border space-y-1.5">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">
                                  Entrega original
                                </p>
                                {status === 'approved' && !revs.some(r => r.approvedAt != null) && (
                                  <Badge variant="success">✓ Aprovada</Badge>
                                )}
                              </div>
                              {originalEditable ? (
                                <div className="flex gap-2 flex-col sm:flex-row">
                                  <input
                                    type="url"
                                    value={urlDrafts[d.id] ?? ''}
                                    onChange={e => setUrlDrafts(prev => ({ ...prev, [d.id]: e.target.value }))}
                                    placeholder="https://drive.google.com/..."
                                    maxLength={500}
                                    inputMode="url"
                                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink"
                                  />
                                  <Button size="sm" onClick={() => handleSaveUrl(d.id)}>
                                    {savedId === d.id ? 'Salvo ✓' : 'Salvar URL'}
                                  </Button>
                                </div>
                              ) : d.contentUrl ? (
                                <a
                                  href={d.contentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-sm text-popline-pink hover:underline truncate"
                                >
                                  {d.contentUrl}
                                </a>
                              ) : (
                                <p className="text-sm text-text-secondary italic">Não enviada</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-text-secondary italic">
                              Aguarde pelas datas das suas entregas
                            </p>
                          )}

                          {revs.length > 0 && (
                            <div className="space-y-2">
                              {revs.map(rev => {
                                const isLast = lastRev != null && rev.id === lastRev.id;
                                const showInput = isLast && status === 'needs_revision';
                                return (
                                  <div
                                    key={rev.id}
                                    className="p-2 rounded-lg bg-popline-pink/10 border border-popline-pink/30 text-xs"
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-popline-light">
                                          Correção {String(rev.round).padStart(2, '0')}
                                        </p>
                                        {rev.approvedAt && <Badge variant="success">✓ Aprovada</Badge>}
                                      </div>
                                      <span className="text-text-secondary">
                                        Prazo: <strong className="text-text-primary">{new Date(rev.dueDate).toLocaleDateString('pt-BR')}</strong>
                                      </span>
                                    </div>
                                    <p className="text-text-primary whitespace-pre-line mt-1">{rev.note}</p>
                                    {rev.revisedUrl && !showInput && (
                                      <div className="mt-1.5">
                                        <span className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">URL enviada</span>
                                        <a
                                          href={rev.revisedUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block text-popline-pink hover:underline truncate"
                                        >
                                          {rev.revisedUrl}
                                        </a>
                                      </div>
                                    )}
                                    {showInput && (
                                      <div className="mt-2">
                                        <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium mb-1">
                                          URL da versão corrigida
                                        </p>
                                        <div className="flex gap-2 flex-col sm:flex-row">
                                          <input
                                            type="url"
                                            value={revisionUrlDrafts[rev.id] ?? ''}
                                            onChange={e => setRevisionUrlDrafts(prev => ({ ...prev, [rev.id]: e.target.value }))}
                                            placeholder="https://drive.google.com/..."
                                            maxLength={500}
                                            inputMode="url"
                                            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink"
                                          />
                                          <Button size="sm" onClick={() => handleSaveRevisionUrl(rev.id)}>
                                            {savedRevisionId === rev.id ? 'Salvo ✓' : 'Salvar URL'}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {status === 'approved' && d.publicationDate && (
                            <PublicationBlock
                              delivery={d}
                              revisions={pubRevisionsByDelivery.get(d.id) ?? []}
                              onSaved={() => {
                                setSavedPubId(d.id);
                                setTimeout(() => setSavedPubId(null), 1500);
                                load();
                              }}
                              savedFlash={savedPubId === d.id}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : application.disqualifiedAt ? null : (
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

function PublicationBlock({
  delivery,
  revisions,
  onSaved,
  savedFlash,
}: {
  delivery: CampaignDelivery;
  revisions: PublicationRevision[];
  onSaved: () => void;
  savedFlash: boolean;
}) {
  const status = delivery.publicationStatus ?? 'pending';
  const platforms = delivery.publicationPlatforms ?? [];
  const initialUrls = delivery.publicationUrls ?? {};
  const [urls, setUrls] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of platforms) init[p] = initialUrls[p] ?? '';
    return init;
  });
  const lastRev = revisions.length > 0 ? revisions[revisions.length - 1] : null;
  const [revUrls, setRevUrls] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (lastRev) for (const p of platforms) init[p] = lastRev.revisedUrls[p] ?? '';
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [savedRevFlash, setSavedRevFlash] = useState(false);

  const statusBadge =
    status === 'confirmed'
      ? { label: 'Publicação confirmada ✓', variant: 'success' as const }
      : status === 'needs_resubmit'
        ? { label: 'Pedir reenvio', variant: 'pink' as const }
        : status === 'not_confirmed'
          ? { label: 'Não confirmada', variant: 'default' as const }
          : { label: 'Aguardando confirmação', variant: 'warning' as const };

  const hasAnyUrl = platforms.some(p => (urls[p] ?? '').trim().length > 0);
  const dirty = platforms.some(p => (urls[p] ?? '') !== (initialUrls[p] ?? ''));

  // URLs originais só editáveis quando ainda não há revisões e status != confirmed
  const originalEditable = status !== 'confirmed' && revisions.length === 0;
  // Se há revisões, a aprovação implícita pode estar na última (com approved_at) ou na original
  const originalApproved = status === 'confirmed' && !revisions.some(r => r.approvedAt != null);

  const handleSaveAll = async () => {
    setSaving(true);
    const cleaned: Record<string, string> = {};
    for (const p of platforms) {
      const v = (urls[p] ?? '').trim();
      if (v) cleaned[p] = v;
    }
    const firstUrl = platforms.map(p => cleaned[p]).find(Boolean) ?? null;
    await deliveryService.updateDelivery(delivery.id, {
      publicationUrls: cleaned,
      publicationUrl: firstUrl,
    });
    setSaving(false);
    onSaved();
  };

  const handleSaveRevisionUrls = async () => {
    if (!lastRev) return;
    const cleaned: Record<string, string> = {};
    for (const p of platforms) {
      const v = (revUrls[p] ?? '').trim();
      if (v) cleaned[p] = v;
    }
    if (Object.keys(cleaned).length === 0) return;
    setSaving(true);
    await pubRevisionsService.setPublicationRevisionUrls(lastRev.id, cleaned);
    setSaving(false);
    setSavedRevFlash(true);
    setTimeout(() => setSavedRevFlash(false), 1500);
    onSaved();
  };

  return (
    <div className="mt-2 pt-2 border-t border-border/60 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">
          Publicação
        </p>
        {hasAnyUrl && <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>}
      </div>
      <p className="text-xs text-text-secondary">
        Publicar em{' '}
        <strong className="text-text-primary">
          {new Date(delivery.publicationDate!).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </strong>
      </p>
      {delivery.publicationCaption && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium mb-1">
            Sugestão de legenda
          </p>
          <p className="text-xs text-text-primary whitespace-pre-line p-2 rounded-md bg-background border border-border">
            {delivery.publicationCaption}
          </p>
        </div>
      )}

      {platforms.length === 0 ? (
        <p className="text-xs text-text-secondary italic">
          Plataformas ainda não definidas pelo admin
        </p>
      ) : (
        <>
          {/* URLs originais (editáveis só se nenhuma revisão e não confirmado) */}
          <div className="p-2 rounded-lg bg-background border border-border space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">
                Publicações originais
              </p>
              {originalApproved && <Badge variant="success">✓ Aprovada</Badge>}
            </div>
            {platforms.map(p => (
              <div key={p}>
                <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium mb-1">
                  URL no {p}
                </p>
                {originalEditable ? (
                  <input
                    type="url"
                    value={urls[p] ?? ''}
                    onChange={e => setUrls(prev => ({ ...prev, [p]: e.target.value }))}
                    placeholder={`https://${p.toLowerCase()}.com/...`}
                    maxLength={500}
                    inputMode="url"
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink"
                  />
                ) : initialUrls[p] ? (
                  <a
                    href={initialUrls[p]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-popline-pink hover:underline truncate"
                  >
                    {initialUrls[p]}
                  </a>
                ) : (
                  <p className="text-xs text-text-secondary italic">Não enviada</p>
                )}
              </div>
            ))}
            {originalEditable && (
              <Button size="sm" variant="secondary" onClick={handleSaveAll} disabled={!dirty || saving}>
                {saving ? 'Salvando...' : savedFlash ? 'Salvo ✓' : 'Salvar URLs'}
              </Button>
            )}
          </div>

          {/* Lista de reenvios */}
          {revisions.length > 0 && (
            <div className="space-y-2">
              {revisions.map(rev => {
                const isLast = lastRev != null && rev.id === lastRev.id;
                const showInputs = isLast && status === 'needs_resubmit';
                return (
                  <div
                    key={rev.id}
                    className="p-2 rounded-lg bg-popline-pink/10 border border-popline-pink/30 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-popline-light">
                          Reenvio {String(rev.round).padStart(2, '0')}
                        </p>
                        {rev.approvedAt && <Badge variant="success">✓ Aprovada</Badge>}
                      </div>
                      <span className="text-text-secondary">
                        Prazo: <strong className="text-text-primary">{new Date(rev.dueDate).toLocaleDateString('pt-BR')}</strong>
                      </span>
                    </div>
                    {rev.note && <p className="text-text-primary whitespace-pre-line">{rev.note}</p>}

                    {platforms.map(p => (
                      <div key={p}>
                        <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium mb-1">
                          URL no {p}
                        </p>
                        {showInputs ? (
                          <input
                            type="url"
                            value={revUrls[p] ?? ''}
                            onChange={e => setRevUrls(prev => ({ ...prev, [p]: e.target.value }))}
                            placeholder={`https://${p.toLowerCase()}.com/...`}
                            maxLength={500}
                            inputMode="url"
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink"
                          />
                        ) : rev.revisedUrls[p] ? (
                          <a
                            href={rev.revisedUrls[p]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-popline-pink hover:underline truncate"
                          >
                            {rev.revisedUrls[p]}
                          </a>
                        ) : (
                          <p className="text-text-secondary italic">Não enviada</p>
                        )}
                      </div>
                    ))}

                    {showInputs && (
                      <Button size="sm" onClick={handleSaveRevisionUrls} disabled={saving}>
                        {saving ? 'Salvando...' : savedRevFlash ? 'Salvo ✓' : 'Salvar URLs do reenvio'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
