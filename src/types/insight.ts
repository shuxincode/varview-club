export interface SoftSignalReport {
  morale: { home: number; away: number };
  fatigue: { home: number; away: number };
  pressure: { home: number; away: number };
  matchStakes: "High" | "Medium" | "Low";
  anomalies: SoftSignalAnomaly[];
}

export interface SoftSignalAnomaly {
  type: string;
  description: string;
  severity: "high" | "medium" | "low";
  team?: "home" | "away";
}

export function generateSoftSignals(
  homeTeam: string,
  awayTeam: string,
): SoftSignalReport {
  return {
    morale: {
      home: Number((0.4 + Math.random() * 0.5).toFixed(2)),
      away: Number((0.3 + Math.random() * 0.5).toFixed(2)),
    },
    fatigue: {
      home: Number((0.2 + Math.random() * 0.4).toFixed(2)),
      away: Number((0.3 + Math.random() * 0.5).toFixed(2)),
    },
    pressure: {
      home: Number((0.3 + Math.random() * 0.5).toFixed(2)),
      away: Number((0.2 + Math.random() * 0.5).toFixed(2)),
    },
    matchStakes: (["High", "Medium", "Low"] as const)[
      Math.floor(Math.random() * 3)
    ],
    anomalies: [],
  };
}
