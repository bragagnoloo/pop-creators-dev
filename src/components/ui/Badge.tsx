import { ReactNode } from 'react';

export type BadgeVariant =
  | 'success' | 'warning' | 'danger' | 'default' | 'pink' | 'purple' | 'orange';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

// Anotado como Record de propósito: sem isso, acrescentar um valor ao union sem
// a chave correspondente passa no tsc e vira `className="... border undefined"`.
const variants: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  pink: 'bg-popline-pink/20 text-popline-light border-popline-pink/30',
  purple: 'bg-popline-purple/20 text-popline-purple-light border-popline-purple/40',
  orange: 'bg-popline-orange/20 text-popline-orange-light border-popline-orange/40',
};

export default function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
}
