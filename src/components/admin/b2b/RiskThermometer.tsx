'use client';

import type { B2BRiskAssessment } from '@/types';
import { riskBandLabel } from '@/lib/b2b-risk';

const FILL: Record<B2BRiskAssessment['band'], string> = {
  baixo: 'bg-emerald-500',
  atencao: 'bg-amber-500',
  alto: 'bg-orange-500',
  critico: 'bg-red-500 animate-pulse',
};

const TEXT: Record<B2BRiskAssessment['band'], string> = {
  baixo: 'text-emerald-400',
  atencao: 'text-amber-400',
  alto: 'text-orange-400',
  critico: 'text-red-400',
};

export default function RiskThermometer({ risk }: { risk: B2BRiskAssessment }) {
  return (
    <div className="flex items-center gap-2" title={risk.reasons.join(' · ')}>
      <div className="w-14 h-1.5 rounded-full bg-border overflow-hidden shrink-0">
        <div
          className={`h-full rounded-full ${FILL[risk.band]}`}
          style={{ width: `${Math.max(risk.score, 3)}%` }}
        />
      </div>
      <span className={`text-xs font-medium whitespace-nowrap ${TEXT[risk.band]}`}>
        {riskBandLabel(risk.band)}
      </span>
    </div>
  );
}
