import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatDate(date: string): string {
  if (!date) return 'TBD';
  // Dates without timezone are UTC (from our API). Append Z so
  // Intl.DateTimeFormat correctly converts to the user's local time.
  const utcDate = date.includes('Z') || date.includes('+') ? date : date + 'Z';
  const parsed = new Date(utcDate);
  if (isNaN(parsed.getTime())) return 'TBD';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function calculateDynamicPrice(
  remainingMatches: number,
  basePrice: number = 6.99
): number {
  if (remainingMatches >= 3) return basePrice;
  if (remainingMatches === 2) return 4.66;
  if (remainingMatches === 1) return 2.33;
  return basePrice;
}
