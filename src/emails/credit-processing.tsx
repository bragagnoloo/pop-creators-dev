import { Text, Section } from '@react-email/components';
import EmailLayout from './email-layout';

interface CreditProcessingEmailProps {
  fullName: string;
  campaignTitle: string;
  amount: number;
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CreditProcessingEmail({
  fullName,
  campaignTitle,
  amount,
}: CreditProcessingEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Seu cache de ${formatBRL(amount)} está sendo processado`}>
      <Text style={eyebrow}>Carteira</Text>
      <Text style={heading}>Seu cache está sendo processado.</Text>

      <Text style={body}>
        Olá, {firstName}! O cache referente à sua participação na campanha{' '}
        <strong>{campaignTitle}</strong> foi registrado e está em processamento.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Valor em processamento</Text>
        <Text style={cardValue}>{formatBRL(amount)}</Text>
        <Text style={cardMeta}>Campanha: {campaignTitle}</Text>
      </Section>

      <Text style={body}>
        Assim que o valor for liberado, você receberá um aviso e poderá solicitar o saque
        diretamente pela sua carteira.
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
  fontSize: '28px',
  fontWeight: 700,
  color: '#111118',
};

const cardMeta: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: '#888899',
};
