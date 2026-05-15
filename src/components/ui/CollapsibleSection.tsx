'use client';

import { useState, type ReactNode } from 'react';
import Card from './Card';

interface Props {
  title: ReactNode;
  description?: ReactNode;
  defaultOpen?: boolean;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  rightSlot,
  children,
  className = '',
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={`!p-0 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-text-primary truncate">{title}</div>
          {description && (
            <p className="text-xs text-text-secondary mt-0.5 truncate">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {rightSlot}
          <svg
            className={`w-5 h-5 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-1 border-t border-border">
            {children}
          </div>
        </div>
      </div>
    </Card>
  );
}
