import { Text, Link } from '@react-email/components';
import EmailLayout from './email-layout';

interface WelcomeEmailProps {
  fullName: string;
}

export default function WelcomeEmail({ fullName }: WelcomeEmailProps) {
  const firstName = fullName.split(' ')[0];
  return (
    <EmailLayout preview="Seu cadastro na POPline Creators está pronto">
      <Text style={eyebrow}>Boas-vindas</Text>
      <Text style={heading}>
        Olá, {firstName}! Seu cadastro está pronto.
      </Text>

      <Text style={body}>
        Ficamos felizes em ter você na POPline Creators. Sua conta já está ativa e você pode começar
        a explorar tudo o que a plataforma tem a oferecer.
      </Text>

      <Text style={body}>
        Com uma assinatura ativa, você pode:
      </Text>

      <Text style={listItem}>→ Se candidatar às campanhas disponíveis e gerar renda com seu conteúdo</Text>
      <Text style={listItem}>→ Assistir às aulas completas da nossa biblioteca de conteúdo</Text>
      <Text style={listItem}>→ Criar roteiros profissionais com nossa IA exclusiva</Text>

      <Text style={body}>
        Quando quiser dar o próximo passo, acesse sua área de planos:{' '}
        <Link href="https://poplinecreators.com.br/dashboard/planos" style={link}>
          poplinecreators.com.br/dashboard/planos
        </Link>
      </Text>

      <Text style={signature}>
        Abraço,
        <br />
        Rodrigo — POPline Creators
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
  fontSize: '22px',
  fontWeight: 700,
  color: '#111118',
  lineHeight: '1.3',
};

const body: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: '15px',
  color: '#444455',
  lineHeight: '1.7',
};

const listItem: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '15px',
  color: '#444455',
  lineHeight: '1.6',
  paddingLeft: '8px',
};

const link: React.CSSProperties = {
  color: '#e91e8c',
  textDecoration: 'underline',
};

const signature: React.CSSProperties = {
  margin: '28px 0 0',
  fontSize: '14px',
  color: '#666677',
  lineHeight: '1.6',
};
