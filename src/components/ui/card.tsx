'use client';

import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glassy' | 'premium';
}

export function Card({ className, variant = 'premium', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-350',
        variant === 'premium' &&
          'bg-[oklch(0.97_0.006_75/0.8)] border border-[oklch(0.85_0.012_75/0.5)] hover:border-[oklch(0.45_0.18_265/0.2)] hover:shadow-[0_4px_12px_oklch(0.25_0.025_75/0.1)] hover:-translate-y-0.5',
        variant === 'default' &&
          'bg-[oklch(0.97_0.006_75/0.8)] border border-[oklch(0.85_0.012_75/0.5)]',
        variant === 'glassy' &&
          'bg-[oklch(0.97_0.006_75/0.6)] backdrop-blur-xl border border-[oklch(0.85_0.012_75/0.4)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-5 border-b border-[oklch(0.85_0.012_75/0.5)]', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-5', className)} {...props}>
      {children}
    </div>
  );
}
