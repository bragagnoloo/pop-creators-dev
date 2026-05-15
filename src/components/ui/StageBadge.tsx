import type { StageTemporalStatus } from '@/types';

interface StageBadgeProps {
  status: StageTemporalStatus;
  className?: string;
}

const variants: Record<StageTemporalStatus, { label: string; classes: string; icon: string }> = {
  on_track: {
    label: 'Dentro do prazo',
    classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: '●',
  },
  overdue: {
    label: 'Atrasada',
    classes: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: '!',
  },
  extended: {
    label: 'Prazo estendido',
    classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: '↻',
  },
  done: {
    label: 'Concluída',
    classes: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50',
    icon: '✓',
  },
};

export default function StageBadge({ status, className = '' }: StageBadgeProps) {
  const v = variants[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${v.classes} ${className}`}
    >
      <span aria-hidden className="font-bold">{v.icon}</span>
      <span>{v.label}</span>
    </span>
  );
}
