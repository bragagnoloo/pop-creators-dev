'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { STAGE_LABELS, setStageDeadline } from '@/services/campaign-stages';
import type { CampaignStage, CampaignStageScheduleEntry } from '@/types';

interface Props {
  campaignId: string;
  /** Datas atuais do schedule (se houver). Usadas para pré-preencher os inputs. */
  schedule: CampaignStageScheduleEntry[];
  onClose: () => void;
  onDone: () => void;
}

function todayLocal(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const STAGES: CampaignStage[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export default function BulkScheduleModal({ campaignId, schedule, onClose, onDone }: Props) {
  const today = todayLocal();

  // Pré-preenche cada etapa com a data atual do schedule (se houver) ou vazia
  const byStage = new Map(schedule.map(s => [s.stage, s]));
  const [dates, setDates] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const s of STAGES) {
      const entry = byStage.get(s);
      init[s] = entry?.dueDate ?? '';
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetDate = (stage: number, value: string) => {
    setDates(prev => ({ ...prev, [stage]: value }));
  };

  const handleSave = async () => {
    setError(null);
    // Valida que todas as etapas têm data
    for (const s of STAGES) {
      if (!dates[s]) {
        setError(`Defina a data da Etapa ${String(s).padStart(2, '0')} — ${STAGE_LABELS[s]}.`);
        return;
      }
    }
    setSaving(true);
    for (const s of STAGES) {
      const r = await setStageDeadline(campaignId, s, dates[s]);
      if (!r.success && r.error !== 'stage_already_completed') {
        setError(`Erro na etapa ${s}: ${r.error}`);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onDone();
  };

  return (
    <Modal isOpen onClose={() => !saving && onClose()} title="Definir datas das etapas">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Defina o prazo de cada etapa individualmente. Você pode ajustar depois clicando em
          &quot;Estender prazo&quot; em cada etapa do cronograma.
        </p>

        <div className="space-y-2">
          {STAGES.map(s => {
            const entry = byStage.get(s);
            const isDone = entry?.completedAt != null;
            return (
              <div
                key={s}
                className={`flex items-center justify-between gap-3 p-2 rounded-lg border ${
                  isDone ? 'border-emerald-500/30 bg-emerald-500/5 opacity-70' : 'border-border bg-background'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    Etapa {String(s).padStart(2, '0')} · {STAGE_LABELS[s]}
                  </p>
                  {isDone && (
                    <p className="text-[10px] text-emerald-400">
                      Concluída em {new Date(entry!.completedAt!).toLocaleDateString('pt-BR')} — prazo travado
                    </p>
                  )}
                </div>
                <input
                  type="date"
                  value={dates[s] ?? ''}
                  min={today}
                  disabled={isDone || saving}
                  onChange={e => handleSetDate(s, e.target.value)}
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-popline-pink disabled:opacity-50"
                />
              </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar todas as datas'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
