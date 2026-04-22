'use client';

import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  closable?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, closable = true }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closable || !onClose) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, closable, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closable ? onClose : undefined}
      />
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
        {(title || closable) && (
          <div className="flex items-start justify-between p-4 sm:p-6 pb-0 gap-3">
            {title && (
              <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-text-primary pt-1">
                {title}
              </h2>
            )}
            {closable && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="text-text-secondary hover:text-text-primary transition-colors text-2xl leading-none cursor-pointer inline-flex items-center justify-center min-h-11 min-w-11 -mr-2 -mt-1 rounded-lg hover:bg-white/5"
              >
                &times;
              </button>
            )}
          </div>
        )}
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
