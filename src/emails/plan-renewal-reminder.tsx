import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface PlanRenewalReminderEmailProps {
  fullName: string;
  planName: string;
  expiresAt: string;
}

export default function PlanRenewalReminderEmail({
  fullName,
  planName,
  expiresAt,
}: PlanRenewalReminderEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Seu plano ${planName} vence amanhã — renove para manter o acesso`}>
      <Text style={eyebrow}>Assinatura</Text>
      <Text style={heading}>Seu plano vence amanhã, {firstName}.</Text>

      <Text style={body}>
        Seu plano <strong>{planName}</strong> expira em <strong>{expiresAt}</strong>. Para continuar
        com acesso completo à plataforma, renove antes da data de vencimento.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Plano atual</Text>
        <Text style={cardValue}>{planName}</Text>
        <Text style={cardMeta}>Vencimento: {expiresAt}</Text>
      </Section>

      <Text style={body}>
        Após o vencimento, seu acesso será limitado ao plano gratuito e você não poderá se
        candidatar a campanhas, assistir aulas ou usar o gerador de roteiros.
      </Text>

      <Button
        href="https://poplinecreators.com.br/dashboard/planos"
        style={button}
      >
        Renovar minha assinatura →
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
  backgroundColor: '#fff8f0',
  border: '1px solid #f5dfc6',
  borderRadius: '8px',
  padding: '20px 24px',
  marginBottom: '24px',
};

const cardLabel: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: '11px',
  color: '#c27018',
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
  color: '#c27018',
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
