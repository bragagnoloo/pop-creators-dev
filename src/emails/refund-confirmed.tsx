import { Text, Section } from '@react-email/components';
import EmailLayout from './email-layout';

interface RefundConfirmedEmailProps {
  fullName: string;
  planName: string;
  amount: string;
}

export default function RefundConfirmedEmail({
  fullName,
  planName,
  amount,
}: RefundConfirmedEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Reembolso de ${amount} confirmado`}>
      <Text style={eyebrow}>Financeiro</Text>
      <Text style={heading}>Reembolso confirmado, {firstName}</Text>

      <Text style={body}>
        O reembolso do seu plano <strong>{planName}</strong> foi processado com sucesso.
        O valor será creditado em até 10 dias úteis no seu método de pagamento original.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Valor reembolsado</Text>
        <Text style={cardValue}>{amount}</Text>
      </Section>

      <Text style={body}>
        Seu acesso à plataforma foi encerrado. Se quiser voltar a usar a POPline Creators,
        assine novamente em{' '}
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
  backgroundColor: '#fff8f0',
  border: '1px solid #f5d6a0',
  borderRadius: '8px',
  padding: '20px 24px',
  marginBottom: '24px',
};

const cardLabel: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: '11px',
  color: '#b45309',
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
