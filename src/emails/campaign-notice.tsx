import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

interface CampaignNoticeEmailProps {
  fullName: string;
  campaignTitle: string;
  noticeContent: string;
}

export default function CampaignNoticeEmail({
  fullName,
  campaignTitle,
  noticeContent,
}: CampaignNoticeEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview={`Novo aviso na campanha ${campaignTitle}`}>
      <Text style={eyebrow}>Avisos</Text>
      <Text style={heading}>Novo aviso na campanha {campaignTitle}</Text>

      <Text style={body}>Olá, {firstName}! A equipe POPline publicou um aviso na campanha.</Text>

      <Section style={noticeCard}>
        <Text style={noticeLabel}>Aviso da equipe</Text>
        <Text style={noticeText}>{noticeContent}</Text>
      </Section>

      <Text style={body}>
        Acesse sua área de campanhas para ver mais detalhes e responder se necessário.
      </Text>

      <Button
        href="https://poplinecreators.com.br/dashboard/campanhas"
        style={button}
      >
        Ver aviso completo →
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

const noticeCard: React.CSSProperties = {
  backgroundColor: '#f8f8fc',
  border: '1px solid #e8e8f0',
  borderLeft: '3px solid #e91e8c',
  borderRadius: '0 8px 8px 0',
  padding: '16px 20px',
  marginBottom: '24px',
};

const noticeLabel: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '11px',
  color: '#e91e8c',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
};

const noticeText: React.CSSProperties = {
  margin: 0,
  fontSize: '15px',
  color: '#333344',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
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
