import { Text, Section, Button } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

export const AFFILIATE_INVITE_URL = 'https://affiliate.hotmart.com/affiliate-recruiting/view/4299A106555361';

// Convite para o Programa de Afiliados. Vai com o PDF de regras em anexo.
export default function AffiliateInviteEmail() {
  return (
    <EmailLayout preview="Você alcançou 500 pontos e foi convidado para o Programa de Afiliados">
      <Text style={eyebrow}>Programa de Afiliados</Text>
      <Text style={heading}>Parabéns Creator, você ultrapassou os 500 pontos no Ranking Geral e agora pode se Afiliar</Text>

      <Text style={body}>
        Alcançar <strong>500 pontos no ranking geral</strong> da POPline Creators diz muito sobre o seu
        trabalho: comprometimento nas campanhas, entregas caprichadas e participação ativa na comunidade.
        É esse tipo de creator que queremos ao nosso lado, e o Programa de Afiliados é a nossa forma de
        reconhecer isso.
      </Text>

      <Text style={body}>
        Como afiliado, você indica a POPline Creators para outros criadores de conteúdo e recebe:
      </Text>

      <Section style={card}>
        <Text style={cardRow}><strong style={cardValue}>30%</strong> da primeira assinatura</Text>
        <Text style={{ ...cardRow, margin: 0 }}>
          <strong style={cardValue}>20%</strong> de cada renovação, enquanto o indicado continuar assinando
        </Text>
      </Section>

      <Text style={body}>
        A comissão é calculada sobre o valor líquido (depois das taxas da Hotmart) e cai automaticamente
        na sua conta de afiliado no momento do pagamento.
      </Text>

      <Text style={stepsTitle}>Como participar</Text>
      <Text style={step}><strong>1.</strong> Acesse o convite pelo botão abaixo.</Text>
      <Text style={step}><strong>2.</strong> Faça login na Hotmart. Se ainda não tiver conta, crie uma e abra o link do convite de novo.</Text>
      <Text style={{ ...step, marginBottom: '24px' }}><strong>3.</strong> Pegue seus links de afiliado no painel da Hotmart.</Text>

      <Button href={AFFILIATE_INVITE_URL} style={button}>
        Quero ser afiliado →
      </Button>

      <Text style={{ ...body, marginTop: '28px' }}>
        <strong>Importante:</strong> a comissão só vale para assinaturas feitas direto pelo seu link de
        afiliado. Quem assina pelo botão dentro da plataforma não gera comissão. Se a pessoa ainda não
        tiver conta na POPline Creators, a conta é criada automaticamente com o e-mail da compra.
      </Text>

      <Text style={stepsTitle}>Como divulgar com responsabilidade</Text>
      <Text style={step}>• Deixe claro que é um link de afiliado.</Text>
      <Text style={step}>• Não prometa ganhos, aprovação em campanhas ou resultados garantidos.</Text>
      <Text style={step}>• Use só as informações oficiais dos planos.</Text>
      <Text style={{ ...step, marginBottom: '20px' }}>• Nada de spam ou práticas enganosas.</Text>

      <Text style={body}>
        A comissão segue a garantia de 7 dias corridos da assinatura: em caso de reembolso nesse prazo,
        ela é cancelada.
      </Text>

      <Text style={body}>
        As regras completas estão no PDF em anexo, <strong>Programa de Afiliados POPline Creators</strong>.
      </Text>

      <Text style={signature}>
        Obrigado por fazer parte da história da POPline Creators. Agora é hora de crescer junto com a gente.
        <br /><br />
        Abraço,<br />Rodrigo — POPline Creators
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
  padding: '18px 24px',
  marginBottom: '20px',
};

const cardRow: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '15px',
  color: '#444455',
  lineHeight: '1.6',
};

const cardValue: React.CSSProperties = {
  fontSize: '20px',
  color: MAGENTA,
  marginRight: '6px',
};

const stepsTitle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '16px',
  fontWeight: 700,
  color: '#111118',
};

const step: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '15px',
  color: '#444455',
  lineHeight: '1.6',
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

const signature: React.CSSProperties = {
  margin: '28px 0 0',
  fontSize: '15px',
  color: '#444455',
  lineHeight: '1.6',
};
