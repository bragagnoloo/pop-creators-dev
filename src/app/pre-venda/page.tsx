'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SoundWaves from '@/components/landing/SoundWaves';

// ─── Substitua pelo ID do vídeo no YouTube (parte após ?v=) ───────────────────
const YOUTUBE_VIDEO_ID = 'SUBSTITUIR_AQUI';
// ─────────────────────────────────────────────────────────────────────────────

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function PreVendaPage() {
  const router = useRouter();
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

      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center text-center gap-8 sm:gap-10">
        {/* Brand */}
        <div className="animate-slide-up text-sm font-medium tracking-widest uppercase">
          <span className="gradient-text font-bold">POPline</span>
          <span className="text-text-secondary"> Creators</span>
        </div>

        {/* Badge */}
        <div className="animate-slide-up inline-flex items-center gap-2 px-5 py-2 rounded-full glass-card border border-popline-pink/20">
          <span className="w-2 h-2 rounded-full bg-popline-pink animate-pulse" />
          <span className="text-popline-light text-xs font-bold tracking-widest">
            ACESSO ANTECIPADO
          </span>
          <span className="w-2 h-2 rounded-full bg-popline-pink animate-pulse" />
        </div>

        {/* Headline */}
        <h1 className="animate-slide-up-delay-1 text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight">
          O maior lançamento{' '}
          <br className="hidden sm:block" />
          <span className="gradient-text">da história do POPline</span>
          <br className="hidden sm:block" />
          está chegando
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

        {/* Video section */}
        <div className="animate-slide-up-delay-3 w-full flex flex-col items-center gap-5">
          <div className="flex items-center gap-4 w-full max-w-xs">
            <div className="flex-1 h-px bg-border" />
            <p className="text-xs text-text-secondary whitespace-nowrap tracking-wider uppercase">
              Assista nosso manifesto
            </p>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="w-full rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-popline-pink/10 glow-border">
            {YOUTUBE_VIDEO_ID === 'SUBSTITUIR_AQUI' ? (
              <div className="aspect-video bg-surface flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center shadow-lg shadow-popline-pink/30">
                  <svg
                    className="w-7 h-7 text-white ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-text-secondary text-sm">Vídeo manifesto em breve</p>
              </div>
            ) : (
              <iframe
                className="aspect-video w-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
                title="POPline Creators — Manifesto"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="animate-slide-up-delay-3 flex flex-col items-center gap-3">
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

        {/* Status pills */}
        <div className="animate-fade-in flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-text-secondary">
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
