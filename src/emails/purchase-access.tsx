import { Text, Section, Button, Link } from '@react-email/components';
import EmailLayout, { MAGENTA, PINK } from './email-layout';

export type PurchaseAccessVariant = 'new' | 'unconfirmed' | 'renewal';

interface PurchaseAccessEmailProps {
  fullName: string;
  email: string;
  planName: string;
  expiresAt: string;
  accessUrl: string;
  communityUrl: string;
  variant: PurchaseAccessVariant;
  /** Há endereço de suporte em reply-to: dá para responder o e-mail. */
  canReply: boolean;
}

const COPY: Record<PurchaseAccessVariant, { eyebrow: string; heading: (n: string, p: string) => string; intro: string; preview: string }> = {
  new: {
    eyebrow: 'Compra confirmada',
    heading: (n, p) => `Olá, ${n}! Sua assinatura ${p} já está ativa.`,
    intro:   'Criamos sua conta na POPline Creators. Falta só um passo: criar sua senha para entrar.',
    preview: 'Sua conta está pronta. Veja como acessar.',
  },
  unconfirmed: {
    eyebrow: 'Compra confirmada',
    heading: (n, p) => `Olá, ${n}! Seu plano ${p} já está ativo.`,
    intro:   'Vimos que seu cadastro ainda não tinha sido confirmado, então já confirmamos seu e-mail. Agora é só acessar.',
    preview: 'Seu plano está ativo. Veja como acessar sua conta.',
  },
  renewal: {
    eyebrow: 'Assinatura renovada',
    heading: (n, p) => `Olá, ${n}! Seu plano ${p} foi renovado.`,
    intro:   'Notamos que você ainda não acessou sua conta. Mandamos um link novo para você entrar.',
    preview: 'Seu plano foi renovado. Falta só acessar sua conta.',
  },
};

export default function PurchaseAccessEmail({
  fullName,
  email,
  planName,
  expiresAt,
  accessUrl,
  communityUrl,
  variant,
  canReply,
}: PurchaseAccessEmailProps) {
  const firstName = fullName.trim().split(' ')[0] || 'Creator';
  const copy = COPY[variant];
  const isGmail = /@(gmail|googlemail)\.com$/i.test(email);

  return (
    <EmailLayout
      preview={copy.preview}
      footerNote="Você recebeu este e-mail porque uma assinatura da POPline Creators foi comprada com este endereço."
    >
      <Text style={eyebrow}>{copy.eyebrow}</Text>
      <Text style={heading}>{copy.heading(firstName, planName)}</Text>

      <Text style={body}>{copy.intro}</Text>

      <Section style={card}>
        <Text style={cardLabel}>Plano ativo</Text>
        <Text style={cardValue}>{planName}</Text>
        <Text style={cardMeta}>Válido até {expiresAt}</Text>
        <Text style={cardMeta}>Conta: <strong>{email}</strong> (o mesmo e-mail da compra)</Text>
      </Section>

      <Text style={stepsTitle}>Próximos passos</Text>
      <Text style={step}><strong>1.</strong> Clique em <strong>Acessar minha conta</strong> e crie sua senha. O link vale por 7 dias.</Text>
      <Text style={step}><strong>2.</strong> Confirme seu nome e WhatsApp no primeiro acesso.</Text>
      <Text style={step}>
        <strong>3.</strong> Entre na <Link href={communityUrl} style={link}>Comunidade VIP no WhatsApp</Link>.
      </Text>
      <Text style={{ ...step, marginBottom: '28px' }}><strong>4.</strong> Explore as campanhas e se candidate.</Text>

      <Button href={accessUrl} style={button}>
        Acessar minha conta →
      </Button>

      <Text style={help}>
        Se o link expirar, clique no botão mesmo assim: na página você pede um link novo para este e-mail.
        {isGmail ? ' Você também pode entrar com o botão "Entrar com Google" usando este Gmail.' : ''}
      </Text>
      <Text style={help}>
        Já tinha conta na POPline com outro e-mail?{' '}
        {canReply ? 'Responda este e-mail que ajudamos você.' : 'Fale com a equipe na Comunidade VIP que ajudamos você.'}
      </Text>

      <Text style={signature}>Abraço,<br />Rodrigo — POPline Creators</Text>
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
  color: '#c2185b',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
};

const cardValue: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: '22px',
  fontWeight: 700,
  color: '#111118',
};

const cardMeta: React.CSSProperties = {
  margin: '0 0 2px',
  fontSize: '13px',
  color: '#888899',
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

const link: React.CSSProperties = {
  color: PINK,
  textDecoration: 'underline',
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

const help: React.CSSProperties = {
  margin: '24px 0 0',
  fontSize: '13px',
  color: '#888899',
  lineHeight: '1.6',
};

const signature: React.CSSProperties = {
  margin: '28px 0 0',
  fontSize: '15px',
  color: '#444455',
  lineHeight: '1.6',
};
