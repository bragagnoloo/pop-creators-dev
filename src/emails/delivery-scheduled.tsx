import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface DeliveryScheduledEmailProps {
  fullName: string;
  campaignTitle: string;
  deliveryDate: string;
  deliveryIndex: number;
}

export default function DeliveryScheduledEmail({
  fullName,
  campaignTitle,
  deliveryDate,
  deliveryIndex,
}: DeliveryScheduledEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Entrega ${deliveryIndex} agendada para ${deliveryDate} — ${campaignTitle}`}>
      <Text style={eyebrow}>Campanhas</Text>
      <Text style={heading}>Você tem uma entrega agendada.</Text>

      <Text style={body}>
        Olá, {firstName}! A data da entrega <strong>#{deliveryIndex}</strong> da campanha{' '}
        <strong>{campaignTitle}</strong> foi definida.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Data de entrega #{deliveryIndex}</Text>
        <Text style={cardValue}>{deliveryDate}</Text>
        <Text style={cardMeta}>Campanha: {campaignTitle}</Text>
      </Section>

      <Text style={body}>
        Lembre-se de enviar o link do seu conteúdo antes do prazo. Acesse a campanha para
        ver todos os detalhes e requisitos de entrega.
      </Text>

      <Button
        href="https://poplinecreators.com.br/dashboard/campanhas"
        style={button}
      >
        Ver detalhes da campanha →
      </Button>
    </EmailLayout>
  );
}

const eyebrow: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '12px',
  color: '#9999aa',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontWeight: 600,
};

const heading: React.CSSProperties = {
  margin: '0 0 20px',
  fontSize: '24px',
  fontWeight: 700,
  color: '#111118',
  lineHeight: '1.3',
};

const body: React.CSSProperties = {
  margin: '0 0 20px',
  fontSize: '15px',
  color: '#444455',
  lineHeight: '1.7',
};

const card: React.CSSProperties = {
  backgroundColor: '#fdf0f7',
  border: '1px solid #f5c6e0',
  borderRadius: '8px',
  padding: '20px 24px',
  marginBottom: '24px',
};

const cardLabel: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: '11px',
  color: '#c2185b',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
};

const cardValue: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: '22px',
  fontWeight: 700,
  color: '#111118',
};

const cardMeta: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: '#888899',
};

const button: React.CSSProperties = {
  display: 'inline-block',
  padding: '13px 28px',
  fontSize: '15px',
  fontWeight: 600,
  color: '#ffffff',
  background: `linear-gradient(135deg, ${MAGENTA}, ${PINK})`,
  borderRadius: '8px',
  textDecoration: 'none',
};
