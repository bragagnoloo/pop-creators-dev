import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface ApplicationApprovedEmailProps {
  fullName: string;
  campaignTitle: string;
}

export default function ApplicationApprovedEmail({
  fullName,
  campaignTitle,
}: ApplicationApprovedEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Sua candidatura para ${campaignTitle} foi aprovada!`}>
      <Text style={eyebrow}>Campanhas</Text>
      <Text style={heading}>Parabéns, {firstName}! Sua candidatura foi aprovada.</Text>

      <Text style={body}>
        Ótimas notícias! Você foi selecionado para participar da campanha{' '}
        <strong>{campaignTitle}</strong>.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Campanha</Text>
        <Text style={cardValue}>{campaignTitle}</Text>
        <Text style={cardMeta}>Candidatura aprovada ✓</Text>
      </Section>

      <Text style={body}>
        Acesse seu painel para ver os detalhes da campanha, prazos de entrega e todas as
        informações necessárias para começar.
      </Text>

      <Button
        href="https://poplinecreators.com.br/dashboard/campanhas"
        style={button}
      >
        Ver minhas campanhas →
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
  fontSize: '18px',
  fontWeight: 700,
  color: '#111118',
};

const cardMeta: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: '#22aa55',
  fontWeight: 600,
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
