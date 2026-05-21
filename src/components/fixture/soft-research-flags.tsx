"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, Flag } from "lucide-react";
import type { SoftSignalAnomaly } from "@/types/insight";

interface SoftResearchFlagsProps {
  anomalies: SoftSignalAnomaly[];
  homeTeam: string;
  awayTeam: string;
}

export function SoftResearchFlags({
  anomalies,
  homeTeam,
  awayTeam,
}: SoftResearchFlagsProps) {
  const severityIcon = (s: string) => {
    switch (s) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default:
        return <Flag className="h-4 w-4 text-blue-400" />;
    }
  };

  const teamLabel = (team?: "home" | "away") => {
    if (!team) return null;
    const name = team === "home" ? homeTeam : awayTeam;
    return (
      <Badge
        variant={team === "home" ? "default" : "info"}
        className="text-[10px]"
      >
        {name}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-amber-500/10 p-2">
          <Info className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)]">
            Soft Research &mdash; Contextual Flags
          </h2>
          <p className="text-sm text-gray-500">
            Non-statistical signals and situational anomalies
          </p>
        </div>
      </div>

      {anomalies.length > 0 ? (
        <div className="space-y-3">
          {anomalies.map((a, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {severityIcon(a.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-[oklch(0.22_0.025_260)] capitalize">
                        {a.type.replace(/_/g, " ")}
                      </span>
                      {teamLabel(a.team)}
                      <Badge
                        variant={
                          a.severity === "high"
                            ? "danger"
                            : a.severity === "medium"
                              ? "warning"
                              : "default"
                        }
                        className="text-[10px]"
                      >
                        {a.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">{a.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Flag className="h-8 w-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              No significant contextual anomalies detected for this fixture.
            </p>
            <p className="text-xs text-gray-700 mt-1">
              Soft signal scraping will populate this section when the prediction
              engine is active.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
