'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm text-text-secondary font-medium">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-popline-pink focus:ring-1 focus:ring-popline-pink/30 transition-colors ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
