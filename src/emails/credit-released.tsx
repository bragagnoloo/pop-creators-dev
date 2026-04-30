import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface CreditReleasedEmailProps {
  fullName: string;
  campaignTitle: string;
  amount: number;
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CreditReleasedEmail({
  fullName,
  campaignTitle,
  amount,
}: CreditReleasedEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Seu saldo de ${formatBRL(amount)} está disponível para saque`}>
      <Text style={eyebrow}>Carteira</Text>
      <Text style={heading}>Seu saldo está disponível para saque!</Text>

      <Text style={body}>
        Olá, {firstName}! O cache da campanha <strong>{campaignTitle}</strong> foi liberado e já
        está disponível na sua carteira.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Valor disponível</Text>
        <Text style={cardValue}>{formatBRL(amount)}</Text>
        <Text style={cardMeta}>Campanha: {campaignTitle}</Text>
      </Section>

      <Text style={body}>
        Acesse sua carteira para solicitar o saque. O pagamento é feito via PIX e processado
        em até 2 dias úteis após a solicitação.
      </Text>

      <Button
        href="https://poplinecreators.com.br/dashboard/carteira"
        style={button}
      >
        Acessar minha carteira →
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
  fontSize: '28px',
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
