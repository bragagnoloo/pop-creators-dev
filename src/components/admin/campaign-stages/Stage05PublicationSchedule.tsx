'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import * as stagesService from '@/services/campaign-stages';
import DisqualifyModal from './DisqualifyModal';
import type { CampaignApplication, CampaignDelivery, UserProfile } from '@/types';

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

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'YouTube Shorts', 'Reels', 'Outro'];

function notifyPublicationScheduled(
  userId: string,
  campaignTitle: string,
  deliveryIndex: number,
  dateIso: string,
  platform: string
) {
  fetch('/api/email/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'publication-scheduled',
      data: {
        userId,
        campaignTitle,
        deliveryIndex,
        publicationDate: new Date(dateIso).toLocaleString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        publicationPlatform: platform,
      },
    }),
  }).catch(() => {});
}

function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Stage05PublicationSchedule({ rows, campaignTitle, onChanged }: Props) {
  const [disqualifyFor, setDisqualifyFor] = useState<RowItem | null>(null);

  const eligibleRows = rows
    .filter(r => !r.application.disqualifiedAt)
    .map(r => ({
      ...r,
      deliveries: r.deliveries.filter(d => d.deliverableStatus === 'approved'),
    }))
    .filter(r => r.deliveries.length > 0);

  return (
    <Card>
      <h3 className="text-base font-semibold mb-1">Etapa 05 — Agenda de publicação</h3>
      <p className="text-xs text-text-secondary mb-4">
        Defina data e plataforma de publicação para cada entregável aprovado.
      </p>

      {eligibleRows.length === 0 ? (
        <p className="text-sm text-text-secondary italic">
          Nenhum entregável aprovado ainda. Conclua a Etapa 04 primeiro.
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
                {row.deliveries.map(d => (
                  <PublicationRow
                    key={`${d.id}-${d.publicationDate ?? 'n'}-${d.publicationPlatform ?? 'n'}`}
                    delivery={d}
                    userId={row.application.userId}
                    campaignTitle={campaignTitle}
                    onSaved={onChanged}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
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

function PublicationRow({
  delivery,
  userId,
  campaignTitle,
  onSaved,
}: {
  delivery: CampaignDelivery;
  userId: string;
  campaignTitle: string;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(toLocalDateTimeInput(delivery.publicationDate));
  const [platform, setPlatform] = useState(delivery.publicationPlatform ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const initialDate = toLocalDateTimeInput(delivery.publicationDate);
  const initialPlatform = delivery.publicationPlatform ?? '';
  const dirty = date !== initialDate || platform !== initialPlatform;

  const handleSave = async () => {
    setError(null);
    if (!date) {
      setError('Defina a data.');
      return;
    }
    if (!platform) {
      setError('Escolha a plataforma.');
      return;
    }
    setSaving(true);
    const iso = new Date(date).toISOString();
    const result = await stagesService.setPublicationSchedule(delivery.id, iso, platform);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
    notifyPublicationScheduled(userId, campaignTitle, delivery.index, iso, platform);
    onSaved();
  };

  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg border border-border/60 bg-surface/40">
      <p className="text-xs text-text-secondary">Entrega {delivery.index}</p>
      <div className="flex gap-2 flex-col sm:flex-row sm:items-center">
        <input
          type="datetime-local"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-popline-pink"
        />
        <select
          value={platform}
          onChange={e => setPlatform(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-popline-pink"
        >
          <option value="">Plataforma...</option>
          {PLATFORMS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <Button size="sm" variant="secondary" disabled={!dirty || saving} onClick={handleSave}>
          {saving ? '...' : savedFlash ? 'Salvo ✓' : 'Salvar'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
