import { Text, Section } from '@react-email/components';
import EmailLayout from './email-layout';

interface ApplicationReceivedEmailProps {
  fullName: string;
  campaignTitle: string;
}

export default function ApplicationReceivedEmail({
  fullName,
  campaignTitle,
}: ApplicationReceivedEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Recebemos sua candidatura para ${campaignTitle}`}>
      <Text style={eyebrow}>Campanhas</Text>
      <Text style={heading}>Candidatura recebida!</Text>

      <Text style={body}>
        Olá, {firstName}! Recebemos sua candidatura para a campanha{' '}
        <strong>{campaignTitle}</strong>.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Campanha</Text>
        <Text style={cardValue}>{campaignTitle}</Text>
        <Text style={cardMeta}>Aguardando avaliação da equipe POPline</Text>
      </Section>

      <Text style={body}>
        Nossa equipe vai analisar seu perfil e te avisará assim que houver uma atualização.
        Enquanto isso, continue explorando outras campanhas disponíveis.
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
  color: '#888899',
};
