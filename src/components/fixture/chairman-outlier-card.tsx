'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Sigma,
  Target,
  Siren,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChairmanOutlierReport } from '@/types/chairman-protocol';

interface ChairmanOutlierCardProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
  report?: ChairmanOutlierReport | null;
  loading?: boolean;
}

export function ChairmanOutlierCard({
  homeTeam,
  awayTeam,
  league,
  report,
  loading,
}: ChairmanOutlierCardProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-purple-500/10 p-2">
            <Siren className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)]">
              Chairman &mdash; Outlier Detection
            </h2>
            <p className="text-sm text-gray-500">Evaluating over-4.5 goal potential&hellip;</p>
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

  if (!report) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-purple-500/10 p-2 ring-1 ring-purple-500/20">
            <Siren className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)]">
              Chairman &mdash; Outlier Detection
            </h2>
            <p className="text-sm text-gray-500">Over-4.5 goal outlier screening</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-gray-500">Run a full analysis to generate the outlier report.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isElevated = report.status === 'ELEVATED';
  const isModerate = report.status === 'MODERATE';
  const statusColors = isElevated
    ? 'border-[oklch(0.62_0.18_160/0.5)] shadow-[0_0_24px_oklch(0.62_0.18_160/0.15)]'
    : isModerate
      ? 'border-[oklch(0.55_0.15_80/0.3)]'
      : 'border-[oklch(0.85_0.012_75)]';

  const totalPassed = report.signatures.conditions.filter(c => c.passed).length;

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-purple-500/10 p-2 ring-1 ring-purple-500/20">
          <Siren className="h-5 w-5 text-purple-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)]">
            Chairman &mdash; Outlier Detection
          </h2>
          <p className="text-sm text-gray-500">
            Over-4.5 goal outlier screening &middot; Composite confidence
          </p>
        </div>
      </div>

      {/* Main verdict card */}
      <Card variant="glassy" className={cn('border-2 transition-all duration-300', statusColors)}>
        <CardContent className="p-6 space-y-5">
          {/* Top row: status + confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'rounded-full p-2.5',
                  isElevated
                    ? 'bg-[oklch(0.62_0.18_160/0.12)]'
                    : isModerate
                      ? 'bg-[oklch(0.55_0.15_80/0.12)]'
                      : 'bg-[oklch(0.85_0.012_75/0.5)]',
                )}
              >
                {isElevated ? (
                  <TrendingUp className="h-6 w-6 text-[oklch(0.62_0.18_160)]" />
                ) : isModerate ? (
                  <AlertTriangle className="h-6 w-6 text-[oklch(0.55_0.15_80)]" />
                ) : (
                  <Shield className="h-6 w-6 text-[oklch(0.55_0.018_70)]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-lg font-bold',
                      isElevated
                        ? 'text-[oklch(0.62_0.18_160)]'
                        : isModerate
                          ? 'text-[oklch(0.55_0.15_80)]'
                          : 'text-[oklch(0.55_0.018_70)]',
                    )}
                  >
                    {report.status}
                  </span>
                  {isElevated && (
                    <Badge variant="premium" className="text-[10px] tracking-wider">
                      OUTLIER
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{report.statusReason}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={isElevated ? 'premium' : 'default'}
                className={cn(
                  'text-[11px] tracking-wider',
                  !isElevated && 'text-[oklch(0.55_0.018_70)]',
                )}
              >
                {(report.confidence.compositeConfidence * 100).toFixed(0)}% CONFIDENCE
              </Badge>
              <div className="mt-1">
                <Badge
                  variant={report.relevance.tier === 'STRONG' ? 'premium' : 'default'}
                  className="text-[9px]"
                >
                  {report.relevance.tier} RELEVANCE ({report.relevance.relevanceScore.toFixed(1)})
                </Badge>
              </div>
            </div>
          </div>

          {/* Lambda + probability row */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Sigma className="h-3 w-3" />
              <span>
                {homeTeam} &lambda;={report.lambdaHome.toFixed(2)} &middot; {awayTeam} &lambda;={report.lambdaAway.toFixed(2)}
              </span>
            </div>
            <span className="font-semibold text-[oklch(0.22_0.025_260)]">
              Total &lambda; = {report.totalLambda.toFixed(2)}
            </span>
            <span className="font-semibold">
              P(over4.5) = {(report.probOver4_5 * 100).toFixed(1)}%
            </span>
            <span>Spread: {report.modelSpread > 0 ? '+' : ''}{report.modelSpread.toFixed(1)}pp</span>
          </div>

          {/* Signatures row */}
          <div className="rounded-xl bg-[oklch(0.97_0.006_75/0.6)] border border-[oklch(0.85_0.012_75/0.4)] p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Target className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Signatures
              </span>
              <Badge
                variant={report.confidence.confidenceLabel !== 'BASELINE' ? 'premium' : 'default'}
                className="text-[9px] ml-auto"
              >
                {totalPassed}/{report.signatures.conditions.length}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {report.signatures.conditions.map((cond) => (
                <div
                  key={cond.id}
                  className={cn(
                    'flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5',
                    cond.passed
                      ? 'bg-[oklch(0.62_0.18_160/0.08)] text-[oklch(0.52_0.2_155)]'
                      : 'bg-[oklch(0.5_0.18_30/0.06)] text-[oklch(0.55_0.018_70)]',
                  )}
                >
                  {cond.passed ? (
                    <CheckCircle className="h-3 w-3 shrink-0 text-[oklch(0.62_0.18_160)]" />
                  ) : (
                    <XCircle className="h-3 w-3 shrink-0 text-[oklch(0.55_0.018_70)]" />
                  )}
                  <span className="truncate" title={cond.detail ?? cond.label}>
                    {cond.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Veto row */}
          {report.vetos.vetos.some(v => v.triggered) && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                  Vetoes Triggered
                </span>
                <Badge variant="default" className="text-[9px] ml-auto bg-red-100 text-red-700">
                  {report.vetos.hardVetoCount}H + {report.vetos.softVetoCount}S
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {report.vetos.vetos.filter(v => v.triggered).map((v) => (
                  <div key={v.id} className="flex items-center gap-1.5 text-xs text-red-700 bg-red-100/50 rounded-lg px-2 py-1.5">
                    <XCircle className="h-3 w-3 shrink-0 text-red-500" />
                    <span className="truncate">{v.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gate scores */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Poisson', score: report.confidence.gate1Score, pct: 35 },
              { label: 'Signatures', score: report.confidence.gate2Score, pct: 30 },
              { label: 'Model Spread', score: report.confidence.gate3Score, pct: 25 },
              { label: 'Veto Gate', score: report.confidence.gate4Score, pct: 10 },
            ].map((gate) => (
              <div key={gate.label} className="text-center">
                <div className="text-lg font-bold text-[oklch(0.22_0.025_260)]">
                  {(gate.score * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{gate.label}</div>
                <div className="text-[9px] text-gray-400">({gate.pct}% weight)</div>
              </div>
            ))}
          </div>

          {/* Drivers and risks */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-semibold text-[oklch(0.52_0.2_155)]">Drivers</span>
              {report.primaryDrivers.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {report.primaryDrivers.map((d, i) => (
                    <li key={i} className="flex items-start gap-1 text-gray-600">
                      <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-[oklch(0.62_0.18_160)]" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-gray-400">No strong drivers identified</p>
              )}
            </div>
            <div>
              <span className="font-semibold text-red-600">Risks</span>
              {report.primaryRisks.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {report.primaryRisks.map((r, i) => (
                    <li key={i} className="flex items-start gap-1 text-gray-600">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-[oklch(0.55_0.15_80)]" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-gray-400">No significant risks detected</p>
              )}
            </div>
          </div>

          {/* Reasoning summary */}
          <div className="text-xs text-gray-500 italic leading-relaxed border-t border-[oklch(0.85_0.012_75/0.4)] pt-3">
            {report.reasoningSummary}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
