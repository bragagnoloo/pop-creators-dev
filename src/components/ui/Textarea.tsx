'use client';

import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm text-text-secondary font-medium">{label}</label>
        )}
        <textarea
          ref={ref}
          className={`w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-popline-pink focus:ring-1 focus:ring-popline-pink/30 transition-colors resize-none ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
