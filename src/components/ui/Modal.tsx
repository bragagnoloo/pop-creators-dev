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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closable ? onClose : undefined}
      />
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {(title || closable) && (
          <div className="flex items-center justify-between p-6 pb-0">
            {title && <h2 className="text-xl font-bold text-text-primary">{title}</h2>}
            {closable && onClose && (
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-text-primary transition-colors text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
