import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Preview,
  Hr,
} from '@react-email/components';
import type { ReactNode } from 'react';

const PINK = '#e91e8c';
const MAGENTA = '#c2185b';

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
}

export default function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Linha de acento superior */}
          <Section style={accentLine} />

          {/* Header */}
          <Section style={header}>
            <Text style={logo}>POPline Creators</Text>
          </Section>

          {/* Conteúdo */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              Você está recebendo este email porque possui uma conta na POPline Creators.
              <br />
              © {new Date().getFullYear()} POPline Creators · poplinecreators.com.br
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: '#f4f4f6',
  fontFamily: 'Arial, Helvetica, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '32px auto',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

const accentLine: React.CSSProperties = {
  height: '4px',
  background: `linear-gradient(135deg, ${MAGENTA}, ${PINK}, #f06abc)`,
};

const header: React.CSSProperties = {
  padding: '24px 40px 20px',
  borderBottom: '1px solid #f0f0f0',
};

const logo: React.CSSProperties = {
  margin: 0,
  fontSize: '18px',
  fontWeight: 700,
  color: PINK,
  letterSpacing: '-0.3px',
};

const content: React.CSSProperties = {
  padding: '36px 40px 28px',
};

const divider: React.CSSProperties = {
  borderColor: '#f0f0f0',
  margin: '0 40px',
};

const footer: React.CSSProperties = {
  padding: '16px 40px 28px',
};

const footerText: React.CSSProperties = {
  margin: 0,
  fontSize: '12px',
  color: '#aaaabc',
  lineHeight: '1.6',
};

export { PINK, MAGENTA };
export type { EmailLayoutProps };
