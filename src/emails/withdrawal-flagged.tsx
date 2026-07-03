import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface WithdrawalFlaggedEmailProps {
  fullName: string;
  amount: number;
  reason?: string | null;
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function WithdrawalFlaggedEmail({
  fullName,
  amount,
  reason,
}: WithdrawalFlaggedEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Seu saque de ${formatBRL(amount)} foi interrompido para revisão`}>
      <Text style={eyebrow}>Carteira · Conformidade</Text>
      <Text style={heading}>Precisamos revisar seu último saque</Text>

      <Text style={body}>
        Olá, {firstName}. Identificamos uma possível divergência nos dados do seu
        último pedido de saque, então ele foi <strong>interrompido temporariamente</strong>
        {' '}para revisão de conformidade. Seu saldo foi devolvido integralmente
        para "Disponível" na sua carteira.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Valor devolvido para disponível</Text>
        <Text style={cardValue}>{formatBRL(amount)}</Text>
        {reason ? <Text style={cardMeta}>Motivo: {reason}</Text> : null}
      </Section>

      <Text style={warning}>
        <strong>Por que isso acontece?</strong> Por segurança e obrigação legal,
        a chave PIX cadastrada precisa ser da <strong>sua própria conta
        bancária</strong>, com o mesmo nome do assinante da POPline Creators.
        Saques com dados divergentes são interrompidos.
      </Text>

      <Text style={body}>
        <strong>O que fazer:</strong> confira sua chave PIX e o nome do titular no
        painel. Se estiver tudo certo, é só solicitar o saque novamente e vamos
        processar em até 48h úteis. Se precisar corrigir, atualize os dados
        antes.
      </Text>

      <Button
        href="https://poplinecreators.com.br/dashboard/carteira"
        style={button}
      >
        Revisar minha chave PIX →
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

const warning: React.CSSProperties = {
  margin: '0 0 20px',
  padding: '16px 20px',
  backgroundColor: '#fff8e6',
  border: '1px solid #f5d97a',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#5a4515',
  lineHeight: '1.6',
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
