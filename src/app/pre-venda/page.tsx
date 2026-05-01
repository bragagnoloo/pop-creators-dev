'use client';

import { useState, useEffect } from 'react';
import { pixelViewContent } from '@/lib/pixel';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SoundWaves from '@/components/landing/SoundWaves';

const MANIFESTO_URL = 'https://xduxtovqwebteqhrffgh.supabase.co/storage/v1/object/public/videos/Design%20sem%20nome%20(4).mp4';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function PreVendaPage() {
  const router = useRouter();
  useEffect(() => {
    pixelViewContent({ content_name: 'Pre-Venda POPline Creators' });
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', whatsapp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid =
    form.nome.trim().length >= 3 &&
    isValidEmail(form.email) &&
    form.whatsapp.replace(/\D/g, '').length >= 10;

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pre-cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      router.push('/pre-venda/obrigado');
    } catch {
      setError('Algo deu errado. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-x-hidden noise-overlay grid-bg">
      {/* Top bar com glass */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-16 px-6 backdrop-blur-md bg-background/60 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold gradient-text tracking-tight">POPline</span>
          <span className="text-sm font-medium text-text-secondary tracking-widest uppercase">Creators</span>
        </div>
      </header>

      {/* Sound frequency waves */}
      <SoundWaves />

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-popline-magenta/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div
          className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-popline-pink/15 rounded-full blur-[120px] animate-pulse-glow"
          style={{ animationDelay: '2s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-popline-light/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-28 sm:pt-32 pb-16 sm:pb-24">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16 xl:gap-24">

          {/* ── Coluna esquerda (desktop) / topo (mobile): brand, badge, headline, subheadline ── */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left gap-6 sm:gap-8 flex-1 min-w-0">

            {/* Badge */}
            <div className="animate-slide-up inline-flex items-center gap-2 px-5 py-2 rounded-full glass-card border border-popline-pink/20">
              <span className="w-2 h-2 rounded-full bg-popline-pink animate-pulse" />
              <span className="text-popline-light text-xs font-bold tracking-widest">
                ACESSO ANTECIPADO
              </span>
              <span className="w-2 h-2 rounded-full bg-popline-pink animate-pulse" />
            </div>

            {/* Headline */}
            <h1 className="animate-slide-up-delay-1 text-4xl sm:text-6xl lg:text-5xl xl:text-6xl font-bold leading-[1.08] tracking-tight">
              O maior lançamento{' '}
              <br className="hidden sm:block" />
              <span className="gradient-text">da história do POPline</span>
              <br className="hidden sm:block" />
              {' '}está chegando
            </h1>

            {/* Sub-headline */}
            <p className="animate-slide-up-delay-2 text-lg sm:text-xl text-text-secondary max-w-2xl leading-relaxed">
              Seja um dos primeiros a entrar no ecossistema de criadores mais
              exclusivo do Brasil.{' '}
              <span className="text-text-primary font-medium">
                Acesso antecipado, benefícios únicos
              </span>{' '}
              e uma jornada que vai transformar como você cria conteúdo sobre música.
            </p>

            {/* CTA + Status — desktop only (no mobile fica abaixo do vídeo) */}
            <div className="hidden lg:flex flex-col items-start gap-3 animate-slide-up-delay-3">
              <Button
                size="lg"
                onClick={() => setModalOpen(true)}
                className="min-w-[280px] text-lg font-bold py-4 tracking-wide"
              >
                Quero Garantir Meu Lugar →
              </Button>
              <p className="text-sm text-text-secondary">
                Vagas limitadas · Gratuito · Sem compromisso
              </p>
            </div>

            <div className="hidden lg:flex flex-wrap items-center justify-start gap-4 sm:gap-6 text-sm text-text-secondary animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>Cadastros abertos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🎵</span>
                <span>powered by UGC+</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🇧🇷</span>
                <span>Brasil</span>
              </div>
            </div>
          </div>

          {/* ── Coluna direita (desktop) / meio (mobile): vídeo vertical ── */}
          <div className="animate-slide-up-delay-3 flex flex-col items-center gap-4 w-full lg:w-64 xl:w-72 flex-shrink-0 mt-8 lg:mt-0">
            <p className="text-xs text-text-secondary tracking-wider uppercase">
              Assista nosso manifesto
            </p>

            <div className="w-full max-w-[85vw] sm:max-w-xs lg:max-w-none rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-popline-pink/10 glow-border">
              <video
                className="aspect-[9/16] w-full object-cover"
                src={MANIFESTO_URL}
                poster="/manifesto-poster.jpg"
                controls
                playsInline
                preload="metadata"
              />
            </div>
          </div>

          {/* ── CTA + Status — mobile only (abaixo do vídeo) ── */}
          <div className="lg:hidden flex flex-col items-center gap-6 mt-4">
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={() => setModalOpen(true)}
                className="min-w-[280px] text-lg font-bold py-4 tracking-wide"
              >
                Quero Garantir Meu Lugar →
              </Button>
              <p className="text-sm text-text-secondary">
                Vagas limitadas · Gratuito · Sem compromisso
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>Cadastros abertos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🎵</span>
                <span>powered by UGC+</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🇧🇷</span>
                <span>Brasil</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError('');
        }}
        title="Garanta seu Acesso Antecipado"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary -mt-2">
            Preencha seus dados e seja um dos primeiros a entrar na plataforma.
          </p>

          <Input
            label="Nome Completo"
            type="text"
            placeholder="Seu nome completo"
            value={form.nome}
            onChange={update('nome')}
            required
            autoFocus
          />

          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={form.email}
            onChange={update('email')}
            required
          />

          <Input
            label="WhatsApp"
            type="tel"
            placeholder="(11) 99999-9999"
            value={form.whatsapp}
            onChange={update('whatsapp')}
            required
          />

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={!isValid || loading}
            className="w-full mt-1 font-bold"
          >
            {loading ? 'Enviando...' : 'Garantir Meu Lugar'}
          </Button>

          <p className="text-xs text-text-secondary text-center leading-relaxed">
            Ao se cadastrar você concorda em receber novidades da POPline.
            Seus dados estão seguros conosco.
          </p>
        </form>
      </Modal>
    </main>
  );
}
