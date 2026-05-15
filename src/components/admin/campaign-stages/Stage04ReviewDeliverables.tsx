'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import * as stagesService from '@/services/campaign-stages';
import DisqualifyModal from './DisqualifyModal';
import type { CampaignApplication, CampaignDelivery, UserProfile, DeliverableStatus } from '@/types';

interface RowItem {
  application: CampaignApplication;
  profile: UserProfile | null;
  deliveries: CampaignDelivery[];
}

interface Props {
  rows: RowItem[];
  campaignTitle: string;
  onChanged: () => void;
}

function notifyDeliveryApproved(userId: string, campaignTitle: string, deliveryIndex: number) {
  fetch('/api/email/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'delivery-approved',
      data: { userId, campaignTitle, deliveryIndex },
    }),
  }).catch(() => {});
}

function notifyRevisionNeeded(
  userId: string,
  campaignTitle: string,
  deliveryIndex: number,
  revisionNote: string,
  revisionDueDate: string
) {
  fetch('/api/email/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'delivery-revision-needed',
      data: {
        userId,
        campaignTitle,
        deliveryIndex,
        revisionNote,
        revisionDueDate: new Date(revisionDueDate).toLocaleDateString('pt-BR'),
      },
    }),
  }).catch(() => {});
}

const STATUS_BADGE: Record<DeliverableStatus, { label: string; variant: 'success' | 'warning' | 'default' | 'pink' }> = {
  pending: { label: 'Aguardando análise', variant: 'warning' },
  approved: { label: 'Aprovado', variant: 'success' },
  needs_revision: { label: 'Precisa de correção', variant: 'pink' },
};

export default function Stage04ReviewDeliverables({ rows, campaignTitle, onChanged }: Props) {
  const [revisionFor, setRevisionFor] = useState<{ delivery: CampaignDelivery; userId: string } | null>(null);
  const [disqualifyFor, setDisqualifyFor] = useState<RowItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const eligibleRows = rows.filter(r => !r.application.disqualifiedAt);

  const handleApprove = async (delivery: CampaignDelivery, userId: string) => {
    setBusyId(delivery.id);
    const result = await stagesService.setDeliverableStatus(delivery.id, 'approved');
    setBusyId(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    notifyDeliveryApproved(userId, campaignTitle, delivery.index);
    onChanged();
  };

  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 04 — Análise de entregáveis</h3>
      <p className="text-xs text-text-secondary mb-4">
        Aprove ou peça correção em cada vídeo entregue pelos criadores. Quando precisar de
        correção, informe o motivo e uma nova data limite.
      </p>

      {eligibleRows.length === 0 ? (
        <p className="text-sm text-text-secondary italic">Nenhum participante para analisar.</p>
      ) : (
        <ul className="space-y-3">
          {eligibleRows.map(row => (
            <li key={row.application.id} className="p-3 rounded-xl border border-border bg-background">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Avatar src={row.profile?.photoUrl} name={row.profile?.fullName || ''} size="sm" />
                  <p className="text-sm font-medium truncate">{row.profile?.fullName || 'Sem nome'}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="!text-xs text-red-400 hover:!text-red-300"
                  onClick={() => setDisqualifyFor(row)}
                >
                  Desclassificar
                </Button>
              </div>
              <div className="space-y-2">
                {row.deliveries.map(d => {
                  const status = d.deliverableStatus ?? 'pending';
                  const badge = STATUS_BADGE[status];
                  const hasUrl = !!d.contentUrl;
                  const busy = busyId === d.id;
                  return (
                    <div
                      key={d.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-2 rounded-lg border border-border/60 bg-surface/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-text-secondary">Entrega {d.index}</span>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>
                        {hasUrl ? (
                          <a
                            href={d.contentUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-popline-pink hover:underline truncate inline-block max-w-full mt-1"
                          >
                            {d.contentUrl}
                          </a>
                        ) : (
                          <p className="text-xs text-text-secondary italic mt-1">
                            Aguardando URL do criador
                          </p>
                        )}
                        {status === 'needs_revision' && d.revisionNote && (
                          <p className="text-xs text-text-secondary mt-1">
                            <span className="text-popline-light">Nota:</span> {d.revisionNote}
                            {d.revisionDueDate && (
                              <span>
                                {' '}
                                · prazo {new Date(d.revisionDueDate).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      {hasUrl && status !== 'approved' && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => setRevisionFor({ delivery: d, userId: row.application.userId })}
                          >
                            Pedir correção
                          </Button>
                          <Button size="sm" disabled={busy} onClick={() => handleApprove(d, row.application.userId)}>
                            {busy ? '...' : 'Aprovar'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}

      {revisionFor && (
        <RevisionModal
          delivery={revisionFor.delivery}
          onClose={() => setRevisionFor(null)}
          onDone={(note, due) => {
            notifyRevisionNeeded(revisionFor.userId, campaignTitle, revisionFor.delivery.index, note, due);
            setRevisionFor(null);
            onChanged();
          }}
        />
      )}

      {disqualifyFor && (
        <DisqualifyModal
          applicationId={disqualifyFor.application.id}
          participantName={disqualifyFor.profile?.fullName ?? ''}
          onClose={() => setDisqualifyFor(null)}
          onDone={() => {
            setDisqualifyFor(null);
            onChanged();
          }}
        />
      )}
    </Card>
  );
}

function RevisionModal({
  delivery,
  onClose,
  onDone,
}: {
  delivery: CampaignDelivery;
  onClose: () => void;
  onDone: (note: string, dueIso: string) => void;
}) {
  const [note, setNote] = useState(delivery.revisionNote ?? '');
  const [due, setDue] = useState(
    delivery.revisionDueDate ? delivery.revisionDueDate.slice(0, 10) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (note.trim().length < 5) {
      setError('Descreva a correção (mínimo 5 caracteres).');
      return;
    }
    if (!due) {
      setError('Informe a nova data limite.');
      return;
    }
    const dueIso = new Date(due + 'T23:59:59').toISOString();
    if (new Date(dueIso).getTime() <= Date.now()) {
      setError('A nova data deve ser futura.');
      return;
    }
    setSaving(true);
    const result = await stagesService.setDeliverableStatus(delivery.id, 'needs_revision', {
      note: note.trim(),
      due: dueIso,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onDone(note.trim(), dueIso);
  };

  return (
    <Modal isOpen onClose={() => !saving && onClose()} title={`Correção · Entrega ${delivery.index}`}>
      <div className="space-y-4">
        <Textarea
          label="O que precisa ser ajustado?"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Ex: refazer a virada do refrão e cortar os 2s iniciais."
        />
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Nova data de entrega
          </label>
          <input
            type="date"
            value={due}
            onChange={e => setDue(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink min-h-11"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Solicitar correção'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
