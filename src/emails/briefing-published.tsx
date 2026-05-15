import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface Props {
  fullName: string;
  campaignTitle: string;
  briefingText?: string | null;
  briefingFileUrl?: string | null;
}

export default function BriefingPublishedEmail({
  fullName,
  campaignTitle,
  briefingText,
  briefingFileUrl,
}: Props) {
  const firstName = fullName.split(' ')[0];
  const excerpt = briefingText
    ? briefingText.length > 240
      ? briefingText.slice(0, 240) + '...'
      : briefingText
    : null;
  return (
    <EmailLayout preview={`Briefing publicado — ${campaignTitle}`}>
      <Text style={eyebrow}>Briefing</Text>
      <Text style={heading}>O briefing da campanha está disponível.</Text>
      <Text style={body}>
        Olá, {firstName}! Acabamos de publicar o briefing da campanha{' '}
        <strong>{campaignTitle}</strong>. Leia com atenção — ele tem as informações
        necessárias para a sua entrega.
      </Text>
      {excerpt && (
        <Section style={card}>
          <Text style={cardLabel}>Trecho do briefing</Text>
          <Text style={cardText}>{excerpt}</Text>
        </Section>
      )}
      {briefingFileUrl && (
        <Text style={body}>
          O briefing completo também está disponível como arquivo anexado no painel da campanha.
        </Text>
      )}
      <Button href="https://poplinecreators.com.br/dashboard/campanhas" style={button}>
        Abrir campanha →
      </Button>
    </EmailLayout>
  );
}

const eyebrow: React.CSSProperties = { margin: '0 0 8px', fontSize: '12px', color: '#9999aa', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 };
const heading: React.CSSProperties = { margin: '0 0 20px', fontSize: '24px', fontWeight: 700, color: '#111118', lineHeight: '1.3' };
const body: React.CSSProperties = { margin: '0 0 20px', fontSize: '15px', color: '#444455', lineHeight: '1.7' };
const card: React.CSSProperties = { backgroundColor: '#fdf0f7', border: '1px solid #f5c6e0', borderLeft: `3px solid ${PINK}`, borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' };
const cardLabel: React.CSSProperties = { margin: '0 0 8px', fontSize: '11px', color: '#c2185b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' };
const cardText: React.CSSProperties = { margin: 0, fontSize: '14px', color: '#333344', lineHeight: '1.6', whiteSpace: 'pre-wrap' };
const button: React.CSSProperties = { display: 'inline-block', padding: '13px 28px', fontSize: '15px', fontWeight: 600, color: '#ffffff', background: `linear-gradient(135deg, ${MAGENTA}, ${PINK})`, borderRadius: '8px', textDecoration: 'none' };
