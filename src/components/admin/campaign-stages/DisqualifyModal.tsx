'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { disqualifyParticipant } from '@/services/campaign-stages';

interface Props {
  applicationId: string;
  participantName: string;
  onClose: () => void;
  onDone: () => void;
}

/**
 * Modal compartilhado para desclassificar um participante. Usado em qualquer
 * etapa (Stage01..Stage06) onde o admin precisa encerrar a participação do
 * criador. Sempre exige motivo de pelo menos 5 caracteres.
 */
export default function DisqualifyModal({ applicationId, participantName, onClose, onDone }: Props) {
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
    const result = await disqualifyParticipant(applicationId, reason.trim());
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onDone();
  };

  return (
    <Modal
      isOpen
      onClose={() => !saving && onClose()}
      title={`Desclassificar · ${participantName || 'Participante'}`}
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Esta ação é registrada e o motivo será exibido para o criador no painel dele.
          Use apenas quando o participante descumprir as regras da campanha.
        </p>
        <Textarea
          label="Motivo da desclassificação"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Ex: não respondeu aos avisos e não entrou no grupo até o prazo final."
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Desclassificar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
