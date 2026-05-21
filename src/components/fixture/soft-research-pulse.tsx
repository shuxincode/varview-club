"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Battery, Gauge } from "lucide-react";
import type { SoftSignalReport } from "@/types/insight";

interface SoftResearchPulseProps {
  signals: SoftSignalReport;
  homeTeam: string;
  awayTeam: string;
}

function PulseGauge({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const percentage = Math.round(value * 100);
  const barColor =
    percentage >= 70
      ? "bg-green-500"
      : percentage >= 40
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs text-gray-400">{label}</span>
        </div>
        <span className="text-xs font-mono font-medium text-[oklch(0.22_0.025_260)]">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function SoftResearchPulse({
  signals,
  homeTeam,
  awayTeam,
}: SoftResearchPulseProps) {
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-emerald-500/10 p-2">
          <Heart className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)]">
            Soft Research &mdash; Team Pulse
          </h2>
          <p className="text-sm text-gray-500">
            Qualitative signals: morale, fatigue, and pressure analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Home Team Pulse */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[oklch(0.22_0.025_260)] truncate pr-2">
                {homeTeam}
              </span>
              <Badge variant="default">HOME</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <PulseGauge
              label="Morale"
              value={signals.morale.home}
              icon={Heart}
              color="emerald"
            />
            <PulseGauge
              label="Fatigue"
              value={signals.fatigue.home}
              icon={Battery}
              color="amber"
            />
            <PulseGauge
              label="Pressure"
              value={signals.pressure.home}
              icon={Gauge}
              color="red"
            />
          </CardContent>
        </Card>

        {/* Away Team Pulse */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[oklch(0.22_0.025_260)] truncate pr-2">
                {awayTeam}
              </span>
              <Badge variant="default">AWAY</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <PulseGauge
              label="Morale"
              value={signals.morale.away}
              icon={Heart}
              color="emerald"
            />
            <PulseGauge
              label="Fatigue"
              value={signals.fatigue.away}
              icon={Battery}
              color="amber"
            />
            <PulseGauge
              label="Pressure"
              value={signals.pressure.away}
              icon={Gauge}
              color="red"
            />
          </CardContent>
        </Card>
      </div>

      {/* Match Stakes */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-sm text-gray-500">Match stakes:</span>
        <Badge
          variant={
            signals.matchStakes === "High"
              ? "warning"
              : signals.matchStakes === "Medium"
                ? "info"
                : "default"
          }
        >
          {signals.matchStakes} STAKES
        </Badge>
      </div>
    </div>
  );
}
