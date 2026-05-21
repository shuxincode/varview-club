'use client';

import { cn } from '@/lib/utils';

interface ConfidenceSliderProps {
  value: number;
  label?: string;
  showValue?: boolean;
  className?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export function ConfidenceSlider({
  value,
  label,
  showValue = true,
  className,
  color = 'blue',
}: ConfidenceSliderProps) {
  const percentage = Math.round(value * 100);

  const colorClasses = {
    blue: 'bg-[#0052FF]',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-sm text-gray-400">{label}</span>}
          {showValue && (
            <span className="text-sm font-mono font-medium text-[oklch(0.22_0.025_260)]">{percentage}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
