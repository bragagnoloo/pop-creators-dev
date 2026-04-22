const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: 'Campanhas Exclusivas',
    description: 'Acesse campanhas do maior portal de musica do Brasil e participe de projetos ao lado de grandes artistas.',
    gradient: 'from-popline-pink/20 to-transparent',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Seja Recompensado',
    description: 'Ganhe por cada conteudo criado. Construa sua carreira e monetize sua criatividade no nicho musical.',
    gradient: 'from-purple-500/20 to-transparent',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Rede de Criadores',
    description: 'Faca parte de uma rede exclusiva de creators apaixonados por musica, cultura e entretenimento.',
    gradient: 'from-blue-500/20 to-transparent',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Alcance Massivo',
    description: 'Amplie sua visibilidade com a forca do ecossistema POPline — milhoes de pessoas no nicho musical.',
    gradient: 'from-emerald-500/20 to-transparent',
  },
];

export default function FeaturesSection() {
  return (
    <section id="vantagens" className="relative py-28 px-4 overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-popline-pink/30 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-popline-pink mb-4">Vantagens</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Por que ser um <span className="gradient-text">POPline Creator</span>?
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            Tudo que voce precisa para transformar sua criatividade em oportunidade.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`glass-card glow-border rounded-2xl p-7 transition-all duration-300 group`}
            >
              {/* Gradient accent */}
              <div className={`absolute top-0 left-0 w-full h-full rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              <div className="relative">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
