'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Button from './Button';
import { ROUTES } from '@/lib/constants';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  description?: string;
}

const defaultFeatures = [
  'Candidatar-se a campanhas',
  'Assistir todas as aulas',
  'Gerar roteiros com IA',
  'Modificador de chance em campanhas',
];

export default function Paywall({ isOpen, onClose, feature, description }: PaywallProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-popline-pink/30 rounded-3xl w-full max-w-md shadow-2xl shadow-popline-pink/10 overflow-hidden">
        {/* Header with gradient */}
        <div className="relative gradient-bg p-6 text-center">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center leading-none text-xl"
          >
            ×
          </button>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Recurso exclusivo para assinantes</h2>
          <p className="text-sm text-white/90 mt-1">
            {description || `${feature} faz parte dos planos pagos.`}
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold mb-2">Com um plano você desbloqueia:</p>
            <ul className="space-y-2">
              {defaultFeatures.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border text-sm">
            <p className="text-text-secondary">A partir de</p>
            <p className="text-lg font-bold">
              R$ 29,90<span className="text-sm text-text-secondary font-normal">/mês</span>
            </p>
            <p className="text-xs text-text-secondary">no plano anual</p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Agora não
            </Button>
            <Link href={ROUTES.PLANOS} className="flex-1">
              <Button className="w-full" onClick={onClose}>
                Ver planos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
