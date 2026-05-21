'use client';

import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'premium';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider uppercase',
        {
          'bg-[oklch(0.92_0.01_75)] text-[oklch(0.42_0.02_70)]': variant === 'default',
          'bg-[oklch(0.9_0.08_160/0.3)] text-[oklch(0.45_0.18_160)] border border-[oklch(0.62_0.18_160/0.2)]':
            variant === 'success',
          'bg-[oklch(0.9_0.08_80/0.3)] text-[oklch(0.55_0.15_80)] border border-[oklch(0.55_0.15_80/0.2)]':
            variant === 'warning',
          'bg-[oklch(0.9_0.1_30/0.3)] text-[oklch(0.5_0.18_30)] border border-[oklch(0.5_0.18_30/0.2)]':
            variant === 'danger',
          'bg-[oklch(0.9_0.05_260/0.3)] text-[oklch(0.45_0.18_265)] border border-[oklch(0.45_0.18_265/0.2)]':
            variant === 'info',
          'bg-[oklch(0.9_0.08_160/0.2)] text-[oklch(0.5_0.18_160)] border border-[oklch(0.62_0.18_160/0.3)]':
            variant === 'premium',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
