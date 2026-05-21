'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Trophy,
  TrendingUp,
  BarChart3,
  CheckCircle,
  XCircle,
  Minus,
  ChevronDown,
  ChevronUp,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PillarResult {
  label: string;
  key: string;
  prediction: string;
  actual: string | null;
  correct: boolean | null;
}

interface PickResult {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  homeScore: number | null;
  awayScore: number | null;
  prediction: string;
  correct: boolean | null;
  status: 'pending' | 'correct' | 'incorrect';
  pillars: PillarResult[];
  missPercentage: number | null;
}

interface TabulationData {
  picks: PickResult[];
  totalPicks: number;
  correctPicks: number;
  pendingPicks: number;
  successRate: number; // average pillar accuracy % across finished picks
  date: string;
}

function PillarIcon({ correct }: { correct: boolean | null }) {
  if (correct === true) return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
  if (correct === false) return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-gray-300" />;
}

function MissGauge({ percentage }: { percentage: number | null }) {
  if (percentage === null) return null;
  const color =
    percentage <= 20
      ? 'bg-green-500'
      : percentage <= 40
        ? 'bg-yellow-500'
        : percentage <= 60
          ? 'bg-orange-500'
          : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden w-16">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${percentage}%` }} />
      </div>
      <span
        className={cn(
          'text-xs font-bold tabular-nums',
          percentage <= 20
            ? 'text-green-600'
            : percentage <= 40
              ? 'text-yellow-600'
              : percentage <= 60
                ? 'text-orange-600'
                : 'text-red-500',
        )}
      >
        {percentage}%
      </span>
    </div>
  );
}

