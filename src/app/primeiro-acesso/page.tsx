'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

type Status =
  | { state: 'loading' }
  | { state: 'ready'; email: string; conflict: string | null }
  | { state: 'invalid' };

// Primeiro acesso de quem comprou sem cadastro. O token chega por cookie
// httpOnly (ver /api/primeiro-acesso/abrir): nunca fica na URL desta página.
export default function PrimeiroAcessoPage() {
  const [status, setStatus] = useState<Status>({ state: 'loading' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/primeiro-acesso', { cache: 'no-store' })
      .then(r => r.json())
      .then((s: Status) => setStatus(s))
      .catch(() => setStatus({ state: 'invalid' }));
  }, []);

  const enter = async (confirmSwitch = false) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/primeiro-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmSwitch }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.redirect) {
        // Recarregamento completo: o AuthProvider só enxerga a sessão nova
        // (gravada em cookie pelo servidor) num carregamento novo.
        window.location.assign(body.redirect);
        return;
      }
      if (res.status === 409) {
        // Outra conta entrou depois que a página carregou: pede a confirmação.
        setStatus(s => (s.state === 'ready' ? { ...s, conflict: s.conflict ?? 'outra conta' } : s));
      } else if (res.status === 400) {
        setStatus({ state: 'invalid' });
      } else if (res.status === 429) {
        setError('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
      } else {
        setError('Não conseguimos abrir sua conta agora. Tente de novo em instantes.');
      }
    } catch {
      setError('Sem conexão. Verifique sua internet e tente de novo.');
    }
    setLoading(false);
  };

  return (
    <Shell
      title={status.state === 'invalid' ? 'Link expirado' : 'Bem-vindo à POPline'}
      subtitle={status.state === 'invalid' ? 'Peça um link novo abaixo' : 'Sua assinatura está ativa'}
    >
      {status.state === 'loading' && (
        <div className="bg-surface border border-border rounded-2xl p-6 text-center">
          <p className="text-text-secondary text-sm">Verificando seu link...</p>
        </div>
      )}

      {status.state === 'ready' && (
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <p className="text-sm text-text-secondary leading-relaxed">
            Você vai entrar na conta <strong className="text-text-primary">{status.email}</strong>, criada com o
            e-mail da sua compra. Em seguida, é só criar sua senha.
          </p>

          {status.conflict ? (
            <>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-300">
                Você está conectado como <strong>{status.conflict}</strong>. Continuar vai sair dessa conta e
                entrar na conta da compra.
              </div>
              <Button className="w-full" disabled={loading} onClick={() => enter(true)}>
                {loading ? 'Entrando...' : 'Sair e acessar a conta da compra'}
              </Button>
              <Link
                href="/dashboard"
                className="block text-center text-sm text-popline-pink hover:text-popline-light transition-colors"
              >
                Continuar em {status.conflict}
              </Link>
            </>
          ) : (
            <Button className="w-full" disabled={loading} onClick={() => enter(false)}>
              {loading ? 'Entrando...' : 'Acessar minha conta'}
            </Button>
          )}
        </div>
      )}

      {status.state === 'invalid' && <ResendForm />}
    </Shell>
  );
}

function ResendForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/primeiro-acesso/reenviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setLoading(false);
    if (res?.status === 429) {
      setError('Muitos pedidos. Aguarde um pouco e tente de novo.');
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
        <p className="text-sm text-text-secondary leading-relaxed">
          Se existir uma conta com <strong className="text-text-primary">{email}</strong>, enviamos um link de acesso
          para ele. Confira também a caixa de spam.
        </p>
        <Link href="/login" className="block text-sm text-popline-pink hover:text-popline-light transition-colors">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
      <p className="text-sm text-text-secondary leading-relaxed">
        Esse link já foi usado ou expirou. Informe o e-mail usado na compra que mandamos um link novo.
      </p>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <Input
        label="E-mail da compra"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="seu@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar link novo'}
      </Button>
      <p className="text-center text-sm text-text-secondary">
        Já criou sua senha?{' '}
        <Link href="/login" className="text-popline-pink hover:text-popline-light transition-colors">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold gradient-text">POPline</span>
            <span className="text-sm text-text-secondary ml-2">Creators</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">{title}</h1>
          <p className="text-text-secondary text-sm">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
