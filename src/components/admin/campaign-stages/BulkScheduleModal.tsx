'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { STAGE_LABELS, setStageDeadline } from '@/services/campaign-stages';
import type { CampaignStage } from '@/types';

interface Props {
  campaignId: string;
  /** Quando true, só preenche etapas que ainda não têm prazo. Quando false, sobrescreve todas. */
  fillEmptyOnly?: boolean;
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

function distributeDates(start: string, end: string): string[] {
  // Gera 9 datas (etapas 0..8) linearmente de start a end inclusive
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const total = e.getTime() - s.getTime();
  return Array.from({ length: 9 }, (_, i) => {
    const t = s.getTime() + Math.round((i / 8) * total);
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });
}

export default function BulkScheduleModal({ campaignId, fillEmptyOnly = false, onClose, onDone }: Props) {
  const today = todayLocal();
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = end && start <= end ? distributeDates(start, end) : null;

  const handleSave = async () => {
    setError(null);
    if (!end) {
      setError('Informe a data final da campanha.');
      return;
    }
    if (start > end) {
      setError('A data final deve ser igual ou posterior à inicial.');
      return;
    }
    const dates = distributeDates(start, end);
    setSaving(true);
    for (let i = 0; i < 9; i++) {
      const r = await setStageDeadline(campaignId, i, dates[i]);
      if (!r.success && r.error !== 'stage_already_completed') {
        setError(`Erro na etapa ${i}: ${r.error}`);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onDone();
  };

  return (
    <Modal isOpen onClose={() => !saving && onClose()} title="Distribuir datas da campanha">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Informe a data inicial (geralmente hoje) e a data final da campanha. O sistema
          distribui automaticamente as 9 etapas em prazos lineares. Você pode ajustar cada
          etapa individualmente depois.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Data inicial
            </label>
            <input
              type="date"
              value={start}
              min={today}
              onChange={e => setStart(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink min-h-11"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Data final
            </label>
            <input
              type="date"
              value={end}
              min={start || today}
              onChange={e => setEnd(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink min-h-11"
            />
          </div>
        </div>

        {preview && (
          <div className="p-3 rounded-xl bg-background border border-border">
            <p className="text-xs uppercase tracking-wide text-text-secondary font-medium mb-2">
              Preview da distribuição
            </p>
            <ul className="text-xs space-y-1">
              {preview.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="text-text-secondary">
                    Etapa {String(i).padStart(2, '0')} · {STAGE_LABELS[i as CampaignStage]}
                  </span>
                  <span className="text-text-primary font-medium">
                    {new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {fillEmptyOnly && (
          <p className="text-xs text-text-secondary italic">
            Etapas já concluídas serão ignoradas; o restante recebe a nova data.
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !end}>
            {saving ? 'Aplicando...' : 'Aplicar a todas as etapas'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
