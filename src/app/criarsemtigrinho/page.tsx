import { createClient } from '@/lib/supabase/server';
import { getPublishedOpportunities } from '@/services/opportunities';
import SoundWaves from '@/components/landing/SoundWaves';
import OpportunitiesExplorer from '@/components/criarsemtigrinho/OpportunitiesExplorer';

// Reflete edições do admin sem ser dinâmico a cada request.
export const revalidate = 60;

// Vídeo informativo — trocar pela URL final quando disponível.
// (ex: Supabase Storage: https://<proj>.supabase.co/storage/v1/object/public/videos/...)
const VIDEO_URL = '';

export default async function CriarSemTigrinhoPage() {
  const supabase = await createClient();
  const opportunities = await getPublishedOpportunities(supabase);

  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-x-hidden noise-overlay grid-bg">
      {/* Top bar com glass */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-16 px-6 backdrop-blur-md bg-background/60 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold gradient-text tracking-tight">POPline</span>
          <span className="text-sm font-medium text-text-secondary tracking-widest uppercase">Creators</span>
        </div>
      </header>

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-popline-magenta/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div
          className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-popline-pink/15 rounded-full blur-[120px] animate-pulse-glow"
          style={{ animationDelay: '2s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-popline-light/5 rounded-full blur-[150px]" />
      </div>

      {/* ── HERO ── */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-8 pt-28 sm:pt-36 pb-8 text-center">
        {/* SoundWaves atrás só do hero */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <SoundWaves />
        </div>

        {/* Badge */}
        <div className="animate-slide-up inline-flex items-center gap-2 px-5 py-2 rounded-full glass-card border border-popline-pink/20">
          <span className="w-2 h-2 rounded-full bg-popline-pink animate-pulse" />
          <span className="text-popline-light text-xs font-bold tracking-widest">#CriarSemTigrinho</span>
          <span className="w-2 h-2 rounded-full bg-popline-pink animate-pulse" />
        </div>

        {/* Headline */}
        <h1 className="animate-slide-up-delay-1 mt-6 text-4xl sm:text-6xl font-bold leading-[1.08] tracking-tight">
          É possível viver da internet{' '}
          <span className="gradient-text">sem divulgar apostas</span>
        </h1>

        {/* Sub-headline */}
        <p className="animate-slide-up-delay-2 mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
          O <span className="text-text-primary font-medium">#CriarSemTigrinho</span> é uma iniciativa do
          POPline Creators que reúne oportunidades reais de monetização para creators — campanhas com
          marcas, UGC, programas de afiliados, plataformas, editais e outras formas de gerar renda de
          maneira ética e sustentável.
        </p>

        {/* Mote */}
        <p className="animate-slide-up-delay-3 mt-8 text-xl sm:text-2xl font-bold">
          <span className="gradient-text">Crie mais. Monetize melhor.</span>
        </p>

        {/* Vídeo informativo */}
        <div className="animate-slide-up-delay-3 mt-10 sm:mt-12">
          <p className="text-xs text-text-secondary tracking-wider uppercase mb-3">
            Entenda o que é o #CriarSemTigrinho
          </p>
          <div className="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-popline-pink/10 glow-border">
            {VIDEO_URL ? (
              <video
                className="aspect-video w-full object-cover"
                src={VIDEO_URL}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="aspect-video w-full flex flex-col items-center justify-center gap-3 bg-surface/60">
                <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="text-sm text-text-secondary">Vídeo em breve</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── GRID DE OPORTUNIDADES ── */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-4 pb-24">
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-popline-pink mb-3">
            Oportunidades
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold">
            Formas reais de <span className="gradient-text">monetizar</span>
          </h2>
          <p className="text-text-secondary max-w-lg mx-auto mt-3">
            Toque em um card para ver os detalhes e acessar a plataforma.
          </p>
        </div>

        <OpportunitiesExplorer opportunities={opportunities} />
      </section>

      {/* Rodapé */}
      <footer className="relative z-10 w-full border-t border-white/5 py-8 text-center">
        <p className="text-sm font-bold gradient-text">Crie mais. Monetize melhor.</p>
        <p className="text-xs text-text-secondary mt-2">Uma iniciativa do POPline Creators.</p>
      </footer>
    </main>
  );
}
