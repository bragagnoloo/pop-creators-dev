import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface Props {
  fullName: string;
  campaignTitle: string;
  deliveryIndex: number;
}

export default function DeliveryApprovedEmail({ fullName, campaignTitle, deliveryIndex }: Props) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Entrega aprovada — ${campaignTitle}`}>
      <Text style={eyebrow}>Tudo certo</Text>
      <Text style={heading}>Sua entrega foi aprovada!</Text>
      <Text style={body}>
        Olá, {firstName}! O vídeo da sua entrega <strong>#{deliveryIndex}</strong> na campanha{' '}
        <strong>{campaignTitle}</strong> foi aprovado.
      </Text>
      <Section style={card}>
        <Text style={cardLabel}>Próximo passo</Text>
        <Text style={cardText}>
          A equipe vai definir a data e a plataforma de publicação. Você vai receber um aviso
          assim que essas informações estiverem prontas.
        </Text>
      </Section>
      <Button href="https://poplinecreators.com.br/dashboard/campanhas" style={button}>
        Ver campanha →
      </Button>
    </EmailLayout>
  );
}

const GREEN = '#0f7a3d';
const GREEN_BG = '#ebf9f0';
const GREEN_BORDER = '#a4e7c0';

const eyebrow: React.CSSProperties = { margin: '0 0 8px', fontSize: '12px', color: GREEN, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 };
const heading: React.CSSProperties = { margin: '0 0 20px', fontSize: '24px', fontWeight: 700, color: '#111118', lineHeight: '1.3' };
const body: React.CSSProperties = { margin: '0 0 20px', fontSize: '15px', color: '#444455', lineHeight: '1.7' };
const card: React.CSSProperties = { backgroundColor: GREEN_BG, border: `1px solid ${GREEN_BORDER}`, borderLeft: `3px solid ${GREEN}`, borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' };
const cardLabel: React.CSSProperties = { margin: '0 0 8px', fontSize: '11px', color: GREEN, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' };
const cardText: React.CSSProperties = { margin: 0, fontSize: '14px', color: '#333344', lineHeight: '1.6' };
const button: React.CSSProperties = { display: 'inline-block', padding: '13px 28px', fontSize: '15px', fontWeight: 600, color: '#ffffff', background: `linear-gradient(135deg, ${MAGENTA}, ${PINK})`, borderRadius: '8px', textDecoration: 'none' };
