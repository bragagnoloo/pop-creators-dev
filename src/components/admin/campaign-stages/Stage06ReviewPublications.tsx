'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import * as stagesService from '@/services/campaign-stages';
import DisqualifyModal from './DisqualifyModal';
import type { CampaignApplication, CampaignDelivery, UserProfile, PublicationStatus } from '@/types';

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

function notifyConfirmed(userId: string, campaignTitle: string) {
  fetch('/api/email/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'publication-confirmed',
      data: { userId, campaignTitle },
    }),
  }).catch(() => {});
}

function notifyResubmit(userId: string, campaignTitle: string, dueIso: string) {
  fetch('/api/email/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'publication-resubmit',
      data: {
        userId,
        campaignTitle,
        publicationDueDate: new Date(dueIso).toLocaleDateString('pt-BR'),
      },
    }),
  }).catch(() => {});
}

const STATUS_BADGE: Record<PublicationStatus, { label: string; variant: 'success' | 'warning' | 'default' | 'pink' }> = {
  pending: { label: 'Aguardando confirmação', variant: 'warning' },
  confirmed: { label: 'Publicação confirmada', variant: 'success' },
  not_confirmed: { label: 'Não confirmada', variant: 'default' },
  needs_resubmit: { label: 'Pedir reenvio', variant: 'pink' },
};

export default function Stage06ReviewPublications({ rows, campaignTitle, onChanged }: Props) {
  const [resubmitFor, setResubmitFor] = useState<{ delivery: CampaignDelivery; userId: string } | null>(null);
  const [disqualifyFor, setDisqualifyFor] = useState<RowItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const eligibleRows = rows
    .filter(r => !r.application.disqualifiedAt)
    .map(r => ({
      ...r,
      deliveries: r.deliveries.filter(
        d => d.deliverableStatus === 'approved' && d.publicationDate != null
      ),
    }))
    .filter(r => r.deliveries.length > 0);

  const handleConfirm = async (delivery: CampaignDelivery, userId: string) => {
    setBusyId(delivery.id);
    const result = await stagesService.setPublicationStatus(delivery.id, 'confirmed');
    setBusyId(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    notifyConfirmed(userId, campaignTitle);
    onChanged();
  };

  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 06 — Análise de publicações</h3>
      <p className="text-xs text-text-secondary mb-4">
        Confirme a publicação do conteúdo nas redes exigidas. Caso o criador descumpra,
        peça reenvio com nova data limite ou desclassifique com justificativa.
      </p>

      {eligibleRows.length === 0 ? (
        <p className="text-sm text-text-secondary italic">
          Nenhuma publicação agendada ainda. Conclua a Etapa 05 primeiro.
        </p>
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
                  const status = d.publicationStatus ?? 'pending';
                  const badge = STATUS_BADGE[status];
                  const hasUrl = !!d.publicationUrl;
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
                          {d.publicationPlatform && (
                            <span className="text-xs text-text-secondary">· {d.publicationPlatform}</span>
                          )}
                        </div>
                        {hasUrl ? (
                          <a
                            href={d.publicationUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-popline-pink hover:underline truncate inline-block max-w-full mt-1"
                          >
                            {d.publicationUrl}
                          </a>
                        ) : (
                          <p className="text-xs text-text-secondary italic mt-1">
                            Aguardando URL da publicação
                          </p>
                        )}
                        {status === 'needs_resubmit' && d.publicationDueDate && (
                          <p className="text-xs text-text-secondary mt-1">
                            Novo prazo:{' '}
                            <strong className="text-text-primary">
                              {new Date(d.publicationDueDate).toLocaleDateString('pt-BR')}
                            </strong>
                          </p>
                        )}
                      </div>
                      {hasUrl && status !== 'confirmed' && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => setResubmitFor({ delivery: d, userId: row.application.userId })}
                          >
                            Pedir reenvio
                          </Button>
                          <Button size="sm" disabled={busy} onClick={() => handleConfirm(d, row.application.userId)}>
                            {busy ? '...' : 'Confirmar'}
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

      {resubmitFor && (
        <ResubmitModal
          delivery={resubmitFor.delivery}
          onClose={() => setResubmitFor(null)}
          onDone={dueIso => {
            notifyResubmit(resubmitFor.userId, campaignTitle, dueIso);
            setResubmitFor(null);
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

function ResubmitModal({
  delivery,
  onClose,
  onDone,
}: {
  delivery: CampaignDelivery;
  onClose: () => void;
  onDone: (dueIso: string) => void;
}) {
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!due) {
      setError('Informe a nova data limite.');
      return;
    }
    const dueIso = new Date(due + 'T23:59:59').toISOString();
    if (new Date(dueIso).getTime() <= Date.now()) {
      setError('A data deve ser futura.');
      return;
    }
    setSaving(true);
    const result = await stagesService.setPublicationStatus(delivery.id, 'needs_resubmit', dueIso);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onDone(dueIso);
  };

  return (
    <Modal isOpen onClose={() => !saving && onClose()} title={`Pedir reenvio · Entrega ${delivery.index}`}>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          O criador será notificado de que precisa reenviar a publicação com nova data limite.
        </p>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Nova data limite
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
            {saving ? 'Salvando...' : 'Pedir reenvio'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
