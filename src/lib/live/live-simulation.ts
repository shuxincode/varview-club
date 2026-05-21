// Live-adjusted Monte Carlo simulation engine
// Models remaining match time with momentum, red cards, and live xG adjustments

import type { LiveSimulationInput } from './live-state';

/**
 * Compute momentum metrics from live match data.
 * Returns 0-1 momentum values for each team.
 */
export function computeMomentum(
  liveXgHome: number | null,
  liveXgAway: number | null,
  possessionHome: number | null,
  possessionAway: number | null,
  dangerousAttacksHome: number | null,
  dangerousAttacksAway: number | null,
  currentHomeScore: number,
  currentAwayScore: number,
  minute: number
): { homeMomentum: number; awayMomentum: number } {
  let homeScore = 0;
  let awayScore = 0;

  // 1. Live xG rate (dominant signal, 40% weight)
  if (liveXgHome !== null && liveXgAway !== null && minute > 15) {
    const xgPerMinHome = liveXgHome / minute;
    const xgPerMinAway = liveXgAway / minute;
    const totalRate = xgPerMinHome + xgPerMinAway;
    if (totalRate > 0) {
      homeScore += (xgPerMinHome / totalRate) * 0.4;
      awayScore += (xgPerMinAway / totalRate) * 0.4;
    }
  } else {
    // No live xG: neutral split
    homeScore += 0.2;
    awayScore += 0.2;
  }

  // 2. Possession (30% weight)
  if (possessionHome !== null && possessionAway !== null) {
    const total = possessionHome + possessionAway;
    if (total > 0) {
      homeScore += (possessionHome / total) * 0.3;
      awayScore += (possessionAway / total) * 0.3;
    }
  } else {
    homeScore += 0.15;
    awayScore += 0.15;
  }

  // 3. Dangerous attacks (30% weight)
  if (dangerousAttacksHome !== null && dangerousAttacksAway !== null) {
    const total = dangerousAttacksHome + dangerousAttacksAway;
    if (total > 0) {
      homeScore += (dangerousAttacksHome / total) * 0.3;
      awayScore += (dangerousAttacksAway / total) * 0.3;
    }
  } else {
    homeScore += 0.15;
    awayScore += 0.15;
  }

  // 4. Score pressure bonus: trailing team gets desperation boost
  if (currentHomeScore < currentAwayScore) {
    homeScore += 0.1;
  } else if (currentAwayScore < currentHomeScore) {
    awayScore += 0.1;
  }

  const totalScore = homeScore + awayScore;
  if (totalScore === 0) return { homeMomentum: 0.5, awayMomentum: 0.5 };

  return {
    homeMomentum: clamp(homeScore / totalScore, 0, 1),
    awayMomentum: clamp(awayScore / totalScore, 0, 1),
  };
}

/**
 * Compute adjusted Poisson lambdas for the remaining match time.
 * Blends pre-match base lambdas with live xG rates and applies momentum/red card modifiers.
 */
export function computeAdjustedLambdas(
  input: LiveSimulationInput
): { lambdaHomeAdj: number; lambdaAwayAdj: number } {
  const {
    baseLambdaHome,
    baseLambdaAway,
    currentMinute,
    totalMinutes,
    homeMomentum,
    awayMomentum,
    homeRedCards,
    awayRedCards,
    liveXgHome,
    liveXgAway,
  } = input;

  const remainingFraction = Math.max(0, (totalMinutes - currentMinute) / totalMinutes);

  // Start with base lambdas scaled to remaining time
  let lambdaHome = baseLambdaHome * remainingFraction;
  let lambdaAway = baseLambdaAway * remainingFraction;

  // Blend in live xG rates if available (weight increases with match progression)
  if (liveXgHome !== null && liveXgAway !== null && currentMinute >= 20) {
    const liveWeight = Math.min(0.6, currentMinute / 100); // caps at 0.6 by minute 60
    const liveLambdaHome = (liveXgHome / currentMinute) * totalMinutes * remainingFraction;
    const liveLambdaAway = (liveXgAway / currentMinute) * totalMinutes * remainingFraction;
    lambdaHome = lambdaHome * (1 - liveWeight) + liveLambdaHome * liveWeight;
    lambdaAway = lambdaAway * (1 - liveWeight) + liveLambdaAway * liveWeight;
  }

  // Momentum multiplier
  if (homeMomentum > 0.7) lambdaHome *= 1.4;
  else if (homeMomentum < 0.3) lambdaHome *= 0.85;

  if (awayMomentum > 0.7) lambdaAway *= 1.4;
  else if (awayMomentum < 0.3) lambdaAway *= 0.85;

  // Red card penalty
  for (let i = 0; i < homeRedCards; i++) {
    lambdaHome *= 0.7;
    lambdaAway *= 1.15;
  }
  for (let i = 0; i < awayRedCards; i++) {
    lambdaAway *= 0.7;
    lambdaHome *= 1.15;
  }

  return {
    lambdaHomeAdj: clamp(lambdaHome, 0.05, 5.0),
    lambdaAwayAdj: clamp(lambdaAway, 0.05, 5.0),
  };
}

