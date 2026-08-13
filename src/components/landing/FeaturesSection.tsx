'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type Feature = {
  icon: ReactNode;
  title: string;
  description: string;
  tag: string;
  /** Wordmark da categoria, quando ela tem um. */
  logo?: string;
  logoAlt?: string;
  /** drop-shadow na cor da categoria — o glow não é o mesmo para todas. */
  logoGlow?: string;
  novidade?: boolean;
};

const features: Feature[] = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    title: 'Campanhas com cachê',
    description:
      'Marcas parceiras abrem campanhas na plataforma. Você se candidata, cria o conteúdo do briefing e recebe cachê em dinheiro.',
    tag: 'Receba por campanha',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: 'Reviews autênticos',
    description:
      'Álbuns, EPs e singles que acabaram de sair. Você ouve, forma sua opinião e publica o que realmente achou. Sem obrigação de elogiar, porque um review só convence quando é honesto.',
    tag: 'Review de lançamentos',
    logo: '/popline-review-logo.png',
    logoAlt: 'POPline Creators Review',
    logoGlow: 'drop-shadow-[0_0_18px_rgba(168,85,247,0.35)]',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="5" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="1.5" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeWidth={1.5} d="M12 12l6.5-6.5" />
      </svg>
    ),
    title: 'Radar de novos artistas',
    description:
      'Apresente artistas em ascensão à sua comunidade. Você ouve o trabalho, conhece a trajetória e compartilha uma recomendação autêntica — remunerada.',
    tag: 'Descoberta de talentos',
    logo: '/popline-radar-logo.png',
    logoAlt: 'POPline Creators Radar',
    logoGlow: 'drop-shadow-[0_0_18px_rgba(255,122,24,0.35)]',
    novidade: true,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: 'Carteira e PIX',
    description:
      'Seu saldo fica seguro na carteira da plataforma. Solicite saque quando quiser e receba na sua chave PIX em até 48h.',
    tag: 'Saque quando quiser',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Aulas com experts',
    description:
      'Conteúdo educacional exclusivo, produzido por especialistas do mercado musical, criativo e de marketing digital.',
    tag: 'Evolua como creator',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'IA de roteiros',
    description:
      'Gere roteiros profissionais em segundos. Escolha plataforma, duração e tom, e a IA faz o resto.',
    tag: 'Crie mais rápido',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: 'Ranking e oportunidades',
    description:
      'Ganhe pontos assistindo aulas, participando de campanhas e fazendo login diário. Os creators mais ativos desbloqueiam oportunidades exclusivas todo mês.',
    tag: 'Quanto mais ativo, mais prioridade',
  },
];

export default function FeaturesSection() {
  return (
    <section id="vantagens" className="relative py-28 px-4 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-popline-pink/30 to-transparent" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-popline-magenta/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-popline-pink mb-4">
            Vantagens
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Por que ser um <span className="gradient-text">POPline Creator</span>?
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            Campanha, aprendizado, criação e pagamento no mesmo lugar.
          </p>
        </div>

        {/* O trilho vive no recuo à esquerda, então no desktop o conjunto é
            puxado meia largura de recuo para centrar com o cabeçalho. */}
        <div className="relative lg:-translate-x-10">
          {/* Trilho vertical que liga os blocos */}
          <div
            aria-hidden
            className="absolute left-6 top-6 bottom-6 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-popline-pink/25 to-transparent"
          />

          <div className="space-y-4">
            {features.map((feature, i) => (
              <FeatureRow key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ feature, index }: { feature: (typeof features)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        // Revela uma vez só: depois de aparecer, o bloco não some mais ao rolar.
        if (entry.isIntersecting) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const atraso = `${index * 90}ms`;

  return (
    <div
      ref={ref}
      style={{ transitionDelay: atraso }}
      className={`group relative pl-16 sm:pl-20 transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        visivel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Nó sobre o trilho: acende quando o bloco entra na tela */}
      <div
        style={{ transitionDelay: `calc(${atraso} + 120ms)` }}
        className={`absolute left-0 top-6 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-500 motion-reduce:transition-none ${
          visivel
            ? 'gradient-bg text-white shadow-lg shadow-popline-pink/30'
            : 'bg-surface border border-white/10 text-text-secondary'
        }`}
      >
        {feature.icon}
      </div>

      {/* Ligação do trilho até o card */}
      <div
        aria-hidden
        className={`absolute left-12 top-12 h-px w-4 sm:w-8 transition-colors duration-500 ${
          visivel ? 'bg-popline-pink/40' : 'bg-white/10'
        }`}
      />

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-surface/40 backdrop-blur-sm p-6 sm:p-7 transition-all duration-300 hover:border-popline-pink/30 hover:-translate-y-0.5">
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-popline-pink/20 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative">
          {(feature.novidade || feature.logo) && (
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              {feature.novidade && (
                <span className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-gradient-to-r from-popline-purple to-popline-pink px-2.5 sm:px-3 py-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-popline-purple/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-glow" />
                  Novidade recente
                </span>
              )}
              {feature.logo && (
                <Image
                  src={feature.logo}
                  alt={feature.logoAlt ?? feature.title}
                  width={280}
                  height={146}
                  className={`ml-auto w-20 sm:w-32 h-auto shrink-0 ${feature.logoGlow ?? ''}`}
                />
              )}
            </div>
          )}
          <h3 className="text-lg sm:text-xl font-semibold mb-2">{feature.title}</h3>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            {feature.description}
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-popline-light">
            <span className="h-1 w-1 shrink-0 rounded-full bg-popline-pink" />
            {feature.tag}
          </span>
        </div>
      </div>
    </div>
  );
}
