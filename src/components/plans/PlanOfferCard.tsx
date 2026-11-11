import Link from 'next/link';
import Button from '@/components/ui/Button';
import PromoCountdown from '@/components/ui/PromoCountdown';
import { PLANS, PROMO_PRICES, PROMO_LABEL } from '@/services/subscriptions';

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

export type PaidPlan = 'monthly' | 'semester' | 'yearly';

// O Anual fica no centro, maior, como plano em destaque.
export const PLAN_DISPLAY_ORDER: PaidPlan[] = ['monthly', 'yearly', 'semester'];

// Grade dos três cards: a coluna do meio (Anual) é mais larga.
export const PLAN_GRID_CLASS = 'grid grid-cols-1 md:grid-cols-[1fr_1.2fr_1fr] md:items-center gap-8 md:gap-5';

const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

/**
 * Card de plano compartilhado pela LP e pela aba Planos. `promo` liga o
 * preço "de/por", o selo e o contador nos planos que têm desconto. O CTA é
 * um link (LP → cadastro) ou um clique (aba Planos → checkout).
 */
export default function PlanOfferCard({
  planId, promo, href, onClick, disabled = false, ctaLabel,
}: {
  planId: PaidPlan;
  promo: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  ctaLabel?: string;
}) {
  const info = PLANS[planId];
  const features = PLAN_FEATURES[planId];
  const isHighlighted = planId === 'yearly';
  const pr = promo ? PROMO_PRICES[planId] : undefined;
  const total = pr?.priceTotal ?? info.priceTotal;
  const savings = PLANS.monthly.priceTotal * 12 - total;

  const button = (
    <Button
      className="w-full"
      size={isHighlighted ? 'lg' : 'md'}
      variant={isHighlighted ? 'primary' : 'secondary'}
      onClick={onClick}
      disabled={disabled}
    >
      {ctaLabel ?? (pr ? `Garantir ${PROMO_LABEL}` : `Começar com ${info.name}`)}
    </Button>
  );

  return (
    <div
      className={`relative rounded-3xl transition-all duration-300 ${
        isHighlighted
          ? 'order-first md:order-none p-[1.5px] gradient-bg shadow-[0_0_80px_-12px] shadow-popline-pink/50'
          : 'border border-border hover:border-border/80'
      }`}
    >
    <div className={`relative h-full rounded-[calc(1.5rem-1.5px)] flex flex-col gap-5 ${
      isHighlighted ? 'bg-surface p-8 md:py-10' : 'bg-surface p-7'
    }`}>
      {isHighlighted && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[11px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full bg-black text-white ring-1 ring-popline-pink shadow-lg whitespace-nowrap">
          {pr ? <>Black Friday · <span className="text-popline-pink">{PROMO_LABEL}</span></> : 'Melhor custo-benefício'}
        </span>
      )}

      {/* Plan header */}
      <div>
        <h3 className={`font-bold ${isHighlighted ? 'text-2xl' : 'text-xl'}`}>{info.name}</h3>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{info.tagline}</p>
      </div>

      {/* Price */}
      <div className="border-t border-border/50 pt-5">
        {pr && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-text-secondary line-through">
              {brl(info.monthlyEquivalent)}/mês
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-popline-pink text-white">
              {PROMO_LABEL}
            </span>
          </div>
        )}
        <div className="flex items-end gap-1">
          <span className={`font-black ${isHighlighted ? 'text-5xl' : 'text-4xl'}`}>
            {brl(pr?.monthlyEquivalent ?? info.monthlyEquivalent)}
          </span>
          <span className="text-text-secondary text-sm mb-1">/mês</span>
        </div>
        {planId !== 'monthly' && (
          <p className="text-xs text-text-secondary mt-1">
            Cobrado {pr && <><span className="line-through">{brl(info.priceTotal)}</span>{' '}</>}
            {brl(total)} {planId === 'semester' ? 'a cada 6 meses' : 'por ano'}
          </p>
        )}
        {planId === 'yearly' && (
          <p className="text-xs text-popline-light font-medium mt-1">
            Economia de {brl(savings)}/ano vs. mensal
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

      {pr && <PromoCountdown />}

      {/* CTA */}
      {href ? <Link href={href} className="block mt-1">{button}</Link> : <div className="mt-1">{button}</div>}
    </div>
    </div>
  );
}
