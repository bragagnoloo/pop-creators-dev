'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/providers/AuthProvider';
import { PlanId } from '@/types';
import * as subService from '@/services/subscriptions';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';

export default function PlanosPage() {
  const { user } = useAuth();
  const [showSubscribe, setShowSubscribe] = useState<PlanId | null>(null);

  const { data: sub, mutate: mutateSub } = useSWR(
    user ? ['subscription', user.id] : null,
    ([, uid]) => subService.getUserSubscription(uid)
  );

  const currentPlan = sub?.plan ?? 'free';
  const expiresAt = sub?.expiresAt ? new Date(sub.expiresAt) : null;

  return (
    <div className="py-8 space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">Escolha seu plano</h1>
        <p className="text-text-secondary mt-2">
          Desbloqueie candidaturas, aulas, IA de Roteiros e prêmios exclusivos.
        </p>
      </div>

      {/* Current plan card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm text-text-secondary">Seu plano atual</p>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-xl font-bold">{subService.PLANS[currentPlan].name}</h2>
              {currentPlan !== 'free' && <Badge variant="success">Ativo</Badge>}
              {currentPlan === 'free' && <Badge variant="warning">Limitado</Badge>}
            </div>
            {expiresAt && currentPlan !== 'free' && (
              <p className="text-xs text-text-secondary mt-1">
                Expira em {expiresAt.toLocaleDateString('pt-BR')}
              </p>
            )}
            {currentPlan === 'free' && (
              <p className="text-xs text-text-secondary mt-1">
                Você pode visualizar tudo, mas precisa assinar para usar.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Plans grid */}
      <div className="grid md:grid-cols-3 gap-5">
        <PlanCard
          plan="monthly"
          current={currentPlan}
          onSubscribe={() => setShowSubscribe('monthly')}
        />
        <PlanCard
          plan="semester"
          current={currentPlan}
          onSubscribe={() => setShowSubscribe('semester')}
          highlighted
        />
        <PlanCard
          plan="yearly"
          current={currentPlan}
          onSubscribe={() => setShowSubscribe('yearly')}
        />
      </div>

      {/* Comparison */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Comparação de benefícios</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 pr-4 font-medium text-text-secondary">Benefício</th>
                <th className="py-3 px-2 font-medium">Grátis</th>
                <th className="py-3 px-2 font-medium">Mensal</th>
                <th className="py-3 px-2 font-medium">Semestral</th>
                <th className="py-3 px-2 font-medium">Anual</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-border/50">
              <ComparisonRow label="Visualizar campanhas" values={['✓', '✓', '✓', '✓']} />
              <ComparisonRow label="Candidatar-se a campanhas" values={['—', '✓', '✓', '✓']} />
              <ComparisonRow label="Assistir aulas" values={['—', '✓', '✓', '✓']} />
              <ComparisonRow label="IA de Roteiros" values={['—', '✓', '✓', '✓']} />
              <ComparisonRow label="Modificador de aprovação" values={['—', '1x', '2x', '5x']} />
              <ComparisonRow label="Prêmios exclusivos" values={['—', '—', '✓', '✓ VIP']} />
            </tbody>
          </table>
        </div>
      </Card>

      {/* Subscribe modal (mock payment) */}
      {showSubscribe && user && (
        <Modal isOpen onClose={() => setShowSubscribe(null)} title="Assinar plano">
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-background border border-border">
              <p className="text-xs text-text-secondary">Plano selecionado</p>
              <p className="text-lg font-bold">{subService.PLANS[showSubscribe].name}</p>
              <p className="text-sm">
                {subService.formatBRL(subService.PLANS[showSubscribe].priceTotal)}
                {showSubscribe !== 'monthly' && (
                  <span className="text-text-secondary">
                    {' '}
                    · {subService.formatBRL(subService.PLANS[showSubscribe].monthlyEquivalent)}/mês
                  </span>
                )}
              </p>
            </div>
            <p className="text-sm text-text-secondary">
              A integração de pagamento será plugada na próxima etapa (Stripe / Mercado Pago). Por enquanto,
              para ativar o plano, fale com a gente pelo WhatsApp ou peça ao administrador para liberar.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowSubscribe(null)}>
                Fechar
              </Button>
              <Button
                className="flex-1"
                onClick={async () => {
                  // Dev-only shortcut: self-assign to let UX flow be tested
                  await subService.setUserPlan(user.id, showSubscribe, 'system');
                  mutateSub();
                  setShowSubscribe(null);
                }}
              >
                Ativar (demo)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  current,
  onSubscribe,
  highlighted = false,
}: {
  plan: PlanId;
  current: PlanId;
  onSubscribe: () => void;
  highlighted?: boolean;
}) {
  const info = subService.PLANS[plan];
  const isCurrent = current === plan;

  return (
    <div
      className={`relative rounded-3xl border p-6 flex flex-col gap-4 transition-all ${
        highlighted
          ? 'border-popline-pink bg-popline-pink/[0.04] shadow-lg shadow-popline-pink/10'
          : 'border-border bg-surface'
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full gradient-bg text-white">
          Mais popular
        </span>
      )}
      <div>
        <h3 className="text-lg font-bold">{info.name}</h3>
        <p className="text-xs text-text-secondary mt-1">{info.tagline}</p>
      </div>

      <div>
        <p className="text-3xl font-bold">
          {subService.formatBRL(info.priceTotal)}
          <span className="text-sm text-text-secondary font-normal">
            {plan === 'monthly' ? '/mês' : plan === 'semester' ? '/6 meses' : '/ano'}
          </span>
        </p>
        {plan !== 'monthly' && (
          <p className="text-xs text-text-secondary mt-1">
            equivale a {subService.formatBRL(info.monthlyEquivalent)}/mês
          </p>
        )}
      </div>

      <ul className="space-y-2 text-sm flex-1">
        <FeatureLine label="Candidaturas ilimitadas" />
        <FeatureLine label="Todas as aulas" />
        <FeatureLine label="IA de Roteiros" />
        <FeatureLine label={`${info.modifier}x chance de aprovação em campanhas`} highlight={info.modifier > 1} />
        {info.prizes && <FeatureLine label="Prêmios exclusivos" highlight />}
        {plan === 'yearly' && <FeatureLine label="Destaque VIP nas campanhas" highlight />}
      </ul>

      <Button onClick={onSubscribe} disabled={isCurrent} className="w-full">
        {isCurrent ? 'Plano atual' : 'Assinar'}
      </Button>
    </div>
  );
}

function FeatureLine({ label, highlight = false }: { label: string; highlight?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <svg className={`w-4 h-4 shrink-0 ${highlight ? 'text-popline-pink' : 'text-green-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span className={highlight ? 'font-medium' : ''}>{label}</span>
    </li>
  );
}

function ComparisonRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="py-3 pr-4 text-text-secondary">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-3 px-2">
          {v === '—' ? <span className="text-text-secondary/50">—</span> : <span className="font-medium">{v}</span>}
        </td>
      ))}
    </tr>
  );
}
