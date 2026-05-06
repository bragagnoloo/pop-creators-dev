import Link from 'next/link';
import Button from '@/components/ui/Button';
import SoundWaves from './SoundWaves';
import { ROUTES } from '@/lib/constants';

export default function HeroSection() {
  return (
    <section className="relative grid-bg overflow-x-clip">
      {/* Background orbs — z-0 */}
      <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-popline-magenta/15 rounded-full blur-[120px] animate-pulse-glow pointer-events-none z-0" />
      <div className="absolute bottom-0 -right-20 w-[400px] h-[400px] bg-popline-pink/10 rounded-full blur-[100px] animate-pulse-glow pointer-events-none z-0" style={{ animationDelay: '2s' }} />

      {/* SoundWaves — z-0, só client */}
      <SoundWaves />

      {/* Conteúdo — z-10, sempre acima */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16 sm:pb-24 text-center">

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-3 mb-6 sm:mb-8">
          <span className="h-px w-6 bg-popline-pink" />
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-popline-pink">
            Plataforma para Creators
          </span>
          <span className="h-px w-6 bg-popline-pink" />
        </div>

        {/* Headline */}
        <h1 className="font-black leading-[1.05] tracking-tight mb-6 sm:mb-8">
          <span className="block text-3xl sm:text-5xl lg:text-6xl text-text-primary">
            Crie conteúdo para o
          </span>
          <span className="block text-3xl sm:text-5xl lg:text-6xl gradient-text">
            maior ecossistema
          </span>
          <span className="block text-3xl sm:text-5xl lg:text-6xl text-text-primary">
            sobre música e
          </span>
          <span className="block text-3xl sm:text-5xl lg:text-6xl text-text-primary">
            <em style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontWeight: 400 }}>
              cultura pop
            </em>
            {' '}do Brasil.
          </span>
        </h1>

        {/* Description */}
        <p className="text-base sm:text-xl text-text-secondary max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
          Campanhas com cachê, aulas com experts e IA de roteiros —
          tudo que você precisa para monetizar sua criatividade.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16">
          <Link href={ROUTES.REGISTER}>
            <Button size="lg" className="text-base min-w-[200px]">Começar agora</Button>
          </Link>
          <a href="#planos">
            <Button variant="secondary" size="lg" className="text-base min-w-[200px]">Ver planos</Button>
          </a>
        </div>

        {/* Stats */}
        <div className="border-t border-white/5 pt-8 sm:pt-10">
          <div className="flex items-center justify-center gap-8 sm:gap-16">
            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-black shimmer-text mb-1">100+</div>
              <div className="text-[10px] sm:text-sm text-text-secondary uppercase tracking-wider font-medium">Criadores</div>
            </div>
            <div className="w-px h-8 bg-border shrink-0" />
            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-black shimmer-text mb-1">10+</div>
              <div className="text-[10px] sm:text-sm text-text-secondary uppercase tracking-wider font-medium">Campanhas</div>
            </div>
            <div className="w-px h-8 bg-border shrink-0" />
            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-black shimmer-text mb-1">+10M</div>
              <div className="text-[10px] sm:text-sm text-text-secondary uppercase tracking-wider font-medium">Alcance</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
