'use client';

export type StepState = 'done' | 'active' | 'pending' | 'blocked';

export interface StepperStep {
  label: string;
  description?: string;
  state: StepState;
}

interface StepperProps {
  steps: StepperStep[];
  orientation?: 'horizontal' | 'vertical';
  onStepClick?: (index: number) => void;
  className?: string;
}

const stateClasses: Record<StepState, { circle: string; label: string }> = {
  done: {
    circle: 'bg-emerald-500 border-emerald-500 text-white',
    label: 'text-emerald-400',
  },
  active: {
    circle: 'bg-popline-pink border-popline-pink text-white shadow-lg shadow-popline-pink/30',
    label: 'text-text-primary font-semibold',
  },
  pending: {
    circle: 'bg-surface border-border text-text-secondary',
    label: 'text-text-secondary',
  },
  blocked: {
    circle: 'bg-surface border-border text-text-secondary opacity-50',
    label: 'text-text-secondary opacity-50',
  },
};

/**
 * Stepper genérico — horizontal em desktop, vertical em mobile (sm:flex-row).
 * Use orientation="vertical" pra forçar vertical em todos os tamanhos.
 */
export default function Stepper({
  steps,
  orientation = 'horizontal',
  onStepClick,
  className = '',
}: StepperProps) {
  const isVertical = orientation === 'vertical';
  return (
    <ol
      className={`flex ${
        isVertical ? 'flex-col gap-2' : 'flex-col gap-2 sm:flex-row sm:items-start sm:gap-0'
      } ${className}`}
    >
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const cls = stateClasses[step.state];
        const isClickable = !!onStepClick && step.state !== 'blocked';
        return (
          <li
            key={i}
            className={`flex ${
              isVertical ? 'flex-row gap-3' : 'flex-row gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-2'
            } relative`}
          >
            <button
              type="button"
              onClick={isClickable ? () => onStepClick(i) : undefined}
              disabled={!isClickable}
              aria-current={step.state === 'active' ? 'step' : undefined}
              aria-label={`Etapa ${i + 1}: ${step.label}`}
              className={`relative z-10 h-9 w-9 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all flex-shrink-0 ${cls.circle} ${
                isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-popline-pink/50`}
            >
              {step.state === 'done' ? '✓' : i + 1}
            </button>
            <div className={`flex-1 ${isVertical ? 'pt-1' : 'pt-1 sm:text-center sm:pt-0'}`}>
              <div className={`text-sm font-medium ${cls.label}`}>{step.label}</div>
              {step.description && (
                <div className="text-xs text-text-secondary mt-0.5">{step.description}</div>
              )}
            </div>
            {!isLast && !isVertical && (
              <div
                className={`hidden sm:block absolute top-4 left-[calc(50%+18px)] right-[calc(-50%+18px)] h-0.5 ${
                  step.state === 'done' ? 'bg-emerald-500' : 'bg-border'
                }`}
                aria-hidden
              />
            )}
            {!isLast && isVertical && (
              <div
                className={`absolute left-[17px] top-9 w-0.5 h-[calc(100%-2rem)] ${
                  step.state === 'done' ? 'bg-emerald-500' : 'bg-border'
                }`}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
