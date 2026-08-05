import type { B2BFinanceRow } from '@/types';
import { isRevenueExposed } from '@/services/b2b-finance';
import { pendingToRelease, daysOpenWithoutClosing } from '@/lib/b2b-risk';

/**
 * Situações que exigem ação do admin.
 *
 * Cada alerta é uma pergunta prática ("o que eu preciso resolver hoje?"), não
 * um estado. Alimenta a barra de triagem no topo da aba: os contadores viram
 * chips clicáveis que filtram a tabela.
 */

export type B2BAlertKey =
  | 'receita_pendente'
  | 'sem_saldo_gerado'
  | 'prazo_creators'
  | 'pagamento_vencido'
  | 'aberta_demais';

export interface B2BAlertDef {
  key: B2BAlertKey;
  label: string;
  /** Explica o critério e por que importa. */
  description: string;
  tone: 'danger' | 'warning';
  matches: (row: B2BFinanceRow) => boolean;
}

export const B2B_ALERTS: B2BAlertDef[] = [
  {
    key: 'prazo_creators',
    label: 'prazo de creators vencido',
    description:
      'O prazo de 60 dias após o encerramento passou e ainda falta liberar cachê aos creators.',
    tone: 'danger',
    matches: r =>
      r.daysToCreatorDeadline !== null &&
      r.daysToCreatorDeadline < 0 &&
      pendingToRelease(r) > 0,
  },
  {
    key: 'sem_saldo_gerado',
    label: 'sem saldo gerado',
    description:
      'Campanha concluída e o cachê ainda não foi creditado na carteira dos creators.',
    tone: 'danger',
    matches: r => r.pendingToGenerate > 0,
  },
  {
    key: 'receita_pendente',
    label: 'receita pendente',
    description:
      'O cachê já saiu do caixa (crédito gerado) mas a empresa ainda não pagou o POPline.',
    tone: 'danger',
    matches: isRevenueExposed,
  },
  {
    key: 'pagamento_vencido',
    label: 'pagamento da empresa vencido',
    description: 'O prazo contratual de pagamento passou e ainda há valor a receber.',
    tone: 'warning',
    matches: r =>
      r.companyOutstanding > 0 &&
      r.daysToAgreedDue !== null &&
      r.daysToAgreedDue < 0,
  },
  {
    key: 'aberta_demais',
    label: 'aberta há +90 dias',
    description:
      'Campanha sem conclusão há muito mais tempo que a média histórica (12 a 43 dias).',
    tone: 'warning',
    matches: r => (daysOpenWithoutClosing(r) ?? 0) > 90,
  },
];

export function countAlerts(rows: B2BFinanceRow[]): Record<B2BAlertKey, number> {
  const counts = {} as Record<B2BAlertKey, number>;
  for (const alert of B2B_ALERTS) {
    counts[alert.key] = rows.filter(alert.matches).length;
  }
  return counts;
}

export function matchesAlert(row: B2BFinanceRow, key: B2BAlertKey): boolean {
  return B2B_ALERTS.find(a => a.key === key)?.matches(row) ?? true;
}

/** Todos os alertas ativos de uma linha — usado no painel de detalhe. */
export function rowAlerts(row: B2BFinanceRow): B2BAlertDef[] {
  return B2B_ALERTS.filter(a => a.matches(row));
}
