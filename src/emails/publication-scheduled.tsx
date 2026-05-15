import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface Props {
  fullName: string;
  campaignTitle: string;
  deliveryIndex: number;
  publicationDate: string;
  publicationPlatform: string;
}

export default function PublicationScheduledEmail({
  fullName,
  campaignTitle,
  deliveryIndex,
  publicationDate,
  publicationPlatform,
}: Props) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Agenda de publicação — ${campaignTitle}`}>
      <Text style={eyebrow}>Agenda de publicação</Text>
      <Text style={heading}>Sua publicação foi agendada.</Text>
      <Text style={body}>
        Olá, {firstName}! Definimos a data e a plataforma para a publicação da sua entrega{' '}
        <strong>#{deliveryIndex}</strong> na campanha <strong>{campaignTitle}</strong>.
      </Text>
      <Section style={card}>
        <Text style={cardLabel}>Publicar em</Text>
        <Text style={cardValue}>{publicationDate}</Text>
        <Text style={cardMeta}>na plataforma {publicationPlatform}</Text>
      </Section>
      <Text style={body}>
        Após publicar, volte ao painel e cole o link da publicação para que possamos confirmar.
      </Text>
      <Button href="https://poplinecreators.com.br/dashboard/campanhas" style={button}>
        Ver detalhes →
      </Button>
    </EmailLayout>
  );
}

const eyebrow: React.CSSProperties = { margin: '0 0 8px', fontSize: '12px', color: '#9999aa', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 };
const heading: React.CSSProperties = { margin: '0 0 20px', fontSize: '24px', fontWeight: 700, color: '#111118', lineHeight: '1.3' };
const body: React.CSSProperties = { margin: '0 0 20px', fontSize: '15px', color: '#444455', lineHeight: '1.7' };
const card: React.CSSProperties = { backgroundColor: '#fdf0f7', border: '1px solid #f5c6e0', borderRadius: '8px', padding: '20px 24px', marginBottom: '24px' };
const cardLabel: React.CSSProperties = { margin: '0 0 4px', fontSize: '11px', color: '#c2185b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' };
const cardValue: React.CSSProperties = { margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: '#111118' };
const cardMeta: React.CSSProperties = { margin: 0, fontSize: '13px', color: '#888899' };
const button: React.CSSProperties = { display: 'inline-block', padding: '13px 28px', fontSize: '15px', fontWeight: 600, color: '#ffffff', background: `linear-gradient(135deg, ${MAGENTA}, ${PINK})`, borderRadius: '8px', textDecoration: 'none' };
