import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface Props {
  fullName: string;
  campaignTitle: string;
}

export default function PublicationConfirmedEmail({ fullName, campaignTitle }: Props) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Publicação confirmada — ${campaignTitle}`}>
      <Text style={eyebrow}>Tudo certo</Text>
      <Text style={heading}>Sua publicação foi confirmada!</Text>
      <Text style={body}>
        Olá, {firstName}! Confirmamos a sua publicação na campanha <strong>{campaignTitle}</strong>.
        Sua participação foi concluída — obrigado por entregar com qualidade!
      </Text>
      <Section style={card}>
        <Text style={cardLabel}>Próximos passos</Text>
        <Text style={cardText}>
          Quando a campanha for finalizada, o cachê (quando houver) será liberado para saque.
          Enquanto isso, fique de olho em novas campanhas no painel.
        </Text>
      </Section>
      <Button href="https://poplinecreators.com.br/dashboard/campanhas" style={button}>
        Ver outras campanhas →
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
