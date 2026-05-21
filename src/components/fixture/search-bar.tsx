'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useState, useCallback } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) onSearch(query.trim());
    },
    [query, onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[oklch(0.72_0.015_70)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search teams, leagues, or fixtures..."
          className="w-full h-14 pl-12 pr-36 bg-[oklch(0.97_0.006_75/0.7)] border border-[oklch(0.85_0.012_75)] rounded-xl text-[oklch(0.22_0.025_260)] placeholder-[oklch(0.72_0.015_70)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.18_265/0.3)] focus:border-[oklch(0.45_0.18_265)] transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
          <Button type="submit" size="sm" disabled={loading || !query.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>
    </form>
  );
}
