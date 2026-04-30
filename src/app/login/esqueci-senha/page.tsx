'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://poplinecreators.com.br/login/nova-senha',
    });
    setLoading(false);
    if (error) {
      setError('Não foi possível enviar o email. Tente novamente.');
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold gradient-text">POPline</span>
            <span className="text-sm text-text-secondary ml-2">Creators</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">Esqueci minha senha</h1>
          <p className="text-text-secondary text-sm">
            {sent
              ? 'Verifique sua caixa de entrada'
              : 'Informe seu email para receber o link de redefinição'}
          </p>
        </div>

        {sent ? (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Enviamos um link de redefinição para <strong className="text-text-primary">{email}</strong>.
              Abra o email e clique no link para criar uma nova senha.
            </p>
            <p className="text-xs text-text-secondary">O link expira em 1 hora.</p>
            <Link
              href="/login"
              className="block text-sm text-popline-pink hover:text-popline-light transition-colors"
            >
              ← Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Input
              label="Email"
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
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </Button>

            <p className="text-center text-sm text-text-secondary">
              <Link href="/login" className="text-popline-pink hover:text-popline-light transition-colors">
                ← Voltar para o login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
