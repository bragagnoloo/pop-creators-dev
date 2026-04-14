'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ROUTES } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = login(email, password);
    if (result.success) {
      // Check if admin
      const session = JSON.parse(localStorage.getItem('popline_session') || '{}');
      if (session.role === 'admin') {
        router.push(ROUTES.ADMIN);
      } else {
        router.push(ROUTES.DASHBOARD);
      }
    } else {
      setError(result.error || 'Erro ao entrar.');
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
          <h1 className="text-2xl font-bold mt-6 mb-2">Bem-vindo de volta</h1>
          <p className="text-text-secondary">Entre na sua conta para continuar</p>
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
            placeholder="Sua senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Nao tem uma conta?{' '}
          <Link href={ROUTES.REGISTER} className="text-popline-pink hover:text-popline-light transition-colors">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
