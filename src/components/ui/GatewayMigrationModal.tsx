'use client';

import { useRouter } from 'next/navigation';
import Modal from './Modal';
import Button from './Button';
import { ROUTES } from '@/lib/constants';

interface GatewayMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * TEMPORÁRIO — exibido ao clicar em "Assinar" enquanto migramos o gateway de
 * pagamento (Kiwify → Hotmart). Substitui o redirecionamento ao checkout.
 * Remover este componente e restaurar `subscribeTo` quando o checkout Hotmart
 * estiver ativo.
 */
export default function GatewayMigrationModal({ isOpen, onClose }: GatewayMigrationModalProps) {
  const router = useRouter();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Estamos atualizando os pagamentos">
      <div className="space-y-5 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl gradient-bg flex items-center justify-center">
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed">
          Estamos migrando nosso sistema de pagamento para te oferecer uma experiência
          mais simples e segura. Por isso, novas assinaturas estão{' '}
          <span className="text-text-primary font-medium">temporariamente pausadas</span>{' '}
          e voltam em breve.
        </p>

        <p className="text-sm text-text-secondary leading-relaxed">
          Obrigado pela paciência e por fazer parte da POPline Creators! 💜
        </p>

        <Button className="w-full" onClick={() => router.push(ROUTES.DASHBOARD)}>
          Voltar ao dashboard
        </Button>
      </div>
    </Modal>
  );
}
