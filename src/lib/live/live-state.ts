// ── Live Match State (fetched every 30s from Flashscore + FotMob) ──

export interface LiveMatchState {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  status: 'in_play' | 'finished' | 'halftime';
  minute: number;
  stoppageTime: number;
  homeScore: number;
  awayScore: number;
  homeScoreHT: number | null;
  awayScoreHT: number | null;
  liveXg: { home: number; away: number } | null;
  dangerousAttacks: { home: number; away: number } | null;
  possession: { home: number; away: number } | null;
  redCards: { home: number; away: number };
  lastUpdated: string;
  dataFreshnessSeconds: number;
  sources: { flashscore: boolean; fotmob: boolean };
}

// ── Momentum Metrics ──

export interface MomentumMetrics {
  homeMomentum: number;
  awayMomentum: number;
  homeAttackRate: number;
  awayAttackRate: number;
  homeDangerRate: number;
  awayDangerRate: number;
  scorePressure: number;
}

// ── Live Prediction Output ──

export interface LivePrediction {
  fixtureId: number;
  matchMinute: number;
  currentScore: { home: number; away: number };
  homeWinProbability: number;
  awayWinProbability: number;
  drawProbability: number;
  homeComebackProb: number | null;
  awayComebackProb: number | null;
  exactScoreProbs: Array<{ home: number; away: number; probability: number }>;
  expectedRemainingGoals: { home: number; away: number };
  expectedFinalGoals: { home: number; away: number };
  confidenceScore: number;
  confidenceInterval: { low: number; high: number };
  chairmanReasoning: string;
  momentum: MomentumMetrics;
  dataFreshnessSeconds: number;
  generatedAt: string;
  predictionSource: 'live' | 'prematch_fallback';
}

// ── Live Simulation Input ──

export interface LiveSimulationInput {
  baseLambdaHome: number;
  baseLambdaAway: number;
  currentMinute: number;
  totalMinutes: number;
  currentHomeScore: number;
  currentAwayScore: number;
  homeMomentum: number;
  awayMomentum: number;
  homeRedCards: number;
  awayRedCards: number;
  liveXgHome: number | null;
  liveXgAway: number | null;
}

// ── FotMob API Response Shapes (internal) ──

export interface FotMobMatchDetailsResponse {
  id: number;
  general: {
    homeTeam: { name: string };
    awayTeam: { name: string };
    liveTime?: { short: string; long: string };
    status: { reason: string };
  };
  stats?: {
    shots?: { home: string; away: string };
    shotsOnGoal?: { home: string; away: string };
    dangerousAttacks?: { home: string; away: string };
    possession?: { home: string; away: string };
    expectedGoals?: { home: string; away: string };
    bigChances?: { home: string; away: string };
  };
  header?: {
    status: { reason: string };
    teams: Array<{ name: string }>;
  };
}

export interface FotMobSearchResult {
  id: number;
  name: string;
  country: string;
}

export interface FotMobTeamPage {
  matches?: Array<{
    id: number;
    home: { name: string };
    away: { name: string };
    status: string;
    league: string;
  }>;
}
