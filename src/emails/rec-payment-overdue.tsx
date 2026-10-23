import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

export const HOTMART_BUYER_URL = 'https://consumer.hotmart.com';

interface RecPaymentOverdueEmailProps {
  fullName: string;
  /** Data da parcela que não foi paga (dd/mm/aaaa). */
  chargeDate: string;
  /** Último dia de acesso se não regularizar (dd/mm/aaaa). */
  deadline: string;
}

export default function RecPaymentOverdueEmail({ fullName, chargeDate, deadline }: RecPaymentOverdueEmailProps) {
  const firstName = fullName.trim().split(' ')[0] || 'Creator';
  return (
    <EmailLayout preview={`Regularize a parcela do seu Plano Anual até ${deadline} para manter o acesso`}>
      <Text style={eyebrow}>Assinatura</Text>
      <Text style={heading}>{firstName}, a parcela do seu Plano Anual está em aberto</Text>

      <Text style={body}>
        Não identificamos o pagamento da parcela de <strong>{chargeDate}</strong> do seu Plano Anual.
        Para continuar com acesso completo à plataforma, regularize o pagamento em até 3 dias.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Prazo para regularizar</Text>
        <Text style={cardValue}>{deadline}</Text>
        <Text style={cardMeta}>Depois dessa data, sua assinatura é suspensa e sua conta volta para o plano gratuito.</Text>
      </Section>

      <Text style={stepsTitle}>Como regularizar</Text>
      <Text style={step}><strong>1.</strong> Acesse a área do comprador da Hotmart com o e-mail usado na compra.</Text>
      <Text style={step}><strong>2.</strong> Em <strong>Assinaturas</strong>, abra a assinatura da POPline Creators.</Text>
      <Text style={{ ...step, marginBottom: '28px' }}>
        <strong>3.</strong> Atualize a forma de pagamento ou pague a parcela em aberto. Assim que a Hotmart
        confirmar, seu acesso continua normalmente.
      </Text>

      <Button href={HOTMART_BUYER_URL} style={button}>
        Regularizar na Hotmart →
      </Button>

      <Text style={help}>Se você já pagou, pode desconsiderar este e-mail: a confirmação da Hotmart libera o acesso automaticamente.</Text>
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

const stepsTitle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '16px',
  fontWeight: 700,
  color: '#111118',
};

const step: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '15px',
  color: '#444455',
  lineHeight: '1.6',
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

const help: React.CSSProperties = {
  margin: '24px 0 0',
  fontSize: '13px',
  color: '#888899',
  lineHeight: '1.6',
};
