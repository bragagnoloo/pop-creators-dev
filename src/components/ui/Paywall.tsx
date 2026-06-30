'use client';

import { useEffect, useState } from 'react';
import Button from './Button';
import GatewayMigrationModal from './GatewayMigrationModal';
import { PLANS, PLAN_ORDER } from '@/services/subscriptions';
import { PAYWALL_TITLE, PAYWALL_PRESETS, type PaywallContext } from '@/lib/paywall-presets';
import type { PlanId } from '@/types';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  description?: string;
  context?: PaywallContext;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

export default function Paywall({ isOpen, onClose, feature, description, context = 'default' }: PaywallProps) {
  // TEMPORÁRIO: durante a migração Kiwify → Hotmart, "Assinar" abre o aviso de
  // migração em vez de redirecionar ao checkout.
  const [showMigration, setShowMigration] = useState(false);
  const preset = PAYWALL_PRESETS[context];

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Compat com a prop legada `feature`/`description`: se passar `description`
  // explícita, usa ela. Senão, usa o preset.
  const subtitle =
    description ?? (feature && context === 'default' ? `${feature} faz parte dos planos pagos.` : preset.description);

  // Planos pagos só (free é o status atual de quem viu o paywall)
  const paidPlans = PLAN_ORDER.filter(id => id !== 'free') as Exclude<PlanId, 'free'>[];

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-popline-pink/30 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl shadow-popline-pink/10">
        {/* Header com gradient */}
        <div className="relative gradient-bg p-6 text-center">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3 right-3 min-h-11 min-w-11 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center leading-none text-xl"
          >
            ×
          </button>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 22l1-7-5-5h7l3-7 3 7h7l-5 5 1 7-6-4z" />
            </svg>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">{PAYWALL_TITLE}</h2>
          <p className="text-sm text-white/90 mt-2 leading-relaxed">{subtitle}</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Benefícios contextuais */}
          <ul className="space-y-2">
            {preset.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-green-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {/* Bloco de planos */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-center text-popline-light">
              {preset.plansHeading}
            </p>

            {paidPlans.map(planId => {
              const plan = PLANS[planId];
              const isHighlight = planId === 'yearly';
              return (
                <div
                  key={planId}
                  className={`relative p-4 rounded-2xl border transition-colors ${
                    isHighlight
                      ? 'border-popline-pink/60 bg-popline-pink/5'
                      : 'border-border bg-background'
                  }`}
                >
                  {isHighlight && (
                    <span className="absolute -top-2 left-4 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-popline-pink text-white">
                      Mais popular
                    </span>
                  )}
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <span className="text-base font-bold">{plan.name}</span>
                    {plan.modifier > 0 && (
                      <span className="text-[11px] text-text-secondary">
                        {plan.modifier}x prioridade em campanhas
                      </span>
                    )}
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-bold">{formatBRL(plan.monthlyEquivalent)}</span>
                    <span className="text-sm text-text-secondary">/mês</span>
                    {plan.durationMonths > 1 && (
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Pago {formatBRL(plan.priceTotal)} a cada {plan.durationMonths} meses
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full min-h-11"
                    variant={isHighlight ? 'primary' : 'secondary'}
                    onClick={() => setShowMigration(true)}
                  >
                    Assinar
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Botão discreto de saída */}
          <div className="flex justify-center pt-1">
            <button
              onClick={onClose}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors px-4 py-2"
            >
              Continuar Explorando
            </button>
          </div>
        </div>
      </div>
    </div>
    <GatewayMigrationModal isOpen={showMigration} onClose={() => setShowMigration(false)} />
    </>
  );
}