function PickCard({ pick }: { pick: PickResult }) {
  const [expanded, setExpanded] = useState(false);

  const correctCount = pick.pillars.filter(p => p.correct === true).length;
  const wrongCount = pick.pillars.filter(p => p.correct === false).length;
  const pendingCount = pick.pillars.filter(p => p.correct === null).length;
  const totalEval = correctCount + wrongCount;

  return (
    <div
      className={cn(
        'rounded-lg border transition-all cursor-pointer',
        pick.status === 'correct' && 'bg-green-500/5 border-green-500/15',
        pick.status === 'incorrect' && 'bg-red-500/5 border-red-500/15',
        pick.status === 'pending' && 'bg-yellow-500/5 border-yellow-500/15',
        expanded && 'ring-1',
        expanded && pick.status === 'correct' && 'ring-green-500/30',
        expanded && pick.status === 'incorrect' && 'ring-red-500/30',
        expanded && pick.status === 'pending' && 'ring-yellow-500/30',
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main row */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {pick.status === 'correct' && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
          {pick.status === 'incorrect' && <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
          {pick.status === 'pending' && <BarChart3 className="h-4 w-4 text-yellow-500 shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[oklch(0.22_0.025_260)] truncate">
              {pick.homeTeam} vs {pick.awayTeam}
            </p>
            <p className="text-[10px] text-gray-500">
              {pick.leagueName}
              {pick.homeScore !== null && pick.awayScore !== null && (
                <> &middot; FT: {pick.homeScore}-{pick.awayScore}</>
              )}
              {pick.status === 'pending' && (
                <> &middot; <span className="text-yellow-600 font-medium">Awaiting result</span></>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* Pillar mini-icons (always visible) */}
          {pick.status !== 'pending' && (
            <div className="flex items-center gap-0.5 mr-1">
              {pick.pillars.map(p => (
                <span key={p.key} title={`${p.label}: ${p.prediction}`}>
                  <PillarIcon correct={p.correct} />
                </span>
              ))}
            </div>
          )}

          <Badge
            variant={pick.status === 'correct' ? 'success' : pick.status === 'incorrect' ? 'danger' : 'info'}
            className="text-[9px] px-1.5 py-0.5"
          >
            {pick.status === 'correct' ? 'CORRECT' : pick.status === 'incorrect' ? 'MISS' : 'PENDING'}
          </Badge>

          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded pillar breakdown */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 mt-1">
          {/* Miss rate gauge */}
          {pick.status !== 'pending' && pick.missPercentage !== null && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Miss Rate</span>
                {pick.missPercentage >= 60 && (
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                )}
              </div>
              <MissGauge percentage={pick.missPercentage} />
            </div>
          )}

          {/* Pillar details */}
          <div className="space-y-1">
            {pick.pillars.map(p => (
              <div
                key={p.key}
                className={cn(
                  'flex items-center justify-between rounded px-2 py-1.5 text-xs',
                  p.correct === true && 'bg-green-500/5',
                  p.correct === false && 'bg-red-500/5',
                  p.correct === null && 'bg-gray-50',
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <PillarIcon correct={p.correct} />
                  <span className="text-gray-700 truncate">{p.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {p.correct !== null ? (
                    <>
                      <span className="text-gray-500">
                        Pred: <strong>{p.prediction}</strong>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">
                        Actual: <strong>{p.actual}</strong>
                      </span>
                    </>
                  ) : p.correct === null && p.actual !== 'N/A' ? (
                    <span className="text-gray-400 italic">Pending result...</span>
                  ) : (
                    <span className="text-gray-400 italic">N/A</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {pick.status !== 'pending' && (
            <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
              <span>
                <span className="font-medium text-green-600">{correctCount}</span> correct
              </span>
              <span>·</span>
              <span>
                <span className="font-medium text-red-400">{wrongCount}</span> wrong
              </span>
              {pendingCount > 0 && (
                <>
                  <span>·</span>
                  <span>
                    <span className="font-medium text-yellow-500">{pendingCount}</span> pending
                  </span>
                </>
              )}
              <span>·</span>
              <span>
                <span className="font-medium">{totalEval}/{pick.pillars.length}</span> pillars evaluated
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DailyTabulationCard() {
  const [data, setData] = useState<TabulationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTabulation = async () => {
      try {
        const res = await fetch('/api/tabulation/daily');
        if (!res.ok) throw new Error('Failed to load tabulation');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchTabulation();
    // Poll every 30s so finished matches update the tabulation automatically
    const interval = setInterval(fetchTabulation, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="border-[#0052FF]/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  if (data.picks.length === 0) {
    return (
      <Card className="border-[#0052FF]/20 shadow-[0_0_20px_#0052FF/08] overflow-hidden">
        <div className="bg-gradient-to-r from-[#0052FF]/10 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#0052FF]/12 p-2 ring-1 ring-[#0052FF]/30">
              <Shield className="h-5 w-5 text-[#0052FF]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[oklch(0.22_0.025_260)]">
                Chairman&apos;s Daily Tabulation
              </h2>
              <p className="text-xs text-gray-500">
                {data.date} — No picks signed yet today
              </p>
            </div>
          </div>
        </div>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-gray-500">
            The Chairman hasn&apos;t signed off on today&apos;s picks yet. Check back once the daily fixtures are analysed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#0052FF]/20 shadow-[0_0_20px_#0052FF/08] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0052FF]/10 to-transparent px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#0052FF]/12 p-2 ring-1 ring-[#0052FF]/30">
              <Shield className="h-5 w-5 text-[#0052FF]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[oklch(0.22_0.025_260)]">
                Chairman&apos;s Daily Tabulation
              </h2>
              <p className="text-xs text-gray-500">
                {data.date} — Top {data.picks.length} Pick{data.picks.length !== 1 ? 's' : ''}
                &nbsp;&middot; Click to expand pillars
              </p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-5">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <BarChart3 className="h-4 w-4 text-[#0052FF] mx-auto mb-1" />
            <p className="text-lg font-bold text-[oklch(0.22_0.025_260)]">{data.totalPicks}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">{data.correctPicks}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Won</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <Target className="h-4 w-4 text-[#0052FF] mx-auto mb-1" />
            <p className={cn(
              'text-lg font-bold',
              data.successRate >= 60 ? 'text-green-500' : data.successRate >= 40 ? 'text-yellow-500' : 'text-red-400',
            )}>{data.successRate}%</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Accuracy</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <BarChart3 className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-yellow-600">{data.pendingPicks}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pending</p>
          </div>
        </div>

        {/* Picks list */}
        <div className="space-y-2">
          {data.picks.map((pick) => (
            <PickCard key={pick.fixtureId} pick={pick} />
          ))}
        </div>

        {/* Note */}
        <p className="text-[10px] text-gray-400 mt-3 text-center">
          Chairman-signed picks resolve post-match. Each of the 5 pillars is evaluated independently. Click a pick for full breakdown.
        </p>
      </CardContent>
    </Card>
  );
}
