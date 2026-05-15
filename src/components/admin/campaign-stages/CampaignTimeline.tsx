'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import Stepper, { type StepperStep } from '@/components/ui/Stepper';
import { STAGE_LABELS } from '@/services/campaign-stages';
import type { CampaignStage, StageReadiness } from '@/types';

interface Props {
  currentStage: CampaignStage;
  readiness: StageReadiness | null;
  canComplete: boolean;
  onComplete: (note: string | null) => Promise<{ success: boolean; error?: string }>;
}

const STAGE_COUNT = 9; // 0..8

export default function CampaignTimeline({ currentStage, readiness, canComplete, onComplete }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: StepperStep[] = Array.from({ length: STAGE_COUNT }, (_, i) => {
    let state: StepperStep['state'];
    if (i < currentStage) state = 'done';
    else if (i === currentStage) state = 'active';
    else state = 'pending';
    return {
      label: `${i}`,
      description: STAGE_LABELS[i as CampaignStage],
      state,
    };
  });

  const ready = !!readiness?.ready;
  const blockers = readiness?.blockers ?? [];
  const isLast = currentStage === 8;

  const handleConfirm = async () => {
    setWorking(true);
    setError(null);
    const result = await onComplete(note.trim() || null);
    setWorking(false);
    if (!result.success) {
      setError(result.error ?? 'Erro ao concluir etapa.');
      return;
    }
    setModalOpen(false);
    setNote('');
  };

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Progresso da campanha
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Etapa atual:{' '}
            <span className="text-text-primary font-medium">
              {currentStage} · {STAGE_LABELS[currentStage]}
            </span>
          </p>
        </div>
        {canComplete && !isLast && (
          <Button
            size="sm"
            disabled={!ready}
            onClick={() => setModalOpen(true)}
            variant={ready ? 'primary' : 'secondary'}
          >
            {ready ? `Concluir etapa ${currentStage}` : 'Aguardando requisitos'}
          </Button>
        )}
        {isLast && (
          <span className="text-xs text-emerald-400 font-medium">Campanha concluída ✓</span>
        )}
      </div>

      <Stepper steps={steps} orientation="horizontal" />

      {!ready && blockers.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">
            Para concluir esta etapa, resolva:
          </p>
          <ul className="space-y-1">
            {blockers.map((b, i) => (
              <li key={i} className="text-sm text-amber-200/90 flex items-start gap-2">
                <span aria-hidden>•</span>
                <span>{b.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {readiness == null && !isLast && (
        <p className="mt-4 text-xs text-text-secondary italic">
          Carregando requisitos da etapa… Se persistir, verifique se a migration 0015 foi aplicada.
        </p>
      )}

      {modalOpen && (
        <Modal
          isOpen
          onClose={() => !working && setModalOpen(false)}
          title={`Concluir etapa ${currentStage} — ${STAGE_LABELS[currentStage]}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Ao concluir, a campanha avança para a próxima etapa. Esta ação fica registrada no
              histórico.
            </p>
            <Textarea
              label="Mensagem opcional para os participantes"
              placeholder="Ex: passamos para a próxima etapa, confiram o painel."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-[11px] text-text-secondary">
              Se preenchida, vira um aviso geral da campanha.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setModalOpen(false)}
                disabled={working}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={working}>
                {working ? 'Concluindo...' : `Concluir etapa ${currentStage}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
