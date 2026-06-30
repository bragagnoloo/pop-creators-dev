const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    title: 'Campanhas UGC',
    description: 'Acesse campanhas exclusivas de marcas parceiras. Candidate-se, crie o conteúdo briefado e receba seu cachê em dinheiro real.',
    gradient: 'from-popline-pink/15 to-transparent',
    accent: 'text-popline-pink',
    tag: 'Receba por campanhas',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Aulas com Experts',
    description: 'Conteúdo educacional exclusivo produzido por especialistas do mercado musical, criativo e de marketing digital.',
    gradient: 'from-purple-500/15 to-transparent',
    accent: 'text-purple-400',
    tag: 'Evolua como creator',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'IA de Roteiros',
    description: 'Gere roteiros profissionais para UGC e conteúdo pessoal em segundos. Escolha plataforma, duração e tom — a IA faz o resto.',
    gradient: 'from-amber-500/15 to-transparent',
    accent: 'text-amber-400',
    tag: 'Crie mais rápido',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: 'Carteira & PIX',
    description: 'Seu saldo fica seguro na carteira da plataforma. Solicite saque quando quiser — direto na sua chave PIX em até 24h.',
    gradient: 'from-emerald-500/15 to-transparent',
    accent: 'text-emerald-400',
    tag: 'Saque quando quiser',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: 'Ranking & Oportunidades',
    description: 'Ganhe pontos assistindo aulas, participando de campanhas e fazendo login diário. Os creators mais ativos desbloqueiam oportunidades exclusivas todo mês.',
    gradient: 'from-blue-500/15 to-transparent',
    accent: 'text-blue-400',
    tag: 'Compete e vence',
  },
];

export default function FeaturesSection() {
  return (
    <section id="vantagens" className="relative py-28 px-4 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-popline-pink/30 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-popline-pink mb-4">Vantagens</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Por que ser um{' '}
            <span className="gradient-text">POPline Creator</span>?
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            Tudo que você precisa para transformar sua criatividade em oportunidade.
          </p>
        </div>

        {/* Top row: 3 features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.slice(0, 3).map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>

        {/* Bottom row: 2 features centered */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5 lg:max-w-[calc(66.666%+10px)] lg:mx-auto">
          {features.slice(3).map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: typeof features[0] }) {
  return (
    <div className="glass-card glow-border rounded-2xl p-7 transition-all duration-300 group relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-full rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
            {feature.icon}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${feature.accent} border-current opacity-60`}>
            {feature.tag}
          </span>
        </div>
        <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
      </div>
    </div>
  );
}
