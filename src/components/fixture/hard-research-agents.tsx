"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface HardResearchAgentsProps {
  analystA: string | null;
  analystB: string | null;
  analystC: string | null;
  chairman: string | null;
  chairmanSigned: boolean;
  totalGoalsExplanation?: string | null;
}

export function HardResearchAgents({
  analystA,
  analystB,
  analystC,
  chairman,
  chairmanSigned,
  totalGoalsExplanation,
}: HardResearchAgentsProps) {
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-purple-500/10 p-2">
          <Brain className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)]">
            Hard Research &mdash; AI Agent Analysis
          </h2>
          <p className="text-sm text-gray-500">
            Multi-agent reasoning from tactical, intel, screening, and arbitration layers
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Analyst A */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-[oklch(0.22_0.025_260)]">
                  Analyst A
                </span>
              </div>
              <Badge variant="default">Tactical</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {analystA ? (
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-5">
                {analystA}
              </p>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-600">
                  Tactical analysis pending prediction generation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analyst B */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold text-[oklch(0.22_0.025_260)]">
                  Analyst B
                </span>
              </div>
              <Badge variant="default">Intel</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {analystB ? (
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-5">
                {analystB}
              </p>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-600">
                  Intelligence report pending prediction generation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analyst C */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-400" />
                <span className="text-sm font-semibold text-[oklch(0.22_0.025_260)]">
                  Analyst C
                </span>
              </div>
              <Badge variant="default">Screening</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {analystC ? (
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-5">
                {analystC}
              </p>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-600">
                  Player screening report pending prediction generation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chairman Verdict */}
      {chairman && (
        <Card
          variant="glassy"
          className={cn(
            'border-2 transition-all duration-300',
            chairmanSigned
              ? 'border-[#0052FF]/40 shadow-[0_0_24px_#0052FF/10]'
              : 'border-[oklch(0.85_0.012_75)]',
          )}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'rounded-full p-2',
                    chairmanSigned
                      ? 'bg-[#0052FF]/12 ring-1 ring-[#0052FF]/30'
                      : 'bg-[oklch(0.92_0.01_75)]',
                  )}
                >
                  <Shield
                    className={cn(
                      'h-5 w-5',
                      chairmanSigned ? 'text-[#0052FF]' : 'text-[oklch(0.55_0.018_70)]',
                    )}
                  />
                </div>
                <div>
                  <span className="text-sm font-bold text-[oklch(0.22_0.025_260)]">
                    Chairman&apos;s Verdict
                  </span>
                  {chairmanSigned && (
                    <p className="text-[10px] text-[#0052FF] font-semibold uppercase tracking-wider mt-0.5">
                      &bull; Blue Tick Certified &bull;
                    </p>
                  )}
                </div>
              </div>
              {chairmanSigned && (
                <Badge variant="premium" className="shadow-[0_0_12px_#0052FF/25]">SIGNED</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[oklch(0.32_0.022_70)] leading-relaxed font-medium">
              {chairman}
            </p>
            {totalGoalsExplanation && (
              <div className="rounded-xl border border-[#0052FF]/15 bg-gradient-to-br from-[#0052FF]/05 to-[oklch(0.97_0.006_75)] p-4 shadow-inner">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-[#0052FF]" />
                  <span className="text-xs font-bold text-[oklch(0.42_0.02_70)] uppercase tracking-wider">
                    Total Goals Analysis
                  </span>
                </div>
                <p className="text-sm text-[oklch(0.38_0.02_70)] leading-relaxed">
                  {totalGoalsExplanation}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
