'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { STAGE_LABELS, revertStage } from '@/services/campaign-stages';
import type { Campaign, CampaignStageScheduleEntry, StageHistoryEntry } from '@/types';

interface Props {
  campaign: Campaign;
  schedule: CampaignStageScheduleEntry[];
  isMasterAdmin: boolean;
  onReverted: () => void;
}

function formatTs(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CampaignAuditLog({ campaign, schedule, isMasterAdmin, onReverted }: Props) {
  const [open, setOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);

  const history = campaign.stageHistory ?? [];
  const extensions = schedule.filter(s => s.extendedAt);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h3 className="text-base font-semibold">Histórico e auditoria</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {history.length} transições · {extensions.length} extensões de prazo
          </p>
        </div>
        <span aria-hidden className="text-text-secondary">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {history.length === 0 && extensions.length === 0 ? (
            <p className="text-sm text-text-secondary italic">Sem eventos registrados ainda.</p>
          ) : (
            <>
              {history.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-secondary font-medium mb-2">
                    Transições de etapa
                  </p>
                  <ul className="space-y-2">
                    {[...history].reverse().map((entry, i) => (
                      <HistoryEntryRow key={i} entry={entry} />
                    ))}
                  </ul>
                </div>
              )}

              {extensions.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-secondary font-medium mb-2">
                    Extensões de prazo
                  </p>
                  <ul className="space-y-2">
                    {extensions.map(e => (
                      <li
                        key={e.stage}
                        className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm"
                      >
                        <p>
                          <strong>Etapa {String(e.stage).padStart(2, '0')}</strong> — prazo movido
                          de {new Date(e.originalDueDate + 'T00:00:00').toLocaleDateString('pt-BR')}{' '}
                          para {new Date(e.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        {e.extendedReason && (
                          <p className="text-xs text-text-secondary mt-1">
                            Motivo: {e.extendedReason}
                          </p>
                        )}
                        <p className="text-[11px] text-text-secondary mt-1">
                          Em {formatTs(e.extendedAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {isMasterAdmin && (campaign.currentStage ?? 0) > 0 && (
            <div className="pt-3 border-t border-border">
              <Button variant="danger" size="sm" onClick={() => setRevertOpen(true)}>
                Reverter última etapa (master admin)
              </Button>
              <p className="text-xs text-text-secondary mt-1">
                Volta a campanha para a etapa anterior. Use apenas se algo foi concluído por engano.
              </p>
            </div>
          )}
        </div>
      )}

      {revertOpen && (
        <RevertModal
          campaignId={campaign.id}
          currentStage={campaign.currentStage ?? 0}
          onClose={() => setRevertOpen(false)}
          onDone={() => {
            setRevertOpen(false);
            onReverted();
          }}
        />
      )}
    </Card>
  );
}

function HistoryEntryRow({ entry }: { entry: StageHistoryEntry }) {
  if (entry.action === 'completed') {
    return (
      <li className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-sm">
        <p>
          <strong>Etapa {String(entry.stage).padStart(2, '0')}</strong> concluída
          {' '}— <span className="text-text-secondary">{STAGE_LABELS[entry.stage as 0]}</span>
        </p>
        {entry.note && <p className="text-xs text-text-secondary mt-1">Nota: {entry.note}</p>}
        <p className="text-[11px] text-text-secondary mt-1">Em {formatTs(entry.at)}</p>
      </li>
    );
  }
  return (
    <li className="p-2 rounded-lg border border-red-500/30 bg-red-500/5 text-sm">
      <p>
        Reversão de Etapa {entry.from_stage} → {entry.to_stage}
      </p>
      <p className="text-xs text-text-secondary mt-1">Motivo: {entry.reason}</p>
      <p className="text-[11px] text-text-secondary mt-1">Em {formatTs(entry.at)}</p>
    </li>
  );
}

function RevertModal({
  campaignId,
  currentStage,
  onClose,
  onDone,
}: {
  campaignId: string;
  currentStage: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (reason.trim().length < 5) {
      setError('Descreva o motivo (mínimo 5 caracteres).');
      return;
    }
    setSaving(true);
    const result = await revertStage(campaignId, reason.trim());
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onDone();
  };

  return (
    <Modal isOpen onClose={() => !saving && onClose()} title="Reverter última etapa">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          A campanha voltará da etapa <strong className="text-text-primary">{currentStage}</strong>{' '}
          para a etapa{' '}
          <strong className="text-text-primary">{currentStage - 1}</strong>. A ação é registrada no histórico.
        </p>
        <Textarea
          label="Motivo da reversão"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          maxLength={500}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Revertendo...' : 'Reverter'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
