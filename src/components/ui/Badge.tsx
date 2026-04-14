import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'default' | 'pink';
  children: ReactNode;
}

const variants = {
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  pink: 'bg-popline-pink/20 text-popline-light border-popline-pink/30',
};

export default function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
}
