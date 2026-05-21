'use client';

import { useEffect, useState } from 'react';

interface MatchTimeProps {
  date: string;
  dateOnly?: boolean;
  className?: string;
}

export function MatchTime({ date, dateOnly, className }: MatchTimeProps) {
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    // If the date has a timezone indicator use it verbatim; otherwise
    // normalise through the local timezone so we never accidentally
    // treat a local-time string (e.g. "2026-05-11T15:00:00") as UTC.
    const normalized = date.includes('Z') || date.includes('+')
      ? date
      : new Date(date).toISOString();
    const parsed = new Date(normalized);
    if (isNaN(parsed.getTime())) {
      setDisplay('TBD');
      return;
    }
    setDisplay(
      new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        ...(dateOnly ? {} : { hour: '2-digit' as const, minute: '2-digit' as const }),
      }).format(parsed),
    );
  }, [date, dateOnly]);

  if (!display) return <span className={className}>--</span>;
  return <span className={className}>{display}</span>;
}
