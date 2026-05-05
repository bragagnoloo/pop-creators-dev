import { Text, Section } from '@react-email/components';
import EmailLayout from './email-layout';

interface SubscriptionCancelledEmailProps {
  fullName: string;
  planName: string;
  accessUntil: string;
}

export default function SubscriptionCancelledEmail({
  fullName,
  planName,
  accessUntil,
}: SubscriptionCancelledEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Renovação do plano ${planName} cancelada`}>
      <Text style={eyebrow}>Assinatura</Text>
      <Text style={heading}>Renovação cancelada, {firstName}</Text>

      <Text style={body}>
        Sua renovação automática do plano <strong>{planName}</strong> foi cancelada.
        Você ainda tem acesso completo à plataforma até a data abaixo.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Acesso garantido até</Text>
        <Text style={cardValue}>{accessUntil}</Text>
      </Section>

      <Text style={body}>
        Se mudar de ideia, é só assinar novamente em{' '}
        <a href="https://poplinecreators.com.br/dashboard/planos" style={link}>
          poplinecreators.com.br/dashboard/planos
        </a>
        .
      </Text>
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
  backgroundColor: '#f7f7fa',
  border: '1px solid #e0e0ee',
  borderRadius: '8px',
  padding: '20px 24px',
  marginBottom: '24px',
};

const cardLabel: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: '11px',
  color: '#888899',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
};

const cardValue: React.CSSProperties = {
  margin: 0,
  fontSize: '22px',
  fontWeight: 700,
  color: '#111118',
};

const link: React.CSSProperties = {
  color: '#c2185b',
  textDecoration: 'underline',
};
