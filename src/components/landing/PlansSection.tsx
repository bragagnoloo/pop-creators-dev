import PlanOfferCard, { PLAN_DISPLAY_ORDER, PLAN_GRID_CLASS } from '@/components/plans/PlanOfferCard';
import { ROUTES } from '@/lib/constants';

// `promo` vem da página (decidido no servidor, junto com a faixa do topo).
export default function PlansSection({ promo = false }: { promo?: boolean }) {
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

        <div className={PLAN_GRID_CLASS}>
          {PLAN_DISPLAY_ORDER.map((planId) => (
            <PlanOfferCard key={planId} planId={planId} promo={promo} href={ROUTES.REGISTER} />
          ))}
        </div>

        {/* Footnote */}
        <p className="text-center text-xs text-text-secondary mt-8">
          Pagamento via PIX ou cartão de crédito. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}
