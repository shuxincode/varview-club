'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Zap,
  Shield,
  BarChart3,
} from 'lucide-react';
import type { LiveMatchState, LivePrediction } from '@/lib/live/live-state';
import type { Fixture } from '@/types';

interface LivePredictionPanelProps {
  fixtureId: number;
  initialFixture: Fixture;
}

export function LivePredictionPanel({ fixtureId, initialFixture }: LivePredictionPanelProps) {
  const [liveState, setLiveState] = useState<LiveMatchState | null>(null);
  const [prediction, setPrediction] = useState<LivePrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const fetchLiveData = useCallback(async () => {
    try {
      const [stateRes, predictRes] = await Promise.all([
        fetch(`/api/live/state?fixtureId=${fixtureId}`),
        fetch(`/api/live/predict?fixtureId=${fixtureId}`),
      ]);

      if (stateRes.ok) {
        const state = await stateRes.json();
        if (state.status === 'not_in_play') return;
        setLiveState(state);
        setStale(false);
      }

      if (predictRes.ok) {
        const pred = await predictRes.json();
        if (pred.status !== 'not_in_play') {
          setPrediction(pred);
        }
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Live data unavailable');
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  // Initial fetch + 30s polling
  useEffect(() => {
    if (initialFixture.status !== 'in_play') {
      setLoading(false);
      return;
    }

    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = async () => {
      await fetchLiveData();
      if (mounted) {
        interval = setInterval(fetchLiveData, 30_000);
      }
    };

    start();

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [fixtureId, initialFixture.status, fetchLiveData]);

  // Stale detection
  useEffect(() => {
    if (!liveState?.lastUpdated) return;
    const check = setInterval(() => {
      const elapsed = (Date.now() - new Date(liveState.lastUpdated).getTime()) / 1000;
      setStale(elapsed > 60);
    }, 10_000);
    return () => clearInterval(check);
  }, [liveState?.lastUpdated]);

  // Don't render anything if not live
  if (initialFixture.status !== 'in_play') return null;

  // Loading skeleton
  if (loading && !liveState && !prediction) {
    return (
      <Card className="mb-6 border-[#0052FF]/20">
        <CardContent className="p-5">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 bg-gray-700 rounded-full" />
              <div className="h-3 w-12 bg-gray-700 rounded-full" />
            </div>
            <div className="h-8 w-48 bg-gray-700 rounded" />
            <div className="h-4 w-full bg-gray-700 rounded" />
            <div className="h-4 w-3/4 bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = liveState || prediction;

  return (
    <Card
      className={cn(
        'mb-6 border-2 transition-all duration-300',
        stale
          ? 'border-yellow-500/30'
          : 'border-[#0052FF]/30 shadow-[0_0_20px_#0052FF/08]',
      )}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-500/15 p-2">
              <Activity className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[oklch(0.22_0.025_260)]">
                  Live Prediction
                </span>
                <Badge variant="info" className="text-[10px] uppercase tracking-wider">
                  {liveState?.minute ?? '?'}&apos;
                </Badge>
                {stale && (
                  <Badge variant="default" className="text-[10px] bg-yellow-500/20 text-yellow-400">
                    Stale
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {liveState
                  ? `Updated ${Math.round((Date.now() - new Date(liveState.lastUpdated).getTime()) / 1000)}s ago`
                  : 'Auto-refreshes every 30s'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchLiveData}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 mb-4 rounded-lg bg-red-500/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {hasData && (
          <>
            {/* Live Score Bar */}
            <div className="mb-4 rounded-xl bg-gradient-to-r from-[#0052FF]/05 via-transparent to-[#0052FF]/05 border border-[#0052FF]/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[oklch(0.22_0.025_260)]">
                  {liveState?.homeTeam ?? initialFixture.home_team}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-[oklch(0.22_0.025_260)]">
                    {liveState?.homeScore ?? 0}
                  </span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">vs</span>
                  <span className="text-2xl font-bold text-[oklch(0.22_0.025_260)]">
                    {liveState?.awayScore ?? 0}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[oklch(0.22_0.025_260)]">
                  {liveState?.awayTeam ?? initialFixture.away_team}
                </span>
              </div>
            </div>

            {/* Probability Bars */}
            {prediction && (
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Win Probability</span>
                  <span>Confidence: {Math.round(prediction.confidenceScore * 100)}%</span>
                </div>
                <div className="flex h-6 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0052FF] transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ width: `${Math.max(prediction.homeWinProbability * 100, 2)}%` }}
                  >
                    {Math.round(prediction.homeWinProbability * 100)}%
                  </div>
                  <div
                    className="bg-gray-600 transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ width: `${Math.max(prediction.drawProbability * 100, 2)}%` }}
                  >
                    {Math.round(prediction.drawProbability * 100)}%
                  </div>
                  <div
                    className="bg-gray-400 transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ width: `${Math.max(prediction.awayWinProbability * 100, 2)}%` }}
                  >
                    {Math.round(prediction.awayWinProbability * 100)}%
                  </div>
                </div>

                {/* Expected Final Score & Comeback */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BarChart3 className="h-3.5 w-3.5 text-[#0052FF]" />
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        Expected Final
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[oklch(0.22_0.025_260)]">
                      {prediction.expectedFinalGoals.home.toFixed(1)} - {prediction.expectedFinalGoals.away.toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        {prediction.currentScore.home < prediction.currentScore.away
                          ? `${initialFixture.home_team} Comeback`
                          : prediction.currentScore.away < prediction.currentScore.home
                          ? `${initialFixture.away_team} Comeback`
                          : 'Next Goal'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[oklch(0.22_0.025_260)]">
                      {prediction.homeComebackProb !== null
                        ? `${Math.round(prediction.homeComebackProb * 100)}%`
                        : prediction.awayComebackProb !== null
                        ? `${Math.round(prediction.awayComebackProb * 100)}%`
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Momentum */}
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-gray-500">Momentum</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div
                        className="h-2 rounded-full bg-[#0052FF] transition-all"
                        style={{ width: `${prediction.momentum.homeMomentum * 60}px` }}
                      />
                      <span className="text-[10px] font-medium text-[oklch(0.22_0.025_260)]">
                        {Math.round(prediction.momentum.homeMomentum * 100)}%
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">|</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-[oklch(0.22_0.025_260)]">
                        {Math.round(prediction.momentum.awayMomentum * 100)}%
                      </span>
                      <div
                        className="h-2 rounded-full bg-gray-400 transition-all"
                        style={{ width: `${prediction.momentum.awayMomentum * 60}px` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Live xG */}
                {liveState?.liveXg && (
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-xs text-gray-500">Live xG</span>
                    </div>
                    <span className="text-xs font-semibold text-[oklch(0.22_0.025_260)]">
                      {liveState.liveXg.home.toFixed(2)} - {liveState.liveXg.away.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Chairman Reasoning */}
                {prediction.chairmanReasoning && (
                  <div className="rounded-xl border border-[#0052FF]/15 bg-gradient-to-br from-[#0052FF]/05 to-transparent p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-[#0052FF]" />
                      <span className="text-[10px] font-bold text-[oklch(0.42_0.02_70)] uppercase tracking-wider">
                        Chairman&apos;s Live Verdict
                      </span>
                    </div>
                    <p className="text-sm text-[oklch(0.32_0.022_70)] leading-relaxed font-medium">
                      {prediction.chairmanReasoning}
                    </p>
                  </div>
                )}

                {/* Top Exact Scores */}
                {prediction.exactScoreProbs.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Most Likely Final Scores
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {prediction.exactScoreProbs.slice(0, 5).map((score, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-mono font-medium text-[oklch(0.22_0.025_260)]"
                        >
                          {score.home}-{score.away} ({Math.round(score.probability * 100)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No prediction fallback */}
            {!prediction && !loading && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">Waiting for live prediction data...</p>
              </div>
            )}
          </>
        )}

        {/* Sources */}
        {liveState && (
          <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
            <span className="text-[10px] text-gray-400">Sources:</span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded',
              liveState.sources.flashscore ? 'bg-green-500/10 text-green-600' : 'bg-gray-100 text-gray-400'
            )}>
              Flashscore
            </span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded',
              liveState.sources.fotmob ? 'bg-green-500/10 text-green-600' : 'bg-gray-100 text-gray-400'
            )}>
              FotMob
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
