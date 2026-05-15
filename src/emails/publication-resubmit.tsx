import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface Props {
  fullName: string;
  campaignTitle: string;
  publicationDueDate: string;
}

export default function PublicationResubmitEmail({
  fullName,
  campaignTitle,
  publicationDueDate,
}: Props) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Reenviar publicação — ${campaignTitle}`}>
      <Text style={eyebrow}>Atenção</Text>
      <Text style={heading}>Precisamos que você reenvie a publicação.</Text>
      <Text style={body}>
        Olá, {firstName}! Sua publicação na campanha <strong>{campaignTitle}</strong> não pôde ser
        confirmada. Pedimos que você reenvie o link público da publicação até a nova data limite.
      </Text>
      <Section style={dateCard}>
        <Text style={dateLabel}>Novo prazo</Text>
        <Text style={dateValue}>{publicationDueDate}</Text>
      </Section>
      <Text style={body}>
        Acesse a campanha para atualizar o link da publicação.
      </Text>
      <Button href="https://poplinecreators.com.br/dashboard/campanhas" style={button}>
        Atualizar publicação →
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
const dateCard: React.CSSProperties = { backgroundColor: AMBER_BG, border: `1px solid ${AMBER_BORDER}`, borderLeft: `3px solid ${AMBER}`, borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' };
const dateLabel: React.CSSProperties = { margin: '0 0 4px', fontSize: '11px', color: AMBER, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' };
const dateValue: React.CSSProperties = { margin: 0, fontSize: '22px', fontWeight: 700, color: '#111118' };
const button: React.CSSProperties = { display: 'inline-block', padding: '13px 28px', fontSize: '15px', fontWeight: 600, color: '#ffffff', background: `linear-gradient(135deg, ${MAGENTA}, ${PINK})`, borderRadius: '8px', textDecoration: 'none' };
