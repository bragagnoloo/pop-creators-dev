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
 * Pronta para 3 etapas (criador) ou N etapas (até ~8). Em mobile permanece
 * horizontal — labels ficam acima/abaixo curtos.
 */
export default function ProgressBar({ steps, className = '' }: ProgressBarProps) {
  if (steps.length === 0) return null;
  const doneCount = steps.filter(s => s.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <div className={`w-full ${className}`} role="group" aria-label={`Progresso: ${percent}%`}>
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isFirst = i === 0;
          const isLast = i === steps.length - 1;
          // linha à esquerda fica preenchida se a etapa atual está done OU se a anterior está done
          const leftFilled = !isFirst && (steps[i - 1].done || step.done);
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              {!isFirst && (
                <div
                  className={`h-0.5 flex-1 transition-colors ${
                    leftFilled ? 'bg-emerald-500' : 'bg-border'
                  }`}
                  aria-hidden
                />
              )}
              <div className="relative flex flex-col items-center">
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
                  className={`absolute top-9 whitespace-nowrap text-[10px] sm:text-xs font-medium ${
                    step.done ? 'text-emerald-400' : 'text-text-secondary'
                  } ${isFirst ? 'left-0' : isLast ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Spacer para acomodar labels absolutos */}
      <div className="h-7" aria-hidden />
    </div>
  );
}
