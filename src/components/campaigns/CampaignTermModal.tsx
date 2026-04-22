'use client';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { CAMPAIGN_TERM_TEXT } from '@/lib/constants';

interface CampaignTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void | Promise<void>;
  loading?: boolean;
}

export default function CampaignTermModal({ isOpen, onClose, onAccept, loading = false }: CampaignTermModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Termo de Autorização">
      <div className="space-y-4">
        <div className="max-h-[60vh] overflow-y-auto p-4 rounded-xl bg-background border border-border text-sm whitespace-pre-line leading-relaxed">
          {CAMPAIGN_TERM_TEXT}
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Voltar
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => onAccept()}
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Aceito'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
