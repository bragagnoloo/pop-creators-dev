import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface PlanSubscribedEmailProps {
  fullName: string;
  planName: string;
  expiresAt: string;
}

export default function PlanSubscribedEmail({
  fullName,
  planName,
  expiresAt,
}: PlanSubscribedEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Seu plano ${planName} está ativo na POPline Creators`}>
      <Text style={eyebrow}>Assinatura</Text>
      <Text style={heading}>Seu plano foi ativado, {firstName}!</Text>

      <Text style={body}>
        Tudo certo! Seu plano <strong>{planName}</strong> está ativo e você já tem acesso completo
        à plataforma.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Plano ativo</Text>
        <Text style={cardValue}>{planName}</Text>
        <Text style={cardMeta}>Válido até {expiresAt}</Text>
      </Section>

      <Text style={body}>
        Agora você pode se candidatar às campanhas disponíveis, assistir todas as aulas e usar
        o gerador de roteiros com IA. Bom proveito!
      </Text>

      <Button
        href="https://poplinecreators.com.br/dashboard/campanhas"
        style={button}
      >
        Explorar campanhas →
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
