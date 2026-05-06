const steps = [
  {
    number: '01',
    title: 'Crie sua Conta',
    description: 'Cadastro gratuito em minutos. Preencha seu perfil com suas redes sociais e mostre seu potencial como creator.',
  },
  {
    number: '02',
    title: 'Assine um Plano',
    description: 'Desbloqueie candidaturas a campanhas, acesso às aulas com experts e a IA de geração de roteiros.',
  },
  {
    number: '03',
    title: 'Participe & Aprenda',
    description: 'Candidate-se a campanhas exclusivas, assista aulas com especialistas do mercado e gere roteiros com IA.',
  },
  {
    number: '04',
    title: 'Receba pelo PIX',
    description: 'Seu cachê das campanhas aprovadas fica disponível na carteira. Saque quando quiser, direto via PIX.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="como-funciona" className="relative py-28 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-surface/0 via-surface/40 to-surface/0 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-popline-pink mb-4">Passo a passo</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Como <span className="gradient-text">Funciona</span>?
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            Em quatro passos simples você já está criando conteúdo e sendo pago por isso.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Linha conectora */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-[52px] left-[calc(50%+36px)] w-[calc(100%-72px)] h-px bg-gradient-to-r from-popline-pink/20 via-popline-pink/10 to-transparent" />
              )}

              <div className="relative rounded-2xl border border-white/5 bg-surface/40 p-7 group hover:border-popline-pink/20 transition-all duration-300 overflow-hidden h-full">
                {/* Brilho sutil no hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-popline-pink/0 to-popline-pink/0 group-hover:from-popline-pink/[0.03] group-hover:to-transparent transition-all duration-500 pointer-events-none" />

                {/* Número grande com efeito */}
                <div className="relative mb-6">
                  {/* Glow por trás do número */}
                  <div className="absolute -top-2 -left-1 w-14 h-14 bg-popline-pink/10 rounded-full blur-2xl group-hover:bg-popline-pink/20 transition-colors duration-300" />
                  <span
                    className="relative block text-7xl font-black leading-none select-none tracking-tighter"
                    style={{
                      WebkitTextStroke: '1.5px rgba(233,30,140,0.5)',
                      color: 'transparent',
                    }}
                  >
                    {step.number}
                  </span>
                  {/* Linha decorativa abaixo do número */}
                  <div className="mt-3 h-px w-8 bg-gradient-to-r from-popline-pink/50 to-transparent" />
                </div>

                <h3 className="text-base font-bold mb-2 text-text-primary">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
