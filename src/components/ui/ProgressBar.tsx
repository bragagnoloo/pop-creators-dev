interface ProgressStep {
  label: string;
  done: boolean;
}

interface ProgressBarProps {
  steps: ProgressStep[];
  className?: string;
}

/**
 * Barra de progresso visual com bolinhas + linhas conectoras.
 * Layout em grid: cada step ocupa uma coluna igual, com a bolinha centralizada
 * e o label embaixo. As linhas conectoras são desenhadas no fundo, atrás das
 * bolinhas, entre cada par adjacente.
 */
export default function ProgressBar({ steps, className = '' }: ProgressBarProps) {
  if (steps.length === 0) return null;
  const doneCount = steps.filter(s => s.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <div
      className={`w-full ${className}`}
      role="group"
      aria-label={`Progresso: ${percent}%`}
      style={{ ['--cols' as string]: steps.length }}
    >
      <div className="relative">
        {/* Linhas conectoras no fundo (entre as bolinhas) */}
        <div className="absolute top-3.5 left-0 right-0 flex items-center -translate-y-1/2 pointer-events-none" aria-hidden>
          <div className="flex w-full">
            {/* Espaço à esquerda da primeira bolinha (1/(2N) da largura) */}
            <div style={{ flex: `0 0 ${50 / steps.length}%` }} />
            {steps.slice(0, -1).map((step, i) => {
              const filled = step.done || steps[i + 1].done;
              return (
                <div
                  key={i}
                  className={`h-0.5 transition-colors ${filled ? 'bg-emerald-500' : 'bg-border'}`}
                  style={{ flex: `0 0 ${100 / steps.length}%` }}
                />
              );
            })}
            <div style={{ flex: `0 0 ${50 / steps.length}%` }} />
          </div>
        </div>

        {/* Bolinhas + labels em grid (cada step = 1 coluna igual) */}
        <div
          className="grid relative"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  step.done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-surface border-border text-text-secondary'
                }`}
                aria-current={!step.done && i === doneCount ? 'step' : undefined}
              >
                {step.done ? '✓' : i + 1}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-medium text-center leading-tight ${
                  step.done ? 'text-emerald-400' : 'text-text-secondary'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
