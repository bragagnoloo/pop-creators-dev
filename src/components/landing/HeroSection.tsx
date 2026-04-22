import Link from 'next/link';
import Button from '@/components/ui/Button';
import UgcLogo from '@/components/ui/UgcLogo';
import Popline20Logo from '@/components/ui/Popline20Logo';
import SoundWaves from './SoundWaves';
import { ROUTES } from '@/lib/constants';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden noise-overlay grid-bg">
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-popline-magenta/20 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-popline-pink/15 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-popline-light/5 rounded-full blur-[150px]" />

      {/* Floating POPline 20 Anos logos */}
      <div className="absolute top-28 right-[8%] animate-float opacity-15 hidden lg:block">
        <Popline20Logo size={100} />
      </div>
      <div className="absolute bottom-36 left-[6%] animate-float-delay opacity-10 hidden lg:block">
        <Popline20Logo size={70} />
      </div>
      <div className="absolute top-52 left-[14%] animate-float-slow opacity-[0.07] hidden lg:block">
        <Popline20Logo size={50} />
      </div>
      <div className="absolute bottom-52 right-[15%] animate-float-slow opacity-[0.06] hidden xl:block" style={{ animationDelay: '3s' }}>
        <Popline20Logo size={45} />
      </div>

      {/* Sound frequency waves */}
      <SoundWaves />

      <div className="relative max-w-4xl mx-auto px-4 text-center">
        {/* UGC+ badge */}
        <div className="animate-slide-up inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass-card mb-8">
          <UgcLogo size={24} />
          <span className="text-sm text-text-secondary">powered by <span className="text-text-primary font-semibold">UGC+</span></span>
        </div>

        <h1 className="animate-slide-up-delay-1 text-3xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
          Crie conteúdo para o{' '}
          <span className="gradient-text">maior ecossistema</span>
          <br className="hidden sm:block" />
          sobre <span className="gradient-text">música e cultura pop</span>{' '}
          do Brasil
        </h1>

        <p className="animate-slide-up-delay-2 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          <span className="text-text-primary font-medium">POPline Creators</span> conecta você
          com experts, comunidade exclusiva e campanhas do POPline.
          Participe, crie e seja recompensado.
        </p>

        <div className="animate-slide-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={ROUTES.REGISTER}>
            <Button size="lg" className="min-w-[200px] text-base">Começar Agora</Button>
          </Link>
          <a href="#como-funciona">
            <Button variant="secondary" size="lg" className="min-w-[200px] text-base">Como Funciona?</Button>
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-20 max-w-lg mx-auto">
          {[
            { value: '100+', label: 'Criadores' },
            { value: '10+', label: 'Campanhas' },
            { value: '+10M', label: 'Alcance' },
          ].map((stat, i) => (
            <div key={stat.label} className="group" style={{ animationDelay: `${0.6 + i * 0.1}s` }}>
              <div className="text-2xl sm:text-3xl font-bold shimmer-text">{stat.value}</div>
              <div className="text-xs sm:text-sm text-text-secondary mt-1 group-hover:text-text-primary transition-colors">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 animate-float">
          <svg className="w-6 h-6 mx-auto text-text-secondary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
}
