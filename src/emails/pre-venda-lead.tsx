import { Text, Section, Button } from '@react-email/components';
import EmailLayout from './email-layout';

const WHATSAPP_URL = 'https://chat.whatsapp.com/EeWby5665pFDG1SGfEdshE?mode=gi_t';

interface PreVendaLeadEmailProps {
  nome: string;
}

export default function PreVendaLeadEmail({ nome }: PreVendaLeadEmailProps) {
  const firstName = nome.split(' ')[0];
  return (
    <EmailLayout preview="Sua vaga na POPline Creators está reservada!">
      <Text style={eyebrow}>Pré-venda</Text>
      <Text style={heading}>Sua vaga está reservada, {firstName}!</Text>

      <Text style={body}>
        Que boa notícia! Você está entre os primeiros a garantir acesso à POPline Creators —
        a plataforma que conecta criadores de conteúdo a campanhas de marcas reais.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Status</Text>
        <Text style={cardValue}>✓ Vaga garantida</Text>
        <Text style={cardMeta}>Você será notificado assim que o acesso for liberado</Text>
      </Section>

      <Text style={body}>
        Enquanto isso, entre no nosso grupo exclusivo do WhatsApp para ficar por dentro de
        tudo antes do lançamento — novidades, bastidores e as primeiras campanhas disponíveis.
      </Text>

      <Button href={WHATSAPP_URL} style={whatsappButton}>
        <span style={whatsappIcon}>
          {/* WhatsApp icon inline */}
          {''}
        </span>
        Entrar no Grupo do WhatsApp →
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

const card: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '20px 24px',
  marginBottom: '24px',
};

const cardLabel: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: '11px',
  color: '#16a34a',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
};

const cardValue: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: '18px',
  fontWeight: 700,
  color: '#111118',
};

const cardMeta: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: '#888899',
};

const whatsappButton: React.CSSProperties = {
  display: 'inline-block',
  padding: '13px 28px',
  fontSize: '15px',
  fontWeight: 600,
  color: '#ffffff',
  backgroundColor: '#25D366',
  borderRadius: '8px',
  textDecoration: 'none',
};

const whatsappIcon: React.CSSProperties = {
  display: 'none',
};
