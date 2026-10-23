'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

type Account = { email: string; hasPassword: boolean };

// Segunda etapa do primeiro acesso: criar a senha. Quem veio de um cadastro não
// confirmado já tem senha e pode mantê-la.
export default function PrimeiroAcessoSenhaPage() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const u = data.user;
      setAccount(u?.email
        ? { email: u.email, hasPassword: u.app_metadata?.origin === 'unconfirmed_signup' }
        : null);
    });
  }, []);

  const finish = async () => {
    const res = await fetch('/api/primeiro-acesso/concluir', { method: 'POST' }).catch(() => null);
    if (!res?.ok) {
      setError('Sua senha foi salva, mas não conseguimos concluir o acesso. Tente de novo.');
      setLoading(false);
      return;
    }
    window.location.assign('/dashboard');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('A senha deve ter no mínimo 6 caracteres.');
    if (password !== confirm) return setError('As senhas não coincidem.');

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setError('Não foi possível salvar a senha. Tente de novo.');
      return;
    }
    await finish();
  };

  const keepPassword = async () => {
    setError('');
    setLoading(true);
    await finish();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold gradient-text">POPline</span>
            <span className="text-sm text-text-secondary ml-2">Creators</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">Crie sua senha</h1>
          <p className="text-text-secondary text-sm">
            {account ? <>Conta <strong className="text-text-primary">{account.email}</strong></> : 'Último passo para entrar'}
          </p>
        </div>

        {account === undefined && (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center">
            <p className="text-text-secondary text-sm">Carregando...</p>
          </div>
        )}

        {account === null && (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              Sua sessão não foi encontrada. Abra de novo o link do e-mail ou peça um link novo.
            </p>
            <Link
              href="/primeiro-acesso"
              className="inline-block text-sm text-popline-pink hover:text-popline-light transition-colors"
            >
              Pedir link novo →
            </Link>
          </div>
        )}

        {account && (
          <form onSubmit={submit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Input
              label="Senha"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <Input
              label="Confirmar senha"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />
              Mostrar senha
            </label>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar senha e entrar'}
            </Button>

            {account.hasPassword && (
              <button
                type="button"
                onClick={keepPassword}
                disabled={loading}
                className="block w-full text-center text-sm text-popline-pink hover:text-popline-light transition-colors disabled:opacity-50"
              >
                Manter a senha que criei no cadastro
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
