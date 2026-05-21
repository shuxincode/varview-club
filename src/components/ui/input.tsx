'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[oklch(0.55_0.018_70)] mb-1.5">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl border bg-[oklch(0.97_0.006_75/0.6)] px-4 py-3 text-sm text-[oklch(0.22_0.025_260)] placeholder-[oklch(0.55_0.018_70)/0.5] transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.18_265/0.3)] focus:border-[oklch(0.45_0.18_265)]',
            error ? 'border-[oklch(0.5_0.18_30)]' : 'border-[oklch(0.85_0.012_75)] hover:border-[oklch(0.72_0.015_70)]',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-[oklch(0.5_0.18_30)]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
