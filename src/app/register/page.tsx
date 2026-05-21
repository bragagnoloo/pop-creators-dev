'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ROUTES } from '@/lib/constants';
import { pixelCompleteRegistration } from '@/lib/pixel';

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : '';
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    const phoneDigits = whatsapp.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('Digite um telefone válido com DDD.');
      return;
    }

    setLoading(true);
    const result = await register(email, password);

    if (!result.success) {
      setError(result.error || 'Erro ao cadastrar.');
      setLoading(false);
      return;
    }

    const userId = result.needsConfirmation ? result.userId : (result as { success: true; user: { id: string } }).user.id;

    // Advanced Matching: inicializa pixel com dados do form ANTES do evento
    // para o Meta conseguir matching no client-side também.
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    if (typeof window !== 'undefined' && window.fbq && pixelId) {
      const names = fullName.trim().split(' ').filter(Boolean);
      const userData: Record<string, string> = { em: email.toLowerCase() };
      if (phoneDigits) userData.ph = phoneDigits;
      if (names[0]) userData.fn = names[0].toLowerCase();
      if (names.length > 1) userData.ln = names[names.length - 1].toLowerCase();
      window.fbq('init', pixelId, userData);
    }

    // Captura fbp/fbc/user-agent para CAPI server-side com mesmo eventID (userId)
    const fbp = getCookie('_fbp');
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    const fbc = getCookie('_fbc') || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : '');
    const userAgent = navigator.userAgent;

    pixelCompleteRegistration({ content_name: 'Cadastro POPline Creators' }, userId);

    fetch('/api/register/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        email,
        whatsapp,
        fullName,
        fbp: fbp || undefined,
        fbc: fbc || undefined,
        userAgent,
      }),
    }).catch(() => {});

    if (result.needsConfirmation) {
      setSuccessMsg(
        `Conta criada! Enviamos um link de confirmação para ${email}. Abra o email e clique no link para ativar sua conta.`
      );
      setLoading(false);
      return;
    }

    router.push(ROUTES.DASHBOARD);
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

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400 flex gap-2 items-start">
              <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          <Input
            label="Nome Completo"
            type="text"
            autoComplete="name"
            placeholder="Seu nome completo"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />

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

          <Input
            label="WhatsApp"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            value={whatsapp}
            onChange={handlePhoneChange}
            required
          />

          <Input
            label="Senha"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />

          <Input
            label="Confirmar Senha"
            type="password"
            autoComplete="new-password"
            placeholder="Repita sua senha"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={6}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Já tem uma conta?{' '}
          <Link href={ROUTES.LOGIN} className="text-popline-pink hover:text-popline-light transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
