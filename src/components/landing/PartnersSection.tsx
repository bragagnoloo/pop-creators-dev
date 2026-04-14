import UgcLogo from '@/components/ui/UgcLogo';

export default function PartnersSection() {
  return (
    <section id="parceiro" className="relative py-28 px-4 overflow-hidden">
      {/* Background line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-popline-pink/20 to-transparent" />

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-popline-pink mb-4">Parceria</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Powered by <span className="gradient-text">UGC+</span>
          </h2>
        </div>

        <div className="glass-card rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          {/* Gradient bg accent */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-popline-pink/5 to-transparent pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-popline-pink/10 rounded-full blur-[100px]" />

          <div className="relative flex flex-col lg:flex-row items-center gap-10">
            {/* UGC+ Logo grande */}
            <div className="shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-popline-pink/20 rounded-full blur-[40px] animate-pulse-glow" />
                <UgcLogo size={120} className="relative" />
              </div>
            </div>

            <div className="flex-1 text-center lg:text-left">
              <h3 className="text-2xl font-bold mb-3">
                A tecnologia <span className="gradient-text">UGC+</span> por tras da plataforma
              </h3>
              <p className="text-text-secondary leading-relaxed mb-6">
                A POPline Creators e impulsionada pela <strong className="text-text-primary">UGC+</strong>,
                a plataforma lider em conectar marcas com criadores de conteudo autenticoz (User Generated Content).
                Com a UGC+, cada campanha e otimizada para gerar conteudo genuino,
                engajamento real e resultados mensuraveis para o ecossistema musical.
              </p>

              <div className="grid grid-cols-3 gap-6">
                {[
                  { value: 'UGC', label: 'Conteudo Autentico' },
                  { value: 'AI', label: 'Match Inteligente' },
                  { value: '360°', label: 'Gestao Completa' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="text-xl sm:text-2xl font-bold gradient-text">{item.value}</div>
                    <div className="text-xs text-text-secondary mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
