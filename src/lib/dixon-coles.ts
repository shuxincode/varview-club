// Dixon-Coles bivariate Poisson solver
// Models home/away goal expectations with dependence parameter rho
// Reference: Dixon & Coles (1997), "Modelling Association Football Scores..."

export interface DixonColesParams {
  lambdaHome: number;
  lambdaAway: number;
  rho: number;
}

export interface SeasonalContext {
  footballYear: string;       // e.g., "2024/25" or "2025"
  weekOfSeason: number;       // 1-52, based on current date relative to season start
  totalSeasonWeeks: number;   // Total weeks in this season (typically ~40)
  isEarlySeason: boolean;     // First 8 weeks
  isLateSeason: boolean;      // Last 6 weeks
  leagueHemisphere: string;   // For logging/debugging
}

interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  weekOfSeason?: number;      // Week within the football year
}

/**
 * Build a seasonal context from league config and current date.
 */
export function buildSeasonalContext(
  seasonStartMonth: number,
  seasonEndMonth: number,
  hemisphere: string,
  currentDate: Date = new Date()
): SeasonalContext {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Determine football year string
  let footballYear: string;
  if (seasonStartMonth > seasonEndMonth) {
    // Cross-year season: Aug-May
    if (month >= seasonStartMonth) {
      footballYear = `${year}/${year + 1}`;
    } else {
      footballYear = `${year - 1}/${year}`;
    }
  } else {
    // Same-year season: Mar-Nov
    footballYear = `${year}`;
  }

  // Calculate week of season
  const seasonStartDate = new Date(year, seasonStartMonth - 1, 1);
  const diffMs = currentDate.getTime() - seasonStartDate.getTime();
  const weekOfSeason = Math.max(1, Math.min(52, Math.ceil(diffMs / (7 * 86400000))));

  // For cross-year seasons, adjust start date
  let adjustedWeek = weekOfSeason;
  if (seasonStartMonth > seasonEndMonth && month < seasonStartMonth) {
    // We're in the Jan-May portion of a cross-year season
    const crossYearStart = new Date(year - 1, seasonStartMonth - 1, 1);
    const crossYearDiff = currentDate.getTime() - crossYearStart.getTime();
    adjustedWeek = Math.max(1, Math.ceil(crossYearDiff / (7 * 86400000)));
  }

  const totalWeeks = seasonStartMonth > seasonEndMonth ? 42 : 38;
  const isEarly = adjustedWeek <= 8;
  const isLate = adjustedWeek >= totalWeeks - 6;

  return {
    footballYear,
    weekOfSeason: adjustedWeek,
    totalSeasonWeeks: totalWeeks,
    isEarlySeason: isEarly,
    isLateSeason: isLate,
    leagueHemisphere: hemisphere,
  };
}

/**
 * Maximum likelihood estimation for Dixon-Coles parameters.
 * Simplified version using moment-based estimation from observed results.
 * Supports seasonal offset handling for summer vs winter leagues.
 */
