'use client';

import { useMemo } from 'react';
import Badge from '@/components/ui/Badge';
import RiskThermometer from './RiskThermometer';
import type { RenderColumn } from './B2BTable';
import {
  assessRisk,
  pendingToRelease,
  daysOpenWithoutClosing,
  CAMPAIGN_STALE_DAYS,
} from '@/lib/b2b-risk';
import { isRevenueExposed } from '@/services/b2b-finance';
import { formatBRL } from '@/services/wallet';
import { formatBRDate } from '@/lib/date-br';
import type { B2BFinanceRow, B2BPaymentStatus } from '@/types';

/**
 * Linha somente-leitura.
 *
 * Antes cada linha carregava 10 controles editáveis — com 26 campanhas eram 260
 * caixas de input na tela, o que fazia a tabela parecer um formulário gigante.
 * A edição migrou para o painel lateral; aqui o objetivo é densidade e leitura.
 */

interface Props {
  row: B2BFinanceRow;
  columns: RenderColumn[];
  selected: boolean;
  onOpen: (campaignId: string) => void;
}

const TYPE_BADGE: Record<B2BFinanceRow['campaignType'], React.ReactNode> = {
  standard: null,
  review: <Badge variant="purple">Review</Badge>,
  invite: <Badge variant="pink">Convite</Badge>,
};

const CAMPAIGN_STATUS_LABEL: Record<B2BFinanceRow['campaignStatus'], string> = {
  open: 'Vagas Abertas',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
};

const CAMPAIGN_STATUS_DOT: Record<B2BFinanceRow['campaignStatus'], string> = {
  open: 'bg-sky-400',
  in_progress: 'bg-indigo-400',
  completed: 'bg-text-secondary',
};

const PAYMENT_LABEL: Record<B2BPaymentStatus, string> = {
  pendente: 'Pendente',
  parcial: 'Parcial',
  pago: 'Pago',
};

const CLOSED_SOURCE_LABEL: Record<string, string> = {
  override: 'definida manualmente',
  stage: 'derivada da conclusão das etapas',
  status: 'derivada do momento em que virou encerrada',
};

const MUTED = 'text-text-secondary';

/** Valor principal com linha secundária opcional. */
function Cell({
  value,
  sub,
  valueClass = 'text-text-primary',
  subClass = MUTED,
  title,
}: {
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueClass?: string;
  subClass?: string;
  title?: string;
}) {
  return (
    <div title={title}>
      <span className={`text-sm tabular-nums ${valueClass}`}>{value}</span>
      {sub !== undefined && sub !== null && (
        <span className={`block text-[10px] leading-tight ${subClass}`}>{sub}</span>
      )}
    </div>
  );
}

