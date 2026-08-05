'use client';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatBRL } from '@/services/wallet';
import type { B2BFinanceTotals, B2BPlatformMeta } from '@/types';

interface Props {
  totals: B2BFinanceTotals;
  meta: B2BPlatformMeta | null;
  selectedTitle: string | null;
  onClearSelection: () => void;
}

function pct(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1).replace('.', ',')}%`;
}

/** Linha secundária dentro de um bloco: rótulo à esquerda, valor à direita. */
function Line({
  label,
  value,
  valueClass = 'text-text-primary',
  title,
}: {
  label: string;
  value: string;
  valueClass?: string;
  title?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs" title={title}>
      <span className="text-text-secondary">{label}</span>
      <span className={`font-medium tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

/**
 * Bloco com o valor CONCRETIZADO em evidência.
 *
 * O número grande é sempre o que de fato entrou ou saiu; o previsto/acordado
 * vira uma linha secundária. A hierarquia visual passa a responder "quanto
 * disso é real?" em vez de "quanto foi combinado?".
 */
function Block({
  title,
  hero,
  heroLabel,
  heroClass = 'text-text-primary',
  heroCaption,
  children,
}: {
  title: string;
  hero: string;
  heroLabel: string;
  heroClass?: string;
  heroCaption?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-4 flex flex-col">
      <p className="text-[11px] uppercase tracking-wide text-text-secondary mb-2">
        {title}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-text-secondary/80">
        {heroLabel}
      </p>
      <p className={`text-3xl font-bold leading-tight break-words ${heroClass}`}>{hero}</p>
      {heroCaption && (
        <p className="text-[10px] text-text-secondary mt-0.5">{heroCaption}</p>
      )}
      {children && (
        <div className="mt-3 space-y-1 border-t border-border pt-2">{children}</div>
      )}
    </Card>
  );
}

export default function B2BBigNumbers({
  totals,
  meta,
  selectedTitle,
  onClearSelection,
}: Props) {
  const isFiltered = selectedTitle !== null;
  const temAlerta = totals.exposedRevenueTotal > 0 || totals.pendingToGenerateTotal > 0;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-sm text-text-secondary">
          {isFiltered ? (
            <>
              Filtrando por:{' '}
              <span className="text-text-primary font-medium">{selectedTitle}</span>
            </>
          ) : (
            <>
              Plataforma ·{' '}
              <span className="text-text-primary font-medium">
                {totals.campaigns} campanha{totals.campaigns === 1 ? '' : 's'}
              </span>{' '}
              · {totals.finalizadas} finalizada{totals.finalizadas === 1 ? '' : 's'},{' '}
              {totals.emAberto} em aberto
            </>
          )}
        </p>
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Limpar seleção
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Block
          title="Receita B2B"
          heroLabel="Recebido"
          hero={formatBRL(totals.companyPaidTotal)}
          heroClass="text-emerald-400"
          heroCaption={`${pct(totals.companyPaidPct)} do valor acordado entrou`}
        >
          <Line
            label="Acordado (estimado)"
            value={formatBRL(totals.agreedTotal)}
            valueClass="text-text-secondary"
          />
          <Line
            label="A receber"
            value={formatBRL(totals.companyOutstandingTotal)}
            valueClass={totals.companyOutstandingTotal > 0 ? 'text-amber-400' : undefined}
          />
          <Line
            label="Pagamentos"
            value={`${totals.paymentPago} pagos · ${totals.paymentParcial} parciais · ${totals.paymentPendente} pendentes`}
            valueClass="text-text-secondary"
          />
        </Block>

        <Block
          title="Custo com creators"
          heroLabel="Cachê já gerado"
          hero={formatBRL(totals.creditedTotal)}
          heroCaption={`${pct(totals.creditedPct)} do previsto já virou crédito`}
        >
          <Line
            label="Previsto (estimado)"
            value={formatBRL(totals.dueCreatorsTotal)}
            valueClass="text-text-secondary"
            title={`${totals.eligibleTotal} aptos × cachê da campanha`}
          />
          <Line
            label="Pago aos creators"
            value={
              meta && !isFiltered && meta.paidUnattributed > 0
                ? `${formatBRL(totals.paidTotal)} (+${formatBRL(meta.paidUnattributed)} s/ campanha)`
                : formatBRL(totals.paidTotal)
            }
            valueClass="text-emerald-400"
          />
          <Line
            label="Em carteira"
            value={formatBRL(totals.walletTotal)}
            valueClass="text-amber-400"
            title="Disponível na carteira dos creators, ainda não sacado."
          />
        </Block>

        <Block
          title="Resultado"
          heroLabel="Margem concretizada"
          hero={formatBRL(totals.realizedMarginTotal)}
          heroClass={totals.realizedMarginTotal < 0 ? 'text-red-400' : 'text-emerald-400'}
          heroCaption={`${pct(totals.realizedMarginPct)} sobre o que foi recebido`}
        >
          <Line
            label="Recebido líquido"
            value={formatBRL(totals.realizedNetRevenueTotal)}
            title="Recebido das empresas menos o imposto de cada campanha."
          />
          <Line
            label="− Cachê gerado"
            value={formatBRL(totals.creditedTotal)}
            valueClass="text-text-secondary"
          />
          <Line
            label="Margem estimada"
            value={`${formatBRL(totals.marginTotal)} · ${pct(totals.marginPct)}`}
            valueClass="text-text-secondary"
            title="Se tudo que foi acordado entrar e todo o cachê previsto for pago."
          />
        </Block>
      </div>

      {temAlerta && (
        <Card className="p-4 mt-3 border-red-500/30 bg-red-500/[0.04]">
          <p className="text-[11px] uppercase tracking-wide text-red-400 mb-2">
            ⚠ Alertas financeiros
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {totals.exposedRevenueTotal > 0 && (
              <div>
                <p className="text-xl font-bold text-red-400">
                  {formatBRL(totals.exposedRevenueTotal)}
                </p>
                <p className="text-[11px] text-text-secondary">
                  <span className="text-red-400 font-medium">Receita pendente</span> —{' '}
                  {totals.exposedCampaigns} campanha
                  {totals.exposedCampaigns === 1 ? '' : 's'} com{' '}
                  {formatBRL(totals.exposedCommittedTotal)} de cachê já gerado e empresa
                  ainda devendo
                </p>
              </div>
            )}
            {totals.pendingToGenerateTotal > 0 && (
              <div>
                <p className="text-xl font-bold text-red-400">
                  {formatBRL(totals.pendingToGenerateTotal)}
                </p>
                <p className="text-[11px] text-text-secondary">
                  <span className="text-red-400 font-medium">Saldo a gerar</span> —{' '}
                  {totals.pendingToGenerateCampaigns} campanha
                  {totals.pendingToGenerateCampaigns === 1 ? '' : 's'} concluída
                  {totals.pendingToGenerateCampaigns === 1 ? '' : 's'} sem cachê creditado
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
