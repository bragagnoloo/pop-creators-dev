'use client';

import { B2B_ALERTS, type B2BAlertKey } from '@/lib/b2b-alerts';
import type { B2BFinanceRow } from '@/types';
import { countAlerts } from '@/lib/b2b-alerts';

interface Props {
  rows: B2BFinanceRow[];
  active: B2BAlertKey | null;
  onToggle: (key: B2BAlertKey | null) => void;
}

/**
 * Barra de triagem: transforma "varrer 26 linhas atrás de problema" em um
 * clique. Só mostra alertas com contagem > 0 — barra vazia significa que não
 * há nada pendente, o que já é a informação.
 */
export default function B2BTriageBar({ rows, active, onToggle }: Props) {
  const counts = countAlerts(rows);
  const ativos = B2B_ALERTS.filter(a => counts[a.key] > 0);

  if (ativos.length === 0) {
    return (
      <div className="flex items-center gap-2 mb-4 text-sm text-emerald-400">
        <span>✓</span>
        <span>Nenhuma campanha precisa de ação no momento.</span>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <p className="text-xs text-text-secondary mb-2">Precisa de ação</p>
      <div className="flex flex-wrap gap-2">
        {ativos.map(alert => {
          const on = active === alert.key;
          const tone =
            alert.tone === 'danger'
              ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
              : 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10';
          const onTone =
            alert.tone === 'danger'
              ? 'bg-red-500/20 border-red-500 text-red-300'
              : 'bg-amber-500/20 border-amber-500 text-amber-300';

          return (
            <button
              key={alert.key}
              type="button"
              onClick={() => onToggle(on ? null : alert.key)}
              title={alert.description}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                on ? onTone : tone
              }`}
            >
              <span className="font-bold">{counts[alert.key]}</span>
              {alert.label}
              {on && <span className="ml-0.5">✕</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
