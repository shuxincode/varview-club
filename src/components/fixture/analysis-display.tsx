'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfidenceSlider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Shield, CheckCircle, XCircle, AlertTriangle, BarChart3, Sigma } from 'lucide-react';
import type { AIAnalysis, Fixture } from '@/types';

interface AnalysisDisplayProps {
  analysis: AIAnalysis;
  fixture: Fixture;
}

export function AnalysisDisplay({ analysis, fixture }: AnalysisDisplayProps) {
  type PillarColor = 'blue' | 'green' | 'yellow' | 'red';

  function getConfidenceColor(value: number): PillarColor {
    return value > 0.6 ? 'green' : value > 0.4 ? 'yellow' : 'red';
  }

  const pillarConfig = [
    {
      label: 'Total Goals',
      prediction: analysis.total_goals_prediction === 'over_2.5' ? 'Over 2.5' : 'Under 2.5',
      confidence: analysis.total_goals_confidence,
      color: getConfidenceColor(analysis.total_goals_confidence),
    },
    {
      label: 'Both Teams to Score',
      prediction: analysis.btts_prediction === 'yes' ? 'Yes' : 'No',
      confidence: analysis.btts_confidence,
      color: getConfidenceColor(analysis.btts_confidence),
    },
    {
      label: 'Winner',
      prediction: analysis.winner_prediction.charAt(0).toUpperCase() + analysis.winner_prediction.slice(1),
      confidence: analysis.winner_confidence,
      color: getConfidenceColor(analysis.winner_confidence),
    },
    {
      label: 'First Half Goals',
      prediction: analysis.first_half_goals_prediction === 'over_0.5' ? 'Over 0.5' : 'Under 0.5',
      confidence: analysis.first_half_goals_confidence,
      color: getConfidenceColor(analysis.first_half_goals_confidence),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Chairman's Blue Tick */}
      <Card
        variant="glassy"
        className={cn(
          'border-2 transition-all duration-300',
          analysis.chairman_signed
            ? 'border-[#0052FF]/40 shadow-[0_0_24px_#0052FF/10]'
            : 'border-[oklch(0.85_0.012_75)]',
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {analysis.chairman_signed ? (
                <div className="rounded-full bg-[#0052FF]/12 p-2 ring-1 ring-[#0052FF]/30">
                  <Shield className="h-6 w-6 text-[#0052FF]" />
                </div>
              ) : (
                <div className="rounded-full bg-[oklch(0.92_0.01_75)] p-2">
                  <AlertTriangle className="h-6 w-6 text-[oklch(0.55_0.15_80)]" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[oklch(0.22_0.025_260)]">
                    {analysis.chairman_signed ? "Chairman's Blue Tick" : 'Pending Review'}
                  </span>
                  {analysis.chairman_signed && (
                    <Badge variant="premium" className="shadow-[0_0_12px_#0052FF/25]">SIGNED</Badge>
                  )}
                </div>
                <p className="text-xs text-[oklch(0.55_0.018_70)] mt-0.5">
                  {analysis.chairman_signed
                    ? 'This analysis has been verified by the Chairman AI'
                    : 'Awaiting Chairman verification'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pillarConfig.map((pillar) => (
          <Card key={pillar.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-400">{pillar.label}</span>
                <Badge
                  variant={analysis.chairman_signed ? 'premium' : 'default'}
                >
                  {pillar.prediction}
                </Badge>
              </div>
              <ConfidenceSlider
                value={pillar.confidence}
                color={pillar.color}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bayesian Confidence Interval */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#0052FF]" />
            <span className="text-sm font-semibold text-[oklch(0.22_0.025_260)]">Bayesian Confidence Interval</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-gradient-to-r from-blue-900/50 via-[#0052FF] to-blue-900/50 rounded-full"
              style={{
                left: `${analysis.confidence_interval_low * 100}%`,
                right: `${100 - analysis.confidence_interval_high * 100}%`,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-mono text-[oklch(0.22_0.025_260)]">
                [{Math.round(analysis.confidence_interval_low * 100)}% - {Math.round(analysis.confidence_interval_high * 100)}%]
              </span>
            </div>
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-gray-500">
            <span>0%</span>
            <span>90% CI</span>
            <span>100%</span>
          </div>
        </CardContent>
      </Card>

      {/* Agent Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analysis.analyst_a_report && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Analyst A</span>
                <Badge variant="default">Tactical</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">
                {analysis.analyst_a_report}
              </p>
            </CardContent>
          </Card>
        )}
        {analysis.analyst_b_report && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Analyst B</span>
                <Badge variant="default">Intel</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">
                {analysis.analyst_b_report}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chairman Report */}
      {analysis.chairman_report && (
        <Card
          variant="glassy"
          className={cn(
            'border-2',
            analysis.chairman_signed
              ? 'border-[#0052FF]/30 shadow-[0_0_20px_#0052FF/08]'
              : 'border-[oklch(0.85_0.012_75)]',
          )}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-[#0052FF]/10 p-1.5">
                <Shield className="h-4 w-4 text-[#0052FF]" />
              </div>
              <span className="text-sm font-bold text-[oklch(0.22_0.025_260)]">Chairman&apos;s Verdict</span>
              {analysis.chairman_signed && (
                <span className="text-[10px] text-[#0052FF] font-semibold uppercase tracking-wider ml-auto">
                  &bull; Blue Tick &bull;
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[oklch(0.32_0.022_70)] leading-relaxed font-medium">
              {analysis.chairman_report}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dixon-Coles Parameters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sigma className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-[oklch(0.22_0.025_260)]">Dixon-Coles Parameters</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-500">λ (Home)</span>
              <p className="text-lg font-mono text-[oklch(0.22_0.025_260)]">{analysis.lambda_home.toFixed(3)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">λ (Away)</span>
              <p className="text-lg font-mono text-[oklch(0.22_0.025_260)]">{analysis.lambda_away.toFixed(3)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
