'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StageBadge from '@/components/ui/StageBadge';
import { STAGE_LABELS } from '@/services/campaign-stages';
import ExtendDeadlineModal from './ExtendDeadlineModal';
import BulkScheduleModal from './BulkScheduleModal';
import type {
  CampaignStage,
  CampaignStageScheduleEntry,
  StageTemporalStatus,
} from '@/types';

interface Props {
  campaignId: string;
  schedule: CampaignStageScheduleEntry[];
  currentStage: CampaignStage;
  canEdit: boolean;
  onSaveDeadline: (
    stage: CampaignStage,
    newDate: string,
    reason: string | null
  ) => Promise<{ success: boolean; error?: string }>;
  onBulkSaved: () => void;
}

function formatDate(iso: string): string {
  // iso é 'YYYY-MM-DD' (date), interpretar como local sem TZ pra não cair pro dia anterior
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function statusFromEntry(entry: CampaignStageScheduleEntry): StageTemporalStatus {
  return entry.status;
}

export default function CampaignSchedule({
  campaignId,
  schedule,
  currentStage,
  canEdit,
  onSaveDeadline,
  onBulkSaved,
}: Props) {
  const [editing, setEditing] = useState<CampaignStageScheduleEntry | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Ordenar e garantir 9 entradas (0..8). Se faltar alguma, preenche com placeholder.
  const byStage = new Map<number, CampaignStageScheduleEntry>();
  schedule.forEach(s => byStage.set(s.stage, s));

  const allEntries: CampaignStageScheduleEntry[] = Array.from({ length: 9 }, (_, i) => {
    const existing = byStage.get(i);
    if (existing) return existing;
    return {
      stage: i as CampaignStage,
      dueDate: '',
      originalDueDate: '',
      extendedAt: null,
      extendedReason: null,
      completedAt: null,
      status: 'on_track',
    };
  });

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Cronograma da campanha
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-text-secondary">
            Etapa atual: <span className="text-text-primary font-medium">{currentStage}</span> · {STAGE_LABELS[currentStage]}
          </span>
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => setBulkOpen(true)}>
              Definir datas das etapas
            </Button>
          )}
        </div>
      </div>

      <ol className="flex flex-col gap-2 sm:flex-row sm:overflow-x-auto sm:gap-3 sm:pb-1 -mx-1 px-1">
        {allEntries.map(entry => {
          const isCurrent = entry.stage === currentStage;
          const isDone = entry.completedAt != null;
          const hasDate = !!entry.dueDate;
          const status = statusFromEntry(entry);
          return (
            <li
              key={entry.stage}
              className={`flex-1 min-w-[180px] sm:flex-none sm:w-44 p-3 rounded-xl border transition-colors ${
                isCurrent
                  ? 'border-popline-pink/50 bg-popline-pink/5'
                  : isDone
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border bg-background'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-popline-pink text-white'
                        : 'bg-surface text-text-secondary'
                  }`}
                >
                  {isDone ? '✓' : entry.stage}
                </span>
                <span className="text-xs font-medium text-text-primary truncate">
                  {STAGE_LABELS[entry.stage]}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-text-secondary">
                  {hasDate ? formatDate(entry.dueDate) : '—'}
                </span>
                {hasDate && <StageBadge status={status} />}
              </div>
              {canEdit && hasDate && !isDone && (
                <button
                  type="button"
                  onClick={() => setEditing(entry)}
                  className="mt-2 text-[11px] text-popline-pink hover:underline"
                >
                  {entry.extendedAt ? 'Atualizar prazo' : 'Estender prazo'}
                </button>
              )}
              {canEdit && !hasDate && (
                <button
                  type="button"
                  onClick={() => setEditing(entry)}
                  className="mt-2 text-[11px] text-popline-pink hover:underline"
                >
                  Definir prazo
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {editing && (
        <ExtendDeadlineModal
          isOpen
          stage={editing.stage}
          currentDueDate={editing.dueDate || new Date().toISOString().slice(0, 10)}
          isExtension={!!editing.dueDate}
          onClose={() => setEditing(null)}
          onSave={async (newDate, reason) => onSaveDeadline(editing.stage, newDate, reason)}
        />
      )}

      {bulkOpen && (
        <BulkScheduleModal
          campaignId={campaignId}
          schedule={schedule}
          onClose={() => setBulkOpen(false)}
          onDone={() => {
            setBulkOpen(false);
            onBulkSaved();
          }}
        />
      )}
    </Card>
  );
}
