'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, XCircle, TrendingUp, Sigma, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chairmanGoalsBand, type GoalsBandInput, type GoalsBandPrediction } from '@/lib/agents';

interface ChairmanGoalsBandCardProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
  /** Optional pre-computed prediction; if omitted the component generates one from fixture data */
  prediction?: GoalsBandPrediction;
  /** If true, shows the component in a "generating" preview state */
  loading?: boolean;
}

function generatePreviewPrediction(home: string, away: string, league: string): GoalsBandPrediction {
  const input: GoalsBandInput = {
    homeTeam: home,
    awayTeam: away,
    league,
    xgHome: 1.35,
    xgAway: 1.1,
    xgSource: 'estimated',
    h2hTotalGoals: [3, 2, 1, 4, 2, 3],
    leagueAvgGoals: 2.65,
    homeCleanSheetStreak: 1,
    awayCleanSheetStreak: 2,
    homeRestDays: 5,
    awayRestDays: 6,
    homeMissingKeyPlayers: 0,
    awayMissingKeyPlayers: 1,
    refereeAvgCards: 3.2,
    weather: 'clear',
    isEliminationMatch: false,
  };
  return chairmanGoalsBand(input);
}

export function ChairmanGoalsBandCard({
  homeTeam,
  awayTeam,
  league,
  prediction,
  loading,
}: ChairmanGoalsBandCardProps) {
  const pred = prediction ?? generatePreviewPrediction(homeTeam, awayTeam, league);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[#0052FF]/10 p-2">
            <Shield className="h-5 w-5 text-[#0052FF]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)]">
              Chairman &mdash; 2/3 Goal Band
            </h2>
            <p className="text-sm text-gray-500">Evaluating gate criteria&hellip;</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-48 mx-auto" />
              <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isYes = pred.yesNo === 'YES';
  const isBet = pred.signal === 'BET';
  const isMonitor = pred.signal === 'MONITOR';
  const isHighConfidence = isBet;

  const gates = [
    { key: 'gate1_xgRange', label: 'xG Range 2.0–3.2', pass: pred.gates.gate1_xgRange },
    { key: 'gate2_minGoalsEach', label: 'Both ≥ 0.8 xG', pass: pred.gates.gate2_minGoalsEach },
    { key: 'gate3_h2hVolume', label: 'H2H avg 2–4 goals', pass: pred.gates.gate3_h2hVolume },
    { key: 'gate4_leagueBaseline', label: 'League avg ≥ 2.4', pass: pred.gates.gate4_leagueBaseline },
    { key: 'gate5_cleanSheets', label: 'No clean-sheet streaks', pass: pred.gates.gate5_cleanSheets },
    { key: 'gate6_context', label: 'Non-elimination match', pass: pred.gates.gate6_context },
  ];

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-[#0052FF]/10 p-2 ring-1 ring-[#0052FF]/20">
          <Shield className="h-5 w-5 text-[#0052FF]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)]">
            Chairman &mdash; 2/3 Goal Band
          </h2>
          <p className="text-sm text-gray-500">
            Gate-evaluated Poisson prediction for 2&ndash;3 total goals
          </p>
        </div>
      </div>

      {/* Main verdict card */}
      <Card
        variant="glassy"
        className={cn(
          'border-2 transition-all duration-300',
          isYes && isBet
            ? 'border-[oklch(0.62_0.18_160/0.5)] shadow-[0_0_24px_oklch(0.62_0.18_160/0.15)]'
            : isMonitor
              ? 'border-[oklch(0.55_0.15_80/0.3)]'
              : 'border-[oklch(0.85_0.012_75)]',
        )}
      >
        <CardContent className="p-6">
          {/* Top row: signal + verdict */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {isYes && isBet ? (
                <div className="rounded-full bg-[oklch(0.62_0.18_160/0.12)] p-2.5">
                  <CheckCircle className="h-6 w-6 text-[oklch(0.62_0.18_160)]" />
                </div>
              ) : (
                <div className="rounded-full bg-[oklch(0.85_0.012_75/0.5)] p-2.5">
                  <XCircle className="h-6 w-6 text-[oklch(0.55_0.018_70)]" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-lg font-bold',
                      isYes ? 'text-[oklch(0.62_0.18_160)]' : 'text-[oklch(0.55_0.018_70)]',
                    )}
                  >
                    {isYes ? 'YES' : 'NO'} &middot; {pred.signal}
                  </span>
                  {isBet && (
                    <Badge variant="premium" className="text-[10px] tracking-wider">
                      BLUE TICK
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  2 or 3 total goals recommendation
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={isHighConfidence ? 'premium' : 'default'}
                className={cn(
                  'text-[11px] tracking-wider',
                  !isHighConfidence && 'text-[oklch(0.55_0.018_70)]',
                )}
              >
                {isHighConfidence ? 'HIGH' : 'LOW'} CONFIDENCE
              </Badge>
            </div>
          </div>

          {/* Gate evaluation */}
          <div className="rounded-xl bg-[oklch(0.97_0.006_75/0.6)] border border-[oklch(0.85_0.012_75/0.4)] p-4 mb-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Target className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gates</span>
              <Badge
                variant={pred.gates.allPass ? 'premium' : 'default'}
                className="text-[9px] ml-auto"
              >
                {pred.gates.allPass ? 'ALL PASS' : `${gates.filter((g) => g.pass).length}/${gates.length}`}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {gates.map((gate) => (
                <div
                  key={gate.key}
                  className={cn(
                    'flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5',
                    gate.pass
                      ? 'bg-[oklch(0.62_0.18_160/0.08)] text-[oklch(0.52_0.2_155)]'
                      : 'bg-[oklch(0.5_0.18_30/0.06)] text-[oklch(0.55_0.018_70)]',
                  )}
                >
                  {gate.pass ? (
                    <CheckCircle className="h-3 w-3 shrink-0 text-[oklch(0.62_0.18_160)]" />
                  ) : (
                    <XCircle className="h-3 w-3 shrink-0 text-[oklch(0.55_0.018_70)]" />
                  )}
                  <span className="truncate">{gate.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lambda components */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Sigma className="h-3 w-3" />
              <span>λ = {pred.lambdaFinal.toFixed(2)}</span>
            </div>
            <span>xG: {pred.lambdaComponents.lambdaXg.toFixed(2)}</span>
            <span>H2H: {pred.lambdaComponents.lambdaH2h.toFixed(2)}</span>
            <span>League: {pred.lambdaComponents.lambdaLeague.toFixed(2)}</span>
            {pred.lambdaComponents.restModifier !== 0 && (
              <span className="text-[oklch(0.55_0.15_80)]">
                Rest: {pred.lambdaComponents.restModifier > 0 ? '+' : ''}{pred.lambdaComponents.restModifier.toFixed(2)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
