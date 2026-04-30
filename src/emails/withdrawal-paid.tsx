import { Text, Section } from '@react-email/components';
import EmailLayout from './email-layout';
import type { PixKeyType } from '@/types';

interface WithdrawalPaidEmailProps {
  fullName: string;
  amount: number;
  pixKeyType: PixKeyType;
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const pixKeyTypeLabels: Record<PixKeyType, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'e-mail',
  phone: 'telefone',
  random: 'chave aleatória',
};

export default function WithdrawalPaidEmail({
  fullName,
  amount,
  pixKeyType,
}: WithdrawalPaidEmailProps) {
  const firstName = fullName.split(' ')[0];
  const pixLabel = pixKeyTypeLabels[pixKeyType];
  return (
    <EmailLayout preview={`Seu saque de ${formatBRL(amount)} foi pago`}>
      <Text style={eyebrow}>Carteira</Text>
      <Text style={heading}>Seu saque foi pago!</Text>

      <Text style={body}>
        Olá, {firstName}! O pagamento do seu saque foi processado com sucesso. O PIX foi enviado
        para sua chave de {pixLabel} cadastrada.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Valor pago</Text>
        <Text style={cardValue}>{formatBRL(amount)}</Text>
        <Text style={cardMeta}>Via PIX · chave {pixLabel}</Text>
      </Section>

      <Text style={body}>
        O valor pode levar alguns instantes para aparecer na sua conta. Em caso de dúvidas,
        entre em contato com nossa equipe.
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
  color: '#22aa55',
  fontWeight: 600,
};
