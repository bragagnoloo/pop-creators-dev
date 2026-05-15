'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { STAGE_LABELS } from '@/services/campaign-stages';
import type { CampaignStage } from '@/types';

interface Props {
  isOpen: boolean;
  stage: CampaignStage;
  currentDueDate: string;
  isExtension: boolean;
  onClose: () => void;
  onSave: (newDate: string, reason: string | null) => Promise<{ success: boolean; error?: string }>;
}

function todayISO(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function ExtendDeadlineModal({
  isOpen,
  stage,
  currentDueDate,
  isExtension,
  onClose,
  onSave,
}: Props) {
  const today = todayISO();
  // Se a data atual já passou (overdue), inicializa com hoje pra não bater no min.
  const initialDate = currentDueDate && currentDueDate >= today ? currentDueDate : today;
  const [date, setDate] = useState(initialDate);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const minDate = today;

  const handleSave = async () => {
    setError(null);
    if (!date) {
      setError('Selecione uma data.');
      return;
    }
    if (isExtension && reason.trim().length < 5) {
      setError('Descreva o motivo da extensão (mínimo 5 caracteres).');
      return;
    }
    setSaving(true);
    const result = await onSave(date, isExtension ? reason.trim() : null);
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'Erro ao salvar prazo.');
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isExtension ? 'Estender prazo' : 'Definir prazo'} · Etapa ${stage} — ${STAGE_LABELS[stage]}`}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="deadline-date" className="block text-sm font-medium text-text-secondary mb-1.5">
            Nova data
          </label>
          <input
            id="deadline-date"
            type="date"
            value={date}
            min={minDate}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-popline-pink min-h-11"
          />
        </div>

        {isExtension && (
          <Textarea
            label="Motivo da extensão"
            placeholder="Ex: aprovados pediram mais tempo para entrega..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={500}
          />
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : isExtension ? 'Estender prazo' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
