'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ROUTES } from '@/lib/constants';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas nao coincidem.');
      return;
    }

    setLoading(true);
    const result = register(email, password);
    if (result.success) {
      router.push(ROUTES.DASHBOARD);
    } else {
      setError(result.error || 'Erro ao cadastrar.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold gradient-text">POPline</span>
            <span className="text-sm text-text-secondary ml-2">Creators</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">Crie sua conta</h1>
          <p className="text-text-secondary">Comece a participar de campanhas exclusivas</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <Input
            label="Senha"
            type="password"
            placeholder="Minimo 6 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <Input
            label="Confirmar Senha"
            type="password"
            placeholder="Repita sua senha"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Ja tem uma conta?{' '}
          <Link href={ROUTES.LOGIN} className="text-popline-pink hover:text-popline-light transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
