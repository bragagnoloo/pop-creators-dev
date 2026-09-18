export interface HorizontalBarRow {
  label: string;
  /** Campanhas com inscrições abertas — segmento rosa. */
  active: number;
  /** Campanhas finalizadas (e demais status não abertos) — segmento cinza. */
  finished: number;
}

interface HorizontalBarChartProps {
  data: HorizontalBarRow[];
  activeLabel?: string;
  finishedLabel?: string;
  emptyMessage?: string;
}

const ACTIVE_COLOR = '#ec4899';
const FINISHED_COLOR = '#6b7280';

/**
 * Barras horizontais empilhadas, uma por linha.
 *
 * Horizontal (e não o BarChart vertical já existente) porque os rótulos são
 * nomes de pessoas: na vertical eles ficariam truncados a 10px embaixo de cada
 * barra. A largura de cada barra é proporcional ao maior total, não ao total de
 * cada linha, para as linhas serem comparáveis entre si.
 */
export default function HorizontalBarChart({
  data,
  activeLabel = 'Abertas',
  finishedLabel = 'Finalizadas',
  emptyMessage = 'Sem dados.',
}: HorizontalBarChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary text-center py-8">{emptyMessage}</p>;
  }

  const max = Math.max(1, ...data.map(d => d.active + d.finished));

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ACTIVE_COLOR }} />
          {activeLabel}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: FINISHED_COLOR }} />
          {finishedLabel}
        </span>
      </div>

      <div className="space-y-2.5">
        {data.map(row => {
          const total = row.active + row.finished;
          return (
            <div key={row.label} className="flex items-center gap-3">
              <span
                className="text-xs text-text-secondary w-28 shrink-0 truncate text-right"
                title={row.label}
              >
                {row.label}
              </span>

              <div className="flex-1 min-w-0 h-5 rounded-md bg-background overflow-hidden flex">
                {row.active > 0 && (
                  <div
                    className="h-full"
                    style={{ width: `${(row.active / max) * 100}%`, background: ACTIVE_COLOR }}
                    title={`${activeLabel}: ${row.active}`}
                  />
                )}
                {row.finished > 0 && (
                  <div
                    className="h-full"
                    style={{ width: `${(row.finished / max) * 100}%`, background: FINISHED_COLOR }}
                    title={`${finishedLabel}: ${row.finished}`}
                  />
                )}
              </div>

              <span className="text-xs font-medium w-6 shrink-0 text-right">{total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
