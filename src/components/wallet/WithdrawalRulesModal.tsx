'use client';

import Modal from '@/components/ui/Modal';

interface WithdrawalRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WithdrawalRulesModal({ isOpen, onClose }: WithdrawalRulesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Regras de saque">
      <div className="space-y-4 text-sm text-text-secondary">
        <Rule
          title="Prazo de pagamento"
          body="Saques solicitados são processados em até 48h úteis após a solicitação. Feriados e finais de semana não contam."
        />
        <Rule
          title="Titularidade obrigatória"
          body="A chave PIX cadastrada deve ser da sua própria conta bancária, com o mesmo nome que consta no seu cadastro. Saques com dados divergentes são interrompidos por conformidade."
        />
        <Rule
          title="Saldo elegível"
          body="Somente créditos com status Disponível contam pro saldo de saque. Créditos em Processamento ainda estão em análise da campanha e serão liberados após aprovação."
        />
        <Rule
          title="Valor máximo"
          body="Cada solicitação pode ter no máximo R$ 1.000.000. Não há valor mínimo."
        />
        <Rule
          title="Limite de solicitações"
          body="Você pode fazer até 5 solicitações de saque por hora para evitar disparos acidentais."
        />
        <Rule
          title="Divergência nos dados"
          body="Se detectarmos divergência entre o titular da chave PIX e o cadastro, o saque é interrompido, o valor volta para Disponível e você recebe um email explicando o próximo passo."
        />
      </div>
    </Modal>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-1.5 h-1.5 mt-2 rounded-full bg-popline-pink shrink-0" />
      <div>
        <p className="text-text-primary font-medium">{title}</p>
        <p className="mt-0.5 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
