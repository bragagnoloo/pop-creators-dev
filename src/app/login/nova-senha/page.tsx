'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function NovaSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError('Não foi possível atualizar a senha. Solicite um novo link de redefinição.');
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/login'), 2500);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary text-sm">Verificando sessão...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold gradient-text">POPline</span>
            <span className="text-sm text-text-secondary ml-2">Creators</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">Nova senha</h1>
          <p className="text-text-secondary text-sm">
            {done ? 'Senha atualizada com sucesso!' : 'Crie uma nova senha para sua conta'}
          </p>
        </div>

        {done ? (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary">Redirecionando para o login...</p>
          </div>
        ) : !hasSession ? (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              O link de redefinição expirou ou já foi usado. Solicite um novo link.
            </p>
            <Link
              href="/login/esqueci-senha"
              className="inline-block text-sm text-popline-pink hover:text-popline-light transition-colors"
            >
              Solicitar novo link →
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
              label="Nova senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />

            <Input
              label="Confirmar nova senha"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repita a nova senha"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              suffix={
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}
