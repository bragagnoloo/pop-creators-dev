'use client';

import { useCallback, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import * as stagesService from '@/services/campaign-stages';
import * as scheduleService from '@/services/publication-schedule';
import { useLoadOnMount } from '@/hooks/useLoadOnMount';
import DisqualifyModal from './DisqualifyModal';
import type { CampaignApplication, CampaignDelivery, UserProfile } from '@/types';

interface RowItem {
  application: CampaignApplication;
  profile: UserProfile | null;
  deliveries: CampaignDelivery[];
}

interface Props {
  rows: RowItem[];
  campaignId: string;
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

/** Agenda já existente do creator, para o admin não marcar em cima. */
function ScheduleSummary({
  schedule,
  campaignId,
}: {
  schedule: scheduleService.ScheduledPublication[];
  campaignId: string;
}) {
  if (schedule.length === 0) {
    return (
      <p className="text-xs text-text-secondary italic mb-2">
        Nenhuma outra publicação agendada para este creator.
      </p>
    );
  }
  return (
    <div className="mb-2 p-2 rounded-lg bg-surface/40 border border-border/60">
      <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium mb-1.5">
        Já agendado para este creator ({schedule.length})
      </p>
      <ul className="space-y-1">
        {schedule.map(s => {
          const daCampanha = s.campaignId === campaignId;
          return (
            <li key={s.deliveryId} className="flex items-baseline gap-2 text-xs flex-wrap">
              <span className="font-medium text-text-primary tabular-nums">
                {scheduleService.formatPublicationDate(s.publicationDate)}
              </span>
              {s.publicationPlatforms.length > 0 && (
                <span className="text-text-secondary">{s.publicationPlatforms.join(', ')}</span>
              )}
              <span className={daCampanha ? 'text-popline-light' : 'text-text-secondary'}>
                · {s.campaignTitle}
                {daCampanha ? ' (esta campanha)' : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Stage05PublicationSchedule({
  rows,
  campaignId,
  campaignTitle,
  onChanged,
}: Props) {
  const [disqualifyFor, setDisqualifyFor] = useState<RowItem | null>(null);
  const [scheduleByUser, setScheduleByUser] = useState<
    Map<string, scheduleService.ScheduledPublication[]>
  >(new Map());

  const userIds = rows.map(r => r.application.userId);
  const userIdsKey = userIds.join(',');

  const loadSchedule = useCallback(async () => {
    setScheduleByUser(await scheduleService.getScheduleForUsers(userIdsKey ? userIdsKey.split(',') : []));
    // userIdsKey é string estável; usar o array direto re-dispararia a cada render.
  }, [userIdsKey]);

  useLoadOnMount(loadSchedule, [loadSchedule]);

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
              <ScheduleSummary
                schedule={scheduleByUser.get(row.application.userId) ?? []}
                campaignId={campaignId}
              />

              <div className="space-y-2">
                {row.deliveries.map(d => (
                  <PublicationRow
                    key={`${d.id}-${d.publicationDate ?? 'n'}-${d.publicationPlatform ?? 'n'}`}
                    delivery={d}
                    userId={row.application.userId}
                    campaignTitle={campaignTitle}
                    schedule={scheduleByUser.get(row.application.userId) ?? []}
                    onSaved={() => {
                      onChanged();
                      loadSchedule();
                    }}
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
  schedule,
  onSaved,
}: {
  delivery: CampaignDelivery;
  userId: string;
  campaignTitle: string;
  schedule: scheduleService.ScheduledPublication[];
  onSaved: () => void;
}) {
  const initialDate = toLocalDateTimeInput(delivery.publicationDate);
  const initialPlatforms = delivery.publicationPlatforms ?? [];
  const initialCaption = delivery.publicationCaption ?? '';

  const [date, setDate] = useState(initialDate);
  const [platforms, setPlatforms] = useState<string[]>(initialPlatforms);
  const [caption, setCaption] = useState(initialCaption);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const sameArr = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);
  const dirty =
    date !== initialDate ||
    !sameArr(platforms, initialPlatforms) ||
    caption !== initialCaption;

  const togglePlatform = (p: string) => {
    setPlatforms(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]));
  };

  // Conflito recalculado a cada digitação, sem ir ao banco: a agenda do creator
  // já veio carregada. A própria entrega sai da conta, senão conflitaria consigo.
  const conflito = date
    ? scheduleService.findConflicts(new Date(date), schedule, delivery.id)
    : { level: 'none' as const, items: [] };

  const handleSave = async () => {
    setError(null);
    if (!date) {
      setError('Defina a data.');
      return;
    }
    if (platforms.length === 0) {
      setError('Selecione pelo menos uma plataforma.');
      return;
    }
    setSaving(true);
    const iso = new Date(date).toISOString();
    const result = await stagesService.setPublicationSchedule(delivery.id, iso, platforms, caption || null);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
    notifyPublicationScheduled(userId, campaignTitle, delivery.index, iso, platforms.join(', '));
    onSaved();
  };

  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg border border-border/60 bg-surface/40">
      <p className="text-xs text-text-secondary">Entrega {delivery.index}</p>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium mb-1">
          Data e hora da publicação
        </p>
        <input
          type="datetime-local"
          value={date}
          onChange={e => setDate(e.target.value)}
          className={`bg-background border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-popline-pink ${
            conflito.level === 'severe'
              ? 'border-red-500/60'
              : conflito.level === 'warn'
                ? 'border-amber-500/60'
                : 'border-border'
          }`}
        />

        {conflito.level !== 'none' && (
          <div
            className={`mt-1.5 p-2 rounded-lg border text-xs ${
              conflito.level === 'severe'
                ? 'bg-red-500/10 border-red-500/40 text-red-300'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
            }`}
          >
            <p className="font-semibold">
              {conflito.level === 'severe'
                ? 'Conflito de horário'
                : 'Outra publicação no mesmo dia'}
            </p>
            <ul className="mt-1 space-y-0.5">
              {conflito.items.map(({ item, diffHours }) => (
                <li key={item.deliveryId}>
                  {scheduleService.formatPublicationDate(item.publicationDate)} · {item.campaignTitle}
                  {' — '}
                  <strong>{scheduleService.formatInterval(diffHours)}</strong> de intervalo
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium mb-1">
          Plataformas (selecione uma ou mais)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map(p => {
            const selected = platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selected
                    ? 'border-popline-pink bg-popline-pink text-white'
                    : 'border-border bg-background text-text-secondary hover:border-popline-pink/50'
                }`}
              >
                {selected ? '✓ ' : ''}{p}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium mb-1">
          Sugestão de legenda (opcional)
        </p>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Cole aqui uma sugestão de legenda para o criador..."
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink resize-none"
        />
      </div>

      <div>
        <Button size="sm" variant="secondary" disabled={!dirty || saving} onClick={handleSave}>
          {saving ? '...' : savedFlash ? 'Salvo ✓' : 'Salvar agenda'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
