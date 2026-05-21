"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/fixture/search-bar";
import { FixtureCard } from "@/components/fixture/fixture-card";
import { PopularFixtures } from "@/components/fixture/popular-fixtures";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Goal, ListOrdered, Calendar, Loader2, MessageCircle, Lock } from "lucide-react";
import { DailyTabulationCard } from "@/components/fixture/daily-tabulation-card";

interface TodayFixture {
  id: number | string;
  home_team: string;
  away_team: string;
  league_name: string;
  scheduled_date: string;
  status: string;
  venue?: string | null;
  supabase_id?: number | null;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Today's fixtures
  const [todayFixtures, setTodayFixtures] = useState<TodayFixture[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);

  // Limit finished match results to 4 cards max
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  async function handleBuy() {
    setBuying(true);
    setBuyError(null);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout unavailable');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Something went wrong');
      setBuying(false);
    }
  }

  const displayFixtures = todayFixtures
    .slice()
    .sort((a, b) => {
      const order: Record<string, number> = { in_play: 0, scheduled: 1, finished: 2, postponed: 3, cancelled: 4 };
      return (order[a.status] ?? 99) - (order[b.status] ?? 99);
    })
    .reduce<TodayFixture[]>((acc, f) => {
      if (f.status === 'finished' && acc.filter(x => x.status === 'finished').length >= 4) return acc;
      acc.push(f);
      return acc;
    }, []);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/fixtures?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.fixtures || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load today's fixtures on mount, then poll every 30s for live updates
  useEffect(() => {
    const loadToday = async () => {
      try {
        const res = await fetch("/api/fixtures/today");
        if (res.ok) {
          const data = await res.json();
          setTodayFixtures(data.fixtures || []);
        }
      } catch {
        // silently fail — today's fixtures are nice-to-have
      } finally {
        setTodayLoading(false);
      }
    };
    loadToday();
    const interval = setInterval(loadToday, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialQuery) handleSearch(initialQuery);
  }, [initialQuery, handleSearch]);

  const hasActiveSearch = query && query.trim().length > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Browse Fixtures</h1>
        <p className="text-sm text-gray-600">
          Search by team or league, or browse today's matches below
        </p>
      </div>

      <div className="mb-8">
        <SearchBar onSearch={handleSearch} loading={loading} />
      </div>

      {/* Telegram bridge CTA */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <Button size="lg" variant="emerald" onClick={handleBuy} disabled={buying}>
          {buying ? 'Opening Stripe...' : (
            <>
              Chairman's Picks on Telegram
              <MessageCircle className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
        <div className="flex items-center gap-2 text-xs text-gray-900">
          <Lock className="h-3 w-3 text-gray-600" />
          <span>$89 one-time &middot; Secure via Stripe</span>
        </div>
        {buyError && (
          <p className="w-full text-xs text-red-600">{buyError}</p>
        )}
      </div>

      {/* Today's Matches — shown prominently when no search is active */}
      {!hasActiveSearch && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-[#0052FF]" />
            <h2 className="text-lg font-semibold text-gray-900">Today's Matches</h2>
            <Badge variant="info" className="text-[10px]">
              LIVE
            </Badge>
          </div>

          {todayLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-900 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : displayFixtures.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {displayFixtures.map((fixture, i) => (
                <FixtureCard key={fixture.id} fixture={fixture} index={i} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-10 text-center">
                <CalendarDays className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-[oklch(0.22_0.025_260)] mb-1">
                  No matches today
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Off-season quiet day. Try searching for a team or league to find
                  upcoming fixtures.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Popular Fixtures — shown below today's matches */}
          {!todayLoading && <PopularFixtures />}

          {/* Daily Tabulation — chairman's verified picks */}
          <div className="mt-6">
            <DailyTabulationCard />
          </div>
        </div>
      )}

      {/* Search Results */}
      {error && (
        <Card className="border-red-800 bg-red-900/20 mb-6">
          <CardContent className="p-4">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-900 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && results.length > 0 && hasActiveSearch && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {results.map((fixture, i) => (
              <FixtureCard key={fixture.id} fixture={fixture} index={i} />
            ))}
          </div>
        </>
      )}

      {!loading && !error && results.length === 0 && hasActiveSearch && (
        <Card>
          <CardContent className="p-12 text-center">
            <Goal className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[oklch(0.22_0.025_260)] mb-2">No fixtures found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Try searching for a different team or league. The AI search agent
              discovers fixtures from across the web.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-800 rounded w-1/3" />
            <div className="h-14 bg-gray-800 rounded-xl" />
            <div className="h-28 bg-gray-800 rounded-xl" />
            <div className="h-28 bg-gray-800 rounded-xl" />
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
