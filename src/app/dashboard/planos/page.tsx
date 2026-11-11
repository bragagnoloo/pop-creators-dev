'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { pixelViewContent, pixelPurchase } from '@/lib/pixel';
import useSWR from 'swr';
import { useAuth } from '@/providers/AuthProvider';
import { useCheckout } from '@/hooks/useCheckout';
import * as subService from '@/services/subscriptions';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import PlanOfferCard, { PLAN_DISPLAY_ORDER, PLAN_GRID_CLASS } from '@/components/plans/PlanOfferCard';

export default function PlanosPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentSuccess = searchParams.get('payment') === 'success';

  const { data: sub, mutate: mutateSub } = useSWR(
    user ? ['subscription', user.id] : null,
    ([, uid]) => subService.getUserSubscription(uid),
    { refreshInterval: paymentSuccess ? 3000 : 0 },
  );

  const currentPlan = sub?.plan ?? 'free';
  // Promo (de/por, contador, link com desconto) vale para free e assinantes.
  const promo = subService.isPromoActive();
  const expiresAt = sub?.expiresAt ? new Date(sub.expiresAt) : null;

  // Polling: quando voltar com ?payment=success, aguardar plano ativar
  useEffect(() => {
    if (!paymentSuccess) return;
    if (currentPlan !== 'free') {
      fetch('/api/tracking/latest-order')
        .then(r => r.json())
        .then(({ orderId }: { orderId: string | null }) => {
          pixelPurchase({
            value: subService.PLANS[currentPlan].priceTotal,
            currency: 'BRL',
            content_name: subService.PLANS[currentPlan].name,
          }, orderId ?? undefined);
        })
        .catch(() => {})
        .finally(() => router.replace('/dashboard/planos'));
    }
  }, [paymentSuccess, currentPlan, router]);

  useEffect(() => {
    pixelViewContent({ content_name: 'Planos POPline Creators' });
  }, []);

  const { subscribeTo: handleSubscribe } = useCheckout(user);

  return (
    <div className="py-8 space-y-8">
      {/* Banner de verificação pós-pagamento */}
      {paymentSuccess && currentPlan === 'free' && (
        <div className="p-4 rounded-xl bg-popline-pink/10 border border-popline-pink/20 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-4 h-4 border-2 border-popline-pink border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-popline-pink">Verificando seu pagamento...</span>
          </div>
          <p className="text-xs text-text-secondary">Isso pode levar alguns segundos.</p>
        </div>
      )}

      {paymentSuccess && currentPlan !== 'free' && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
          <p className="text-sm font-medium text-green-400">
            Plano {subService.PLANS[currentPlan].name} ativado com sucesso!
          </p>
        </div>
      )}

      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">Escolha seu plano</h1>
        <p className="text-text-secondary mt-2">
          Desbloqueie candidaturas, aulas, IA de Roteiros e oportunidades exclusivas.
        </p>
      </div>

      {/* Plano atual */}
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
                {sub?.kiwifySubscriptionId
                  ? ' · Renovação automática ativa'
                  : ' · Sem renovação automática'}
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

      {/* Grade de planos: mesmo card da LP, com a promo para qualquer plano. */}
      <div className={`${PLAN_GRID_CLASS} pt-4`}>
        {PLAN_DISPLAY_ORDER.map(planId => (
          <PlanOfferCard
            key={planId}
            planId={planId}
            promo={promo}
            onClick={() => handleSubscribe(planId)}
            disabled={currentPlan === planId}
            ctaLabel={currentPlan === planId ? 'Plano atual' : promo && subService.PROMO_PRICES[planId] ? undefined : 'Assinar'}
          />
        ))}
      </div>

      {/* Tabela comparativa */}
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
              <ComparisonRow label="Visualizar campanhas"     values={['✓', '✓', '✓', '✓']} />
              <ComparisonRow label="Candidatar-se"           values={['—', '✓', '✓', '✓']} />
              <ComparisonRow label="Assistir aulas"          values={['—', '✓', '✓', '✓']} />
              <ComparisonRow label="IA de Roteiros"          values={['—', '✓', '✓', '✓']} />
              <ComparisonRow label="Modificador de aprovação" values={['—', '1x', '2x', '5x']} />
              <ComparisonRow label="Oportunidades exclusivas" values={['—', '—', '✓', '✓ VIP']} />
            </tbody>
          </table>
        </div>
      </Card>
    </div>
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
