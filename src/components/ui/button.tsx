'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'emerald';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'btn-3d font-semibold tracking-tight',
          {
            'btn-3d-primary': variant === 'primary',
            'btn-3d-emerald': variant === 'emerald',
            'btn-3d-outline': variant === 'outline',
            'bg-[oklch(0.92_0.01_75)] text-[oklch(0.32_0.022_70)] hover:bg-[oklch(0.88_0.012_75)] shadow-[0_2px_0_oklch(0.85_0.012_75)] hover:-translate-y-0.5 active:translate-y-0.5 border-none':
              variant === 'secondary',
            'bg-transparent text-[oklch(0.42_0.02_70)] hover:text-[oklch(0.22_0.025_260)] hover:bg-[oklch(0.92_0.01_75)] shadow-none border-none':
              variant === 'ghost',
            'btn-3d-outline border-red-400 text-red-500 hover:border-red-500 hover:text-red-600 shadow-[0_2px_0_oklch(0.7_0.1_25)]':
              variant === 'danger',
          },
          {
            'text-xs px-3 py-1.5 h-8': size === 'sm',
            'text-sm px-5 py-2.5 h-11': size === 'md',
            'text-base px-7 py-3.5 h-13': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
