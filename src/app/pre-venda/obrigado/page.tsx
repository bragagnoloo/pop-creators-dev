'use client';

import Link from 'next/link';

// ─── Substitua pelo link do grupo do WhatsApp ────────────────────────────────
const WHATSAPP_GROUP_URL = '#';
// ─────────────────────────────────────────────────────────────────────────────

const TEASERS = [
  { icon: '🎯', label: 'Campanhas exclusivas' },
  { icon: '💰', label: 'Recompensas reais' },
  { icon: '🎵', label: 'Comunidade creators' },
];

export default function ObrigadoPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-x-hidden noise-overlay grid-bg px-4 py-16">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-popline-magenta/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div
          className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-popline-pink/15 rounded-full blur-[120px] animate-pulse-glow"
          style={{ animationDelay: '2s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-popline-light/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center gap-8">
        {/* Check icon */}
        <div className="animate-slide-up">
          <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center shadow-2xl shadow-popline-pink/30">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
                style={{
                  strokeDasharray: 30,
                  strokeDashoffset: 30,
                  animation: 'draw-check 0.6s ease-out 0.4s forwards',
                }}
              />
            </svg>
          </div>
        </div>

        {/* Badge + Title */}
        <div className="flex flex-col items-center gap-3">
          <div className="animate-slide-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-popline-pink/20">
            <span className="text-popline-light text-xs font-bold tracking-widest">
              ✦ CADASTRO CONFIRMADO ✦
            </span>
          </div>
          <h1 className="animate-slide-up-delay-1 text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="gradient-text">Você está dentro!</span>
          </h1>
        </div>

        {/* Message */}
        <p className="animate-slide-up-delay-2 text-lg text-text-secondary leading-relaxed max-w-md">
          Parabéns! Você foi um dos primeiros a garantir seu acesso à
          plataforma.{' '}
          <span className="text-text-primary font-medium">
            Em breve você receberá todas as novidades no seu e-mail e WhatsApp.
          </span>
        </p>

        {/* WhatsApp CTA */}
        <div className="animate-slide-up-delay-3 flex flex-col items-center gap-3 w-full">
          <a
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 w-full max-w-xs px-8 py-4 rounded-xl font-bold text-white text-base transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: '#25D366' }}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.551 4.116 1.515 5.849L.057 23.98l6.304-1.645A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.922 0-3.732-.513-5.288-1.407l-.378-.224-3.92 1.022 1.045-3.816-.247-.393A9.927 9.927 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            Entrar no Grupo do WhatsApp
          </a>
          <p className="text-xs text-text-secondary">
            Fique por dentro de tudo antes do lançamento
          </p>
        </div>

        {/* Teaser cards */}
        <div className="animate-fade-in grid grid-cols-3 gap-3 w-full mt-2">
          {TEASERS.map(({ icon, label }) => (
            <div
              key={label}
              className="glass-card rounded-xl p-3 flex flex-col items-center gap-1.5"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs text-text-secondary text-center leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Back link */}
        <Link
          href="/pre-venda"
          className="animate-fade-in text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          ← Voltar para o início
        </Link>
      </div>

      <style>{`
        @keyframes draw-check {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </main>
  );
}
