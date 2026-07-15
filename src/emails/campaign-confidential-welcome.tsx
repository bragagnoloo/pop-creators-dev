import { Text, Section } from '@react-email/components';
import EmailLayout, { MAGENTA } from './email-layout';

export default function CampaignConfidentialWelcomeEmail() {
  return (
    <EmailLayout
      preview="Seja bem-vindo(a) à Campanha Confidencial do POPline Creators."
      footerNote="Você recebeu este email por ter sido selecionado(a) para a Campanha Confidencial do POPline Creators."
    >
      <Text style={eyebrow}>Campanha Confidencial</Text>
      <Text style={heading}>Bem-vindo(a) à Campanha Confidencial</Text>

      <Text style={body}>Olá!</Text>

      <Text style={body}>
        Seja bem-vindo(a) à <strong>Campanha Confidencial do POPline Creators</strong>.
      </Text>

      <Text style={body}>
        Agradecemos pelo seu interesse em fazer parte deste projeto exclusivo. A partir de agora,
        você terá acesso às próximas etapas da campanha, incluindo todas as informações sobre o
        briefing, entregas, cronograma e demais orientações.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>Próximo passo</Text>
        <Text style={cardValue}>Campanha Oculta</Text>
        <Text style={cardMeta}>
          Em breve você será adicionado(a) na Campanha Oculta dentro do POPline Creators.
        </Text>
      </Section>

      <Text style={body}>
        Pedimos que todas as informações compartilhadas sejam tratadas com total confidencialidade e
        utilizadas exclusivamente para a participação nesta campanha.
      </Text>

      <Text style={body}>
        Estamos animados para ter você conosco e esperamos criar algo incrível juntos.
      </Text>

      <Text style={{ ...body, marginBottom: 0 }}>
        <strong>Equipe POPline Creators</strong>
      </Text>
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
  color: MAGENTA,
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
  lineHeight: '1.6',
};