export default function B2BRow({ row, columns, selected, onOpen }: Props) {
  const risk = useMemo(() => assessRisk(row), [row]);

  const finalizada = row.financeStatus === 'finalizada';
  const exposta = isRevenueExposed(row);
  const diasAberta = daysOpenWithoutClosing(row);
  const prazoQuitado = pendingToRelease(row) === 0;

  const tint = exposta
    ? 'bg-red-500/[0.07] hover:bg-red-500/[0.12]'
    : finalizada
      ? 'bg-emerald-500/[0.06] hover:bg-emerald-500/10'
      : 'bg-amber-500/[0.05] hover:bg-amber-500/10';
  const edge = exposta
    ? 'border-l-red-500'
    : finalizada
      ? 'border-l-emerald-500/60'
      : 'border-l-amber-500/60';
  const stickyTint = exposta
    ? 'bg-red-500/[0.07]'
    : finalizada
      ? 'bg-emerald-500/[0.06]'
      : 'bg-amber-500/[0.05]';

  const deadlineClass =
    row.daysToCreatorDeadline === null || prazoQuitado
      ? MUTED
      : row.daysToCreatorDeadline < 0
        ? 'text-red-400 font-medium'
        : row.daysToCreatorDeadline <= 15
          ? 'text-amber-400'
          : 'text-text-primary';

  const vencidoEmpresa =
    row.companyOutstanding > 0 &&
    row.daysToAgreedDue !== null &&
    row.daysToAgreedDue < 0;

  const paymentClass =
    row.companyPaymentStatus === 'pago'
      ? 'text-emerald-400'
      : vencidoEmpresa
        ? 'text-red-400'
        : row.companyPaymentStatus === 'parcial'
          ? 'text-amber-400'
          : MUTED;

  const render = (key: RenderColumn['key']): React.ReactNode => {
    switch (key) {
      case 'campanha':
        return (
          <>
            <div className="flex items-start gap-1.5 flex-wrap">
              <span className="text-sm text-text-primary font-medium leading-tight">
                {row.title}
              </span>
              {TYPE_BADGE[row.campaignType]}
            </div>
            {exposta && (
              <span className="block mt-0.5 text-[10px] font-medium text-red-400">
                ⚠ saldo gerado, empresa não pagou
              </span>
            )}
          </>
        );

      case 'statusCampanha':
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-text-primary whitespace-nowrap">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${CAMPAIGN_STATUS_DOT[row.campaignStatus]}`}
            />
            {CAMPAIGN_STATUS_LABEL[row.campaignStatus]}
          </span>
        );

      case 'empresa':
        return row.payingCompany ? (
          <span
            className="block text-sm text-text-primary truncate max-w-[130px]"
            title={row.payingCompany}
          >
            {row.payingCompany}
          </span>
        ) : (
          <Cell value="—" valueClass={MUTED} title="Empresa não preenchida" />
        );

      case 'valorAcordado':
        return row.agreedValue === null ? (
          <Cell value="—" valueClass={MUTED} />
        ) : (
          <Cell value={formatBRL(row.agreedValue)} />
        );

      case 'prazoPagamento':
        return (
          <Cell
            value={formatBRDate(row.agreedPaymentDueDate)}
            valueClass={vencidoEmpresa ? 'text-red-400' : MUTED}
            sub={vencidoEmpresa ? `vencido há ${Math.abs(row.daysToAgreedDue!)}d` : undefined}
            subClass="text-red-400"
          />
        );

      case 'estimativaPagamento':
        return <Cell value={formatBRDate(row.companyPaymentEstimate)} valueClass={MUTED} />;

      case 'statusPagamento':
        return (
          <Cell
            value={PAYMENT_LABEL[row.companyPaymentStatus]}
            valueClass={`${paymentClass} font-medium`}
            sub={row.companyPaymentMismatch ? '⚠ não bate com o valor' : undefined}
            subClass="text-amber-400"
          />
        );

      case 'valorPago':
        return (
          <Cell
            value={formatBRL(row.companyPaidValue)}
            valueClass={row.companyPaidValue > 0 ? 'text-emerald-400' : MUTED}
            sub={row.companyPaidPct !== null ? `${row.companyPaidPct.toFixed(0)}%` : undefined}
          />
        );

      case 'aReceber':
        return row.companyOutstanding > 0 ? (
          <Cell
            value={formatBRL(row.companyOutstanding)}
            valueClass={exposta ? 'text-red-400 font-medium' : 'text-amber-400'}
            sub={exposta ? 'já saiu do caixa' : undefined}
            subClass="text-red-400"
          />
        ) : (
          <Cell value="—" valueClass={MUTED} />
        );

      case 'contratados':
        return row.contractedCreators === null ? (
          <Cell value="—" valueClass={MUTED} />
        ) : (
          <Cell value={row.contractedCreators} />
        );

      case 'aptos':
        return (
          <Cell
            value={row.eligibleParticipants}
            valueClass="text-text-primary font-medium"
            sub={
              row.creatorsGap !== null && row.creatorsGap !== 0
                ? row.creatorsGap > 0
                  ? `−${row.creatorsGap}`
                  : `+${Math.abs(row.creatorsGap)}`
                : undefined
            }
            subClass={(row.creatorsGap ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}
            title={
              row.creatorsGap !== null && row.creatorsGap !== 0
                ? row.creatorsGap > 0
                  ? `Faltam ${row.creatorsGap} creator(es) para o contratado`
                  : `${Math.abs(row.creatorsGap)} creator(es) acima do contratado`
                : undefined
            }
          />
        );

      case 'cache':
        return row.hasCache ? (
          <Cell value={formatBRL(row.cache)} valueClass={MUTED} />
        ) : (
          <Cell value="—" valueClass={MUTED} title="Campanha sem cachê (permuta/comissão)" />
        );

      case 'totalCreators':
        return <Cell value={formatBRL(row.totalDueCreators)} />;

      case 'aGerar':
        return row.pendingToGenerate > 0 ? (
          <Cell
            value={formatBRL(row.pendingToGenerate)}
            valueClass="text-red-400 font-medium"
            sub={`${row.eligibleParticipants} aptos sem saldo`}
            subClass="text-red-400/80"
          />
        ) : (
          <Cell value="—" valueClass={MUTED} />
        );

      case 'carteiraPago':
        return (
          <div className="text-[11px] leading-tight whitespace-nowrap">
            <span className="block text-amber-400">
              {formatBRL(row.walletTotal)} <span className={MUTED}>carteira</span>
            </span>
            <span className="block text-emerald-400">
              {formatBRL(row.paidTotal)} <span className={MUTED}>pago</span>
            </span>
            {row.processingTotal > 0 && (
              <span className={`block ${MUTED}`}>
                {formatBRL(row.processingTotal)} processando
              </span>
            )}
          </div>
        );

      case 'abertura':
        return (
          <Cell
            value={formatBRDate(row.openedOn)}
            valueClass={MUTED}
            sub={
              diasAberta !== null && diasAberta > CAMPAIGN_STALE_DAYS
                ? `aberta há ${diasAberta}d`
                : undefined
            }
            subClass={diasAberta !== null && diasAberta > 90 ? 'text-red-400' : 'text-amber-400'}
          />
        );

      case 'encerramento':
        return (
          <Cell
            value={formatBRDate(row.closedOn)}
            valueClass={row.closedOn ? 'text-text-primary' : MUTED}
            sub={row.closedAtOverride ? 'manual' : row.closedOn ? 'auto' : 'não encerrada'}
            title={row.closedSource ? CLOSED_SOURCE_LABEL[row.closedSource] : undefined}
          />
        );

      case 'prazoCreators':
        return (
          <Cell
            value={formatBRDate(row.creatorPaymentDeadline)}
            valueClass={deadlineClass}
            sub={
              row.daysToCreatorDeadline === null
                ? undefined
                : prazoQuitado
                  ? 'cachê liberado'
                  : row.daysToCreatorDeadline < 0
                    ? `vencido há ${Math.abs(row.daysToCreatorDeadline)}d`
                    : `em ${row.daysToCreatorDeadline}d`
            }
            subClass={
              prazoQuitado
                ? 'text-emerald-400/80'
                : row.daysToCreatorDeadline !== null && row.daysToCreatorDeadline < 0
                  ? 'text-red-400'
                  : MUTED
            }
          />
        );

      case 'imposto':
        return (
          <Cell
            value={`${row.taxRate.toFixed(row.taxRate % 1 === 0 ? 0 : 2)}%`}
            valueClass={row.taxRate > 0 ? 'text-text-primary' : MUTED}
          />
        );

      case 'margem':
        return row.marginValue === null ? (
          <Cell value="—" valueClass={MUTED} />
        ) : (
          <Cell
            value={formatBRL(row.marginValue)}
            valueClass={`font-medium ${row.marginValue < 0 ? 'text-red-400' : 'text-emerald-400'}`}
            sub={row.marginPct === null ? undefined : `${row.marginPct.toFixed(1)}%`}
          />
        );

      case 'statusFinanceiro':
        return (
          <span className="whitespace-nowrap">
            <Badge variant={finalizada ? 'success' : 'warning'}>
              {finalizada ? 'Finalizada' : 'Em Aberto'}
            </Badge>
          </span>
        );

      case 'risco':
        return <RiskThermometer risk={risk} />;

      default:
        return null;
    }
  };

  return (
    <tr
      onClick={() => onOpen(row.campaignId)}
      className={`border-b border-b-border/40 border-l-2 ${edge} ${tint} ${
        selected ? 'ring-1 ring-inset ring-popline-pink/50' : ''
      } cursor-pointer transition-colors`}
      title="Clique para abrir e editar"
    >
      {columns.map((col, i) => (
        <td
          key={col.key}
          className={`px-2 py-2 align-top ${
            col.align === 'center'
              ? 'text-center'
              : col.align === 'right'
                ? 'text-right'
                : 'text-left'
          } ${
            i === 0
              ? 'sticky left-0 z-10 bg-surface min-w-[180px] max-w-[210px] after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border'
              : ''
          }`}
        >
          {i === 0 && <div className={`absolute inset-0 pointer-events-none ${stickyTint}`} />}
          <div className={i === 0 ? 'relative' : undefined}>{render(col.key)}</div>
        </td>
      ))}
    </tr>
  );
}
