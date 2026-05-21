"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceSlider } from "@/components/ui/slider";
import { BarChart3, TrendingUp, CheckCircle, Shield, Sigma } from "lucide-react";

interface PillarData {
  label: string;
  prediction: string;
  confidence: number;
}

interface HardResearchPillarsProps {
  pillars: PillarData[];
  lambdaHome?: number;
  lambdaAway?: number;
  ciLow?: number;
  ciHigh?: number;
}

export function HardResearchPillars({
  pillars,
  lambdaHome,
  lambdaAway,
  ciLow,
  ciHigh,
}: HardResearchPillarsProps) {
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-[#0052FF]/10 p-2">
          <BarChart3 className="h-5 w-5 text-[#0052FF]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)]">
            Hard Research &mdash; Statistical Model
          </h2>
          <p className="text-sm text-gray-500">
            Dixon-Coles bivariate Poisson with Bayesian calibration
          </p>
        </div>
      </div>

      {/* 4 Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pillars.map((p) => (
          <Card key={p.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-400">
                  {p.label}
                </span>
                <Badge
                  variant={
                    p.confidence > 0.6
                      ? "premium"
                      : p.confidence > 0.4
                        ? "warning"
                        : "default"
                  }
                >
                  {p.prediction}
                </Badge>
              </div>
              <ConfidenceSlider value={p.confidence} color="blue" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dixon-Coles lambda + Bayesian CI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Lambda values */}
        {(lambdaHome !== undefined || lambdaAway !== undefined) && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sigma className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-[oklch(0.22_0.025_260)]">
                  Goal Expectancy (&lambda;)
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Home</span>
                  <p className="text-xl font-mono font-bold text-[oklch(0.22_0.025_260)]">
                    {lambdaHome?.toFixed(3) ?? "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Away</span>
                  <p className="text-xl font-mono font-bold text-[oklch(0.22_0.025_260)]">
                    {lambdaAway?.toFixed(3) ?? "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bayesian CI */}
        {ciLow !== undefined && ciHigh !== undefined && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#0052FF]" />
                <span className="text-sm font-semibold text-[oklch(0.22_0.025_260)]">
                  Bayesian Confidence
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-gradient-to-r from-blue-900/50 via-[#0052FF] to-blue-900/50 rounded-full"
                  style={{
                    left: `${ciLow * 100}%`,
                    right: `${100 - ciHigh * 100}%`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-mono text-[oklch(0.22_0.025_260)]">
                    [{Math.round(ciLow * 100)}%&ndash;{Math.round(ciHigh * 100)}%]
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
        )}
      </div>
    </div>
  );
}