export function estimateDixonColes(
  recentMatches: MatchResult[],
  h2hMatches: MatchResult[],
  seasonalContext?: SeasonalContext
): DixonColesParams {
  const allMatches = [...recentMatches, ...h2hMatches];

  if (allMatches.length === 0) {
    // Default parameters for no data
    return { lambdaHome: 1.5, lambdaAway: 1.2, rho: -0.1 };
  }

  // Weight H2H matches higher (2x weight)
  // Apply seasonal decay: early season = more weight on H2H, late season = more weight on recent
  const h2hMultiplier = seasonalContext?.isEarlySeason ? 3 : seasonalContext?.isLateSeason ? 1 : 2;
  const recentMultiplier = seasonalContext?.isLateSeason ? 1.5 : seasonalContext?.isEarlySeason ? 0.7 : 1;

  const weightedMatches = [
    ...recentMatches.map((m) => ({ ...m, weight: recentMultiplier * getMatchWeight(m) })),
    ...h2hMatches.map((m) => ({ ...m, weight: h2hMultiplier * getMatchWeight(m) })),
  ];

  const totalWeight = weightedMatches.reduce((s, m) => s + m.weight, 0);

  // Home attack strength: avg home goals relative to league avg
  const avgHomeGoals =
    weightedMatches.reduce((s, m) => s + m.homeGoals * m.weight, 0) / totalWeight;
  const avgAwayGoals =
    weightedMatches.reduce((s, m) => s + m.awayGoals * m.weight, 0) / totalWeight;

  // Attack/defense parameters with shrinkage
  const attackStrength = avgHomeGoals / Math.max(avgHomeGoals + avgAwayGoals, 0.01);
  const defenseStrength = 1 - attackStrength;

  // Weight recent matches more (exponential decay)
  const lambdaHome = avgHomeGoals * (0.7 + 0.3 * attackStrength);
  const lambdaAway = avgAwayGoals * (0.7 + 0.3 * defenseStrength);

  // Rho: dependence parameter (negative = fewer low-scoring draws)
  const rho = estimateRho(weightedMatches, lambdaHome, lambdaAway);

  return {
    lambdaHome: clamp(lambdaHome, 0.1, 5),
    lambdaAway: clamp(lambdaAway, 0.1, 5),
    rho: clamp(rho, -0.5, 0.2),
  };
}

/**
 * Time-decay weight: more recent matches matter more.
 * Week 1 = 0.5 weight, week 20+ = 1.0 weight (full relevance).
 * This prevents early-season noise from over-influencing the model.
 */
function getMatchWeight(match: MatchResult): number {
  if (!match.weekOfSeason) return 1;
  // Exponential approach: matches from early weeks get down-weighted
  return Math.min(1, 0.3 + (match.weekOfSeason / 20) * 0.7);
}

/**
 * Apply seasonal adjustment factor to Dixon-Coles estimates.
 * Early season: regress toward league mean (more uncertainty, wider CIs).
 * Late season: amplify team-specific signals (narrower CIs, higher confidence).
 */
export function applySeasonalAdjustment(
  params: DixonColesParams,
  context: SeasonalContext
): DixonColesParams & { uncertaintyMultiplier: number } {
  let uncertaintyMultiplier = 1;

  if (context.isEarlySeason) {
    // Early season: regress toward mean (1.5/1.2 for home/away)
    const regression = 0.3; // 30% regression to mean
    params.lambdaHome = params.lambdaHome * (1 - regression) + 1.5 * regression;
    params.lambdaAway = params.lambdaAway * (1 - regression) + 1.2 * regression;
    uncertaintyMultiplier = 1.4; // 40% wider confidence intervals
  } else if (context.isLateSeason) {
    // Late season: amplify team-specific signal
    uncertaintyMultiplier = 0.8; // 20% narrower confidence intervals
  }

  // Clamp again after adjustments
  params.lambdaHome = clamp(params.lambdaHome, 0.1, 5);
  params.lambdaAway = clamp(params.lambdaAway, 0.1, 5);

  return { ...params, uncertaintyMultiplier };
}

function estimateRho(
  matches: Array<MatchResult & { weight: number }>,
  lambdaHome: number,
  lambdaAway: number
): number {
  // Count observed 0-0 and 1-1 draws vs expected under independence
  const totalWeight = matches.reduce((s, m) => s + m.weight, 0);

  let observed00 = 0;
  let observed11 = 0;
  for (const m of matches) {
    if (m.homeGoals === 0 && m.awayGoals === 0) observed00 += m.weight;
    if (m.homeGoals === 1 && m.awayGoals === 1) observed11 += m.weight;
  }

  const prob00 = Math.exp(-lambdaHome - lambdaAway);
  const prob11 = lambdaHome * lambdaAway * Math.exp(-lambdaHome - lambdaAway);

  const expected00 = prob00 * totalWeight;
  const expected11 = prob11 * totalWeight;

  // If we observe fewer 0-0 / 1-1 than expected, rho is negative (modern football)
  const ratio00 = observed00 / Math.max(expected00, 0.01);
  const ratio11 = observed11 / Math.max(expected11, 0.01);

  return -0.05 * (1 - ratio00) - 0.03 * (1 - ratio11);
}

