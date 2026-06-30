import Link from 'next/link';
import Button from '@/components/ui/Button';
import { PLANS } from '@/services/subscriptions';
import { ROUTES } from '@/lib/constants';

const PLAN_FEATURES = {
  monthly: [
    { label: 'Candidaturas ilimitadas', highlight: false },
    { label: 'Todas as aulas com experts', highlight: false },
    { label: 'IA de Roteiros', highlight: false },
    { label: 'Prioridade padrão na seleção', highlight: false },
    { label: 'Carteira & PIX', highlight: false },
  ],
  semester: [
    { label: 'Candidaturas ilimitadas', highlight: false },
    { label: 'Todas as aulas com experts', highlight: false },
    { label: 'IA de Roteiros', highlight: false },
    { label: '2x mais prioridade na seleção', highlight: true },
    { label: 'Carteira & PIX', highlight: false },
    { label: 'Oportunidades exclusivas', highlight: true },
  ],
  yearly: [
    { label: 'Candidaturas ilimitadas', highlight: false },
    { label: 'Todas as aulas com experts', highlight: false },
    { label: 'IA de Roteiros', highlight: false },
    { label: '5x mais prioridade na seleção', highlight: true },
    { label: 'Carteira & PIX', highlight: false },
    { label: 'Oportunidades exclusivas', highlight: true },
    { label: 'Destaque VIP nas campanhas', highlight: true },
  ],
} as const;

type PaidPlan = 'monthly' | 'semester' | 'yearly';

const PLAN_BADGES: Record<PaidPlan, string | null> = {
  monthly: null,
  semester: 'Mais Popular',
  yearly: 'Melhor Custo',
};

export default function PlansSection() {
  return (
    <section id="planos" className="relative py-28 px-4 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-popline-pink/30 to-transparent" />

      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-popline-pink/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-popline-pink mb-4">Planos</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Escolha seu <span className="gradient-text">plano</span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            Desbloqueie campanhas, aulas com experts, IA de roteiros e oportunidades exclusivas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(['monthly', 'semester', 'yearly'] as PaidPlan[]).map((planId) => {
            const info = PLANS[planId];
            const badge = PLAN_BADGES[planId];
            const features = PLAN_FEATURES[planId];
            const isHighlighted = planId === 'semester';

            return (
              <div
                key={planId}
                className={`relative rounded-3xl border p-7 flex flex-col gap-5 transition-all duration-300 ${
                  isHighlighted
                    ? 'border-popline-pink bg-popline-pink/[0.04] shadow-2xl shadow-popline-pink/10'
                    : 'border-border bg-surface hover:border-border/80'
                }`}
              >
                {badge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full gradient-bg text-white shadow-lg whitespace-nowrap">
                    {badge}
                  </span>
                )}

                {/* Plan header */}
                <div>
                  <h3 className="text-xl font-bold">{info.name}</h3>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">{info.tagline}</p>
                </div>

                {/* Price */}
                <div className="border-t border-border/50 pt-5">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black">
                      R$ {info.monthlyEquivalent.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-text-secondary text-sm mb-1">/mês</span>
                  </div>
                  {planId !== 'monthly' && (
                    <p className="text-xs text-text-secondary mt-1">
                      Cobrado R$ {info.priceTotal.toFixed(2).replace('.', ',')}{' '}
                      {planId === 'semester' ? 'a cada 6 meses' : 'por ano'}
                    </p>
                  )}
                  {planId === 'yearly' && (
                    <p className="text-xs text-popline-light font-medium mt-1">
                      Economia de R$ 239,40/ano vs. mensal
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2.5 text-sm">
                      <svg
                        className={`w-4 h-4 mt-0.5 shrink-0 ${f.highlight ? 'text-popline-pink' : 'text-emerald-400'}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className={f.highlight ? 'font-semibold text-text-primary' : 'text-text-secondary'}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href={ROUTES.REGISTER} className="block mt-1">
                  <Button
                    className="w-full"
                    variant={isHighlighted ? 'primary' : 'secondary'}
                  >
                    Começar com {info.name}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Footnote */}
        <p className="text-center text-xs text-text-secondary mt-8">
          Pagamento via PIX ou cartão de crédito. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}
