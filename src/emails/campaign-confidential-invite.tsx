import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

const FORM_URL = 'https://poplinecreators.com.br/campanha-confidencial';

interface Props {
  /** Prazo para inscrição (ex.: "Quarta-feira, 15/07 — até 12h").
   *  Quando omitido, o email sai sem card de prazo e sem menção a data. */
  deadline?: string | null;
}

export default function CampaignConfidentialInviteEmail({ deadline }: Props = {}) {
  return (
    <EmailLayout
      preview="Você foi pré-selecionado(a) para uma oportunidade exclusiva da POPline Creators."
      footerNote="Você recebeu este convite por ter sido pré-selecionado(a) pela equipe POPline Creators."
    >
      <Text style={eyebrow}>Convite confidencial</Text>
      <Text style={heading}>Você foi pré-selecionado(a)</Text>

      <Text style={body}>Olá,</Text>

      <Text style={body}>
        Você foi pré-selecionado(a) para participar de uma oportunidade exclusiva do{' '}
        <strong>POPline Creators</strong>.
      </Text>

      <Text style={body}>
        Estamos iniciando uma campanha especial com informações estratégicas e confidenciais. Por
        esse motivo, todos os criadores interessados em participar precisarão assinar um{' '}
        <strong>Termo de Confidencialidade (NDA)</strong> antes de receberem acesso aos detalhes da
        ação — incluindo escopo, entregas, cronograma e remuneração.
      </Text>

      {deadline && (
        <Section style={card}>
          <Text style={cardLabel}>Prazo para inscrição</Text>
          <Text style={cardValue}>{deadline}</Text>
          <Text style={cardMeta}>Preencha o formulário antes do prazo</Text>
        </Section>
      )}

      <Text style={body}>
        {deadline
          ? `Caso tenha interesse em fazer parte desta campanha, preencha o formulário abaixo até ${deadline}:`
          : 'Caso tenha interesse em fazer parte desta campanha, preencha o formulário abaixo:'}
      </Text>

      <Button href={FORM_URL} style={button}>
        Preencher formulário →
      </Button>

      <Text style={{ ...body, marginTop: '28px' }}>
        Após o recebimento das informações, encaminharemos o Termo de Confidencialidade para
        assinatura. Assim que o documento for assinado, compartilharemos todas as informações da
        campanha.
      </Text>

      <Text style={body}>
        Reforçamos que esta é uma oportunidade restrita e que todas as informações relacionadas ao
        projeto deverão permanecer em sigilo absoluto.
      </Text>

      <Text style={body}>Ficamos no aguardo do seu retorno.</Text>

      <Text style={{ ...body, marginBottom: 0 }}>
        Atenciosamente,
        <br />
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
