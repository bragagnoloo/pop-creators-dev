import type { CampaignApplication, CampaignDelivery } from '@/types';
import ProgressBar from '@/components/ui/ProgressBar';

interface Props {
  application: CampaignApplication;
  deliveries: CampaignDelivery[];
  className?: string;
}

/**
 * Barra de 3 etapas pro criador. Derivada do estado atual:
 *  1. Entrou no grupo do WhatsApp (`application.joinedWhatsappGroup`)
 *  2. Entregável aprovado (todas as deliveries `deliverableStatus === 'approved'`)
 *  3. Publicação confirmada (todas as deliveries `publicationStatus === 'confirmed'`)
 *
 * Se o criador foi desclassificado, a barra não é exibida (caller esconde).
 */
export default function CreatorProgressBar({ application, deliveries, className }: Props) {
  if (application.status !== 'approved') return null;

  const joined = !!application.joinedWhatsappGroup;
  const hasDeliveries = deliveries.length > 0;
  const allApproved =
    hasDeliveries && deliveries.every(d => d.deliverableStatus === 'approved');
  const allConfirmed =
    hasDeliveries && deliveries.every(d => d.publicationStatus === 'confirmed');

  return (
    <ProgressBar
      className={className}
      steps={[
        { label: 'No grupo', done: joined },
        { label: 'Aprovado', done: allApproved },
        { label: 'Publicado', done: allConfirmed },
      ]}
    />
  );
}