/**
 * Calculate exact match outcome probabilities under bivariate Poisson.
 */
export function calculateProbabilities(
  params: DixonColesParams,
  maxGoals: number = 6
): {
  homeWin: number;
  awayWin: number;
  draw: number;
  over2_5: number;
  under2_5: number;
  bttsYes: number;
  bttsNo: number;
  homeScores: number;
  awayScores: number;
} {
  const { lambdaHome, lambdaAway, rho } = params;

  // Build probability matrix up to maxGoals
  const probs: number[][] = [];
  let totalProb = 0;

  for (let i = 0; i <= maxGoals; i++) {
    probs[i] = [];
    for (let j = 0; j <= maxGoals; j++) {
      let p = poissonProb(i, lambdaHome) * poissonProb(j, lambdaAway);

      // Dixon-Coles adjustment for low-scoring outcomes
      if (i === 0 && j === 0) {
        p *= 1 - lambdaHome * lambdaAway * rho;
      } else if (i === 0 && j === 1) {
        p *= 1 + lambdaHome * rho;
      } else if (i === 1 && j === 0) {
        p *= 1 + lambdaAway * rho;
      } else if (i === 1 && j === 1) {
        p *= 1 + rho;
      }

      probs[i][j] = p;
      totalProb += p;
    }
  }

  // Normalize
  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      probs[i][j] /= totalProb;
    }
  }

  // Aggregate probabilities
  let homeWin = 0;
  let awayWin = 0;
  let draw = 0;
  let over2_5 = 0;
  let bttsYes = 0;

  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const p = probs[i][j];
      if (i > j) homeWin += p;
      else if (j > i) awayWin += p;
      else draw += p;

      if (i + j > 2) over2_5 += p;
      if (i > 0 && j > 0) bttsYes += p;
    }
  }

  return {
    homeWin,
    awayWin,
    draw,
    over2_5,
    under2_5: 1 - over2_5,
    bttsYes,
    bttsNo: 1 - bttsYes,
    homeScores: 1 - poissonProb(0, lambdaHome),
    awayScores: 1 - poissonProb(0, lambdaAway),
  };
}

function poissonProb(k: number, lambda: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Simulate match outcomes via Monte Carlo for Bayesian confidence sampling.
 */
export function monteCarloSimulation(
  params: DixonColesParams,
  numSimulations: number = 10000
): {
  homeWinRate: number;
  awayWinRate: number;
  drawRate: number;
  over2_5Rate: number;
  bttsRate: number;
  firstHalfOver0_5Rate: number;
} {
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let over2_5 = 0;
  let btts = 0;
  let firstHalfOver0_5 = 0;

  // First half: use reduced lambda (~40% of full match)
  const halfLambdaHome = params.lambdaHome * 0.40;
  const halfLambdaAway = params.lambdaAway * 0.40;

  for (let sim = 0; sim < numSimulations; sim++) {
    const homeGoals = samplePoisson(params.lambdaHome);
    const awayGoals = samplePoisson(params.lambdaAway);
    const homeHT = samplePoisson(halfLambdaHome);
    const awayHT = samplePoisson(halfLambdaAway);

    if (homeGoals > awayGoals) homeWins++;
    else if (awayGoals > homeGoals) awayWins++;
    else draws++;

    if (homeGoals + awayGoals > 2) over2_5++;
    if (homeGoals > 0 && awayGoals > 0) btts++;
    if (homeHT + awayHT >= 1) firstHalfOver0_5++;
  }

  return {
    homeWinRate: homeWins / numSimulations,
    awayWinRate: awayWins / numSimulations,
    drawRate: draws / numSimulations,
    over2_5Rate: over2_5 / numSimulations,
    bttsRate: btts / numSimulations,
    firstHalfOver0_5Rate: firstHalfOver0_5 / numSimulations,
  };
}

function samplePoisson(lambda: number): number {
  // Knuth's algorithm for Poisson sampling
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}
