import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface Props {
  fullName: string;
  campaignTitle: string;
  deliveryIndex: number;
  revisionNote: string;
  revisionDueDate: string;
}

export default function DeliveryRevisionNeededEmail({
  fullName,
  campaignTitle,
  deliveryIndex,
  revisionNote,
  revisionDueDate,
}: Props) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Correção solicitada — ${campaignTitle}`}>
      <Text style={eyebrow}>Atenção</Text>
      <Text style={heading}>Sua entrega precisa de ajustes.</Text>
      <Text style={body}>
        Olá, {firstName}! Revisamos seu vídeo da campanha <strong>{campaignTitle}</strong>{' '}
        (entrega #{deliveryIndex}) e gostaríamos de pedir algumas correções.
      </Text>
      <Section style={card}>
        <Text style={cardLabel}>Pedido de correção</Text>
        <Text style={cardText}>{revisionNote}</Text>
      </Section>
      <Section style={dateCard}>
        <Text style={dateLabel}>Nova data de entrega</Text>
        <Text style={dateValue}>{revisionDueDate}</Text>
      </Section>
      <Text style={body}>
        Atualize o link do vídeo no painel da campanha assim que estiver pronto.
      </Text>
      <Button href="https://poplinecreators.com.br/dashboard/campanhas" style={button}>
        Atualizar entrega →
      </Button>
    </EmailLayout>
  );
}

const AMBER = '#a55f00';
const AMBER_BG = '#fef6e6';
const AMBER_BORDER = '#f4d4a6';

const eyebrow: React.CSSProperties = { margin: '0 0 8px', fontSize: '12px', color: AMBER, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 };
const heading: React.CSSProperties = { margin: '0 0 20px', fontSize: '24px', fontWeight: 700, color: '#111118', lineHeight: '1.3' };
const body: React.CSSProperties = { margin: '0 0 20px', fontSize: '15px', color: '#444455', lineHeight: '1.7' };
const card: React.CSSProperties = { backgroundColor: AMBER_BG, border: `1px solid ${AMBER_BORDER}`, borderLeft: `3px solid ${AMBER}`, borderRadius: '8px', padding: '16px 20px', marginBottom: '16px' };
const cardLabel: React.CSSProperties = { margin: '0 0 8px', fontSize: '11px', color: AMBER, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' };
const cardText: React.CSSProperties = { margin: 0, fontSize: '15px', color: '#333344', lineHeight: '1.6', whiteSpace: 'pre-wrap' };
const dateCard: React.CSSProperties = { backgroundColor: '#fdf0f7', border: '1px solid #f5c6e0', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' };
const dateLabel: React.CSSProperties = { margin: '0 0 4px', fontSize: '11px', color: '#c2185b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' };
const dateValue: React.CSSProperties = { margin: 0, fontSize: '22px', fontWeight: 700, color: '#111118' };
const button: React.CSSProperties = { display: 'inline-block', padding: '13px 28px', fontSize: '15px', fontWeight: 600, color: '#ffffff', background: `linear-gradient(135deg, ${MAGENTA}, ${PINK})`, borderRadius: '8px', textDecoration: 'none' };
