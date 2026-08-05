'use client';

import Card from '@/components/ui/Card';
import B2BRow from './B2BRow';
import type { B2BFinanceRow } from '@/types';

export type SortKey =
  | 'title'
  | 'campaignStatus'
  | 'payingCompany'
  | 'agreedValue'
  | 'companyPaidValue'
  | 'companyOutstanding'
  | 'contractedCreators'
  | 'eligibleParticipants'
  | 'openedOn'
  | 'closedOn'
  | 'creatorPaymentDeadline'
  | 'totalDueCreators'
  | 'pendingToGenerate'
  | 'taxRate'
  | 'marginValue'
  | 'risk';

export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

/**
 * Modos de visão.
 *
 * A tabela completa tem 21 colunas (~2400px): impossível ver receita e custo da
 * mesma campanha ao mesmo tempo. Cada modo mostra só o bloco relevante e cabe
 * na tela; "Tudo" continua disponível para a visão completa.
 */
export type ViewMode = 'receita' | 'custo' | 'resultado' | 'tudo';

export const VIEW_MODES: { key: ViewMode; label: string; description: string }[] = [
  {
    key: 'receita',
    label: 'Receita',
    description: 'O que as marcas devem ao POPline: valor acordado, prazos e pagamentos.',
  },
  {
    key: 'custo',
    label: 'Custo',
    description: 'O que o POPline deve aos creators: cachê, saldo gerado e prazos.',
  },
  {
    key: 'resultado',
    label: 'Resultado',
    description: 'Receita menos imposto e custo: a margem de cada campanha.',
  },
  { key: 'tudo', label: 'Tudo', description: 'Todas as colunas, com rolagem horizontal.' },
];

export type ColumnKey =
  | 'campanha'
  | 'statusCampanha'
  | 'empresa'
  | 'valorAcordado'
  | 'prazoPagamento'
  | 'estimativaPagamento'
  | 'statusPagamento'
  | 'valorPago'
  | 'aReceber'
  | 'contratados'
  | 'aptos'
  | 'cache'
  | 'totalCreators'
  | 'aGerar'
  | 'carteiraPago'
  | 'abertura'
  | 'encerramento'
  | 'prazoCreators'
  | 'imposto'
  | 'margem'
  | 'statusFinanceiro'
  | 'risco';

export interface RenderColumn {
  key: ColumnKey;
  align?: 'center' | 'right';
}

interface Column extends RenderColumn {
  label: string;
  sortKey?: SortKey;
  modes: ViewMode[];
}

const ALL: ViewMode[] = ['receita', 'custo', 'resultado', 'tudo'];

const COLUMNS: Column[] = [
  { key: 'campanha', label: 'Campanha', sortKey: 'title', modes: ALL },
  { key: 'statusCampanha', label: 'Status', sortKey: 'campaignStatus', modes: ALL },

  // --- Receita ---
  { key: 'empresa', label: 'Empresa', sortKey: 'payingCompany', modes: ['receita', 'resultado', 'tudo'] },
  { key: 'valorAcordado', label: 'Acordado', sortKey: 'agreedValue', align: 'right', modes: ['receita', 'resultado', 'tudo'] },
  { key: 'prazoPagamento', label: 'Prazo pagamento', modes: ['receita', 'tudo'] },
  { key: 'estimativaPagamento', label: 'Estimativa', modes: ['tudo'] },
  { key: 'statusPagamento', label: 'Pagamento', modes: ['receita', 'tudo'] },
  { key: 'valorPago', label: 'Valor pago', sortKey: 'companyPaidValue', align: 'right', modes: ['receita', 'tudo'] },
  { key: 'aReceber', label: 'A receber', sortKey: 'companyOutstanding', align: 'right', modes: ['receita', 'tudo'] },

  // --- Custo ---
  { key: 'contratados', label: 'Contratados', sortKey: 'contractedCreators', align: 'center', modes: ['custo', 'tudo'] },
  { key: 'aptos', label: 'Aptos', sortKey: 'eligibleParticipants', align: 'center', modes: ['custo', 'tudo'] },
  { key: 'cache', label: 'Cachê', align: 'right', modes: ['tudo'] },
  { key: 'totalCreators', label: 'Total creators', sortKey: 'totalDueCreators', align: 'right', modes: ['custo', 'resultado', 'tudo'] },
  { key: 'aGerar', label: 'A gerar', sortKey: 'pendingToGenerate', align: 'right', modes: ['custo', 'tudo'] },
  { key: 'carteiraPago', label: 'Carteira', modes: ['custo', 'tudo'] },
  { key: 'abertura', label: 'Abertura', sortKey: 'openedOn', modes: ['custo', 'tudo'] },
  { key: 'encerramento', label: 'Encerramento', sortKey: 'closedOn', modes: ['custo', 'tudo'] },
  { key: 'prazoCreators', label: 'Prazo creators', sortKey: 'creatorPaymentDeadline', modes: ['custo', 'tudo'] },

  // --- Resultado ---
  { key: 'imposto', label: 'Imposto', sortKey: 'taxRate', align: 'right', modes: ['resultado', 'tudo'] },
  { key: 'margem', label: 'Margem', sortKey: 'marginValue', align: 'right', modes: ['resultado', 'tudo'] },
  { key: 'statusFinanceiro', label: 'Financeiro', modes: ['receita', 'resultado', 'tudo'] },

  { key: 'risco', label: 'Risco', sortKey: 'risk', modes: ALL },
];

/** Só o modo "tudo" precisa rolar na horizontal. */
const MIN_WIDTH: Record<ViewMode, string> = {
  receita: 'min-w-[1050px]',
  custo: 'min-w-[1100px]',
  resultado: 'min-w-[900px]',
  tudo: 'min-w-[2400px]',
};

interface Props {
  rows: B2BFinanceRow[];
  mode: ViewMode;
  selectedId: string | null;
  sort: SortState;
  onSort: (key: SortKey) => void;
  onOpen: (campaignId: string) => void;
}

export default function B2BTable({ rows, mode, selectedId, sort, onSort, onOpen }: Props) {
  const columns = COLUMNS.filter(c => c.modes.includes(mode));

  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className={`${MIN_WIDTH[mode]} w-full`}>
          <thead>
            <tr className="border-b border-border">
              {columns.map((col, i) => {
                const sortable = Boolean(col.sortKey);
                const active = sort.key === col.sortKey;
                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortKey && onSort(col.sortKey)}
                    className={`px-2 py-3 text-xs font-medium whitespace-nowrap ${
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                          ? 'text-right'
                          : 'text-left'
                    } ${active ? 'text-text-primary' : 'text-text-secondary'} ${
                      sortable ? 'cursor-pointer hover:text-text-primary select-none' : ''
                    } ${
                      i === 0
                        ? 'sticky left-0 z-20 bg-surface after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border'
                        : ''
                    }`}
                  >
                    {col.label}
                    {active && (
                      <span className="ml-1 text-popline-pink">
                        {sort.dir === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <B2BRow
                key={row.campaignId}
                row={row}
                columns={columns}
                selected={selectedId === row.campaignId}
                onOpen={onOpen}
              />
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="px-6 py-10 text-center text-sm text-text-secondary">
          Nenhuma campanha encontrada com os filtros atuais.
        </p>
      )}
    </Card>
  );
}
