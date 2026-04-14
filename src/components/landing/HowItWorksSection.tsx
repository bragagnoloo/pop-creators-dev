import UgcLogo from '@/components/ui/UgcLogo';

const steps = [
  {
    number: '01',
    title: 'Crie sua Conta',
    description: 'Cadastre-se gratuitamente na plataforma POPline Creators powered by UGC+.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Complete seu Perfil',
    description: 'Adicione suas redes sociais, localizacao e mostre quem voce e como criador.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Participe de Campanhas',
    description: 'Candidate-se para campanhas exclusivas, crie conteudo e seja recompensado.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function HowItWorksSection() {
  return (
    <section id="como-funciona" className="relative py-28 px-4 overflow-hidden">
      {/* Subtle bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface/0 via-surface/50 to-surface/0 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-popline-pink mb-4">Passo a passo</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Como <span className="gradient-text">Funciona</span>?
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            Em tres passos voce ja esta participando de campanhas.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-popline-pink/30 to-popline-pink/10" />
              )}

              <div className="glass-card rounded-2xl p-8 text-center group hover:border-popline-pink/20 transition-all duration-300">
                {/* Number */}
                <div className="text-5xl font-black text-popline-pink/10 mb-4 group-hover:text-popline-pink/20 transition-colors">
                  {step.number}
                </div>

                {/* Icon circle */}
                <div className="w-14 h-14 rounded-full gradient-bg mx-auto flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-popline-pink/20">
                  {step.icon}
                </div>

                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* UGC+ floating badge */}
        <div className="flex items-center justify-center mt-12 gap-3 text-text-secondary text-sm">
          <div className="h-px w-12 bg-border" />
          <UgcLogo size={20} />
          <span>Tecnologia UGC+</span>
          <div className="h-px w-12 bg-border" />
        </div>
      </div>
    </section>
  );
}