/**
 * Run live-adjusted Monte Carlo simulation.
 * Simulates only remaining minutes, adds current score for final distribution.
 */
export function liveMonteCarloSimulation(
  input: LiveSimulationInput,
  numSimulations: number = 10000
): LiveSimulationResult {
  const { lambdaHomeAdj, lambdaAwayAdj } = computeAdjustedLambdas(input);
  const { currentHomeScore, currentAwayScore } = input;

  // Sub-batches for convergence tracking
  const batchSize = Math.max(1, Math.floor(numSimulations / 5));
  const batchHomeWinRates: number[] = [];

  // Accumulators
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let homeComebacks = 0;
  let awayComebacks = 0;
  const scoreCounts = new Map<string, number>();
  let totalRemainingHome = 0;
  let totalRemainingAway = 0;

  const isHomeTrailing = currentHomeScore < currentAwayScore;
  const isAwayTrailing = currentAwayScore < currentHomeScore;

  for (let sim = 0; sim < numSimulations; sim++) {
    const remainingHome = samplePoisson(lambdaHomeAdj);
    const remainingAway = samplePoisson(lambdaAwayAdj);
    const finalHome = currentHomeScore + remainingHome;
    const finalAway = currentAwayScore + remainingAway;

    totalRemainingHome += remainingHome;
    totalRemainingAway += remainingAway;

    // Outcome
    if (finalHome > finalAway) {
      homeWins++;
      if (isHomeTrailing) homeComebacks++;
    } else if (finalAway > finalHome) {
      awayWins++;
      if (isAwayTrailing) awayComebacks++;
    } else {
      draws++;
    }

    // Exact score histogram
    const key = `${finalHome}-${finalAway}`;
    scoreCounts.set(key, (scoreCounts.get(key) || 0) + 1);

    // Batch tracking for convergence
    if (sim > 0 && sim % batchSize === 0) {
      batchHomeWinRates.push(homeWins / sim);
    }
  }
  // Final batch
  batchHomeWinRates.push(homeWins / numSimulations);

  // Sort exact scores by frequency
  const sortedScores = [...scoreCounts.entries()]
    .map(([key, count]) => {
      const [h, a] = key.split('-').map(Number);
      return { home: h, away: a, probability: count / numSimulations };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 10);

  const n = numSimulations;

  return {
    homeWinProb: homeWins / n,
    awayWinProb: awayWins / n,
    drawProb: draws / n,
    homeComebackProb: isHomeTrailing ? homeComebacks / n : null,
    awayComebackProb: isAwayTrailing ? awayComebacks / n : null,
    expectedRemainingGoals: {
      home: totalRemainingHome / n,
      away: totalRemainingAway / n,
    },
    expectedFinalGoals: {
      home: currentHomeScore + totalRemainingHome / n,
      away: currentAwayScore + totalRemainingAway / n,
    },
    topExactScores: sortedScores,
    validSimulations: n,
    totalSimulations: n,
  };
}

// Need to export the result type too
export interface LiveSimulationResult {
  homeWinProb: number;
  awayWinProb: number;
  drawProb: number;
  homeComebackProb: number | null;
  awayComebackProb: number | null;
  expectedRemainingGoals: { home: number; away: number };
  expectedFinalGoals: { home: number; away: number };
  topExactScores: Array<{ home: number; away: number; probability: number }>;
  validSimulations: number;
  totalSimulations: number;
}

/**
 * Compute confidence score for a live prediction.
 */
export function computeLiveConfidence(
  dataFreshnessSeconds: number,
  hasLiveXg: boolean,
  momentumConsistency: number,
  simulationConvergence: number,
  minute: number
): { confidenceScore: number; interval: { low: number; high: number } } {
  let confidence = 0.9;

  // Data freshness decay
  const stalenessPenalty = Math.floor(dataFreshnessSeconds / 30) * 0.05;
  confidence -= Math.min(stalenessPenalty, 0.4);

  // No live xG penalty
  if (!hasLiveXg) confidence -= 0.1;

  // Early match uncertainty
  if (minute < 15) confidence -= 0.1;

  // Erratic momentum
  if (momentumConsistency > 0.15) confidence -= 0.05;

  // Simulation convergence
  if (simulationConvergence > 0.02) confidence -= 0.05;

  confidence = clamp(confidence, 0.3, 0.95);

  return {
    confidenceScore: confidence,
    interval: {
      low: clamp(confidence - 0.15, 0, 1),
      high: clamp(confidence + 0.15, 0, 1),
    },
  };
}

// ── Private helpers ──

function samplePoisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
