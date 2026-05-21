// Chairman Goals Band (2-3 Goals) - gate evaluation, weighted lambda, Poisson prediction

export interface GoalsBandInput {
  homeTeam: string;
  awayTeam: string;
  league: string;
  xgHome: number;
  xgAway: number;
  xgSource: "understat" | "fbref" | "sofascore" | "estimated";
  h2hTotalGoals: number[];
  leagueAvgGoals: number;
  homeCleanSheetStreak: number;
  awayCleanSheetStreak: number;
  homeRestDays: number;
  awayRestDays: number;
  homeMissingKeyPlayers: number;
  awayMissingKeyPlayers: number;
  refereeAvgCards: number;
  weather: "clear" | "rain" | "wind" | "snow";
  isEliminationMatch: boolean;
}

export interface GoalsBandPrediction {
  signal: "BET" | "MONITOR" | "SKIP";
  yesNo: "YES" | "NO";
  confidence: number;
  lambdaFinal: number;
  prob2Goals: number;
  prob3Goals: number;
  probBand: number;
  gates: {
    gate1_xgRange: boolean;
    gate2_minGoalsEach: boolean;
    gate3_h2hVolume: boolean;
    gate4_leagueBaseline: boolean;
    gate5_cleanSheets: boolean;
    gate6_context: boolean;
    allPass: boolean;
  };
  lambdaComponents: {
    lambdaXg: number;
    lambdaH2h: number;
    lambdaLeague: number;
    restModifier: number;
    availabilityModifier: number;
    refereeModifier: number;
    weatherModifier: number;
  };
  expectedTotalGoals: number;
}

const TEAM_NAME_ALIASES = {
  "Manchester United": ["man united", "man utd", "mu", "mufc", "manchester utd"],
  "Manchester City": ["man city", "mci", "man. city", "mancity"],
  "Liverpool": ["liverpool fc", "lfc", "liverpool f.c."],
  "Arsenal": ["arsenal fc", "afc", "arsenal f.c."],
  "Chelsea": ["chelsea fc", "cfc", "chelsea f.c."],
  "Tottenham Hotspur": ["tottenham", "spurs", "thfc", "tottenham hotspur fc"],
  "Newcastle United": ["newcastle", "nufc", "newcastle utd", "newcastle united fc"],
  "Aston Villa": ["aston villa fc", "avfc", "villa"],
  "West Ham United": ["west ham", "whu", "west ham utd", "west ham united fc"],
  "Wolverhampton Wanderers": ["wolves", "wolverhampton", "wwfc"],
  "Brighton & Hove Albion": ["brighton", "bhafc"],
  "Crystal Palace": ["palace", "cpfc"],
  "Everton": ["everton fc", "efc"],
  "Fulham": ["fulham fc", "ffc"],
  "Brentford": ["brentford fc", "bec"],
  "Nottingham Forest": ["nottingham", "nffc", "notts forest"],
  "Bournemouth": ["afc bournemouth", "bournemouth fc"],
  "Ipswich Town": ["ipswich", "itfc"],
  "Leicester City": ["leicester", "lcfc", "leicester city fc"],
  "Southampton": ["southampton fc", "sfc"],
  "Bayern Munich": ["bayern", "fc bayern", "bayern munchen", "bayern munich"],
  "Borussia Dortmund": ["dortmund", "bvb", "bvb dortmund"],
  "Barcelona": ["fc barcelona", "barca", "barca"],
  "Real Madrid": ["real madrid cf", "rmcf", "madrid"],
  "Atletico Madrid": ["atletico madrid", "atletico madrid", "atleti"],
  "Paris Saint-Germain": ["psg", "paris sg", "paris saint-germain"],
  "Inter Milan": ["inter", "inter milan", "fc internazionale"],
  "AC Milan": ["ac milan", "milan"],
  "Juventus": ["juventus fc", "juve"],
};

export function normalizeTeamName(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(TEAM_NAME_ALIASES)) {
    if (aliases.includes(lower) || lower === canonical.toLowerCase()) return canonical;
  }
  return name;
}

export function poissonProb(k: number, lambda: number): number {
  if (lambda <= 0) return 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/**
 * Compute a GoalsBandPrediction from real lambda values (home + away).
 * Used by the insight page to pass real data instead of placeholder previews.
 */
export function computeGoalsBandFromLambdas(lambdaHome: number, lambdaAway: number): GoalsBandPrediction {
  const combined = lambdaHome + lambdaAway;
  const prob2 = poissonProb(2, combined);
  const prob3 = poissonProb(3, combined);
  const pBand = prob2 + prob3;

  const gates = {
    gate1_xgRange: combined >= 2.0 && combined <= 3.2,
    gate2_minGoalsEach: lambdaHome >= 0.8 && lambdaAway >= 0.8,
    gate3_h2hVolume: false,
    gate4_leagueBaseline: combined >= 2.4,
    gate5_cleanSheets: true,
    gate6_context: true,
    allPass: combined >= 2.0 && combined <= 3.2 && lambdaHome >= 0.8 && lambdaAway >= 0.8 && combined >= 2.4,
  };

  const isBet = pBand >= 0.44 && combined >= 1.8 && combined <= 3.4;
  const isMonitor = pBand >= 0.38;

  return {
    signal: gates.allPass && isBet ? 'BET' : isMonitor ? 'MONITOR' : 'SKIP',
    yesNo: gates.allPass && isBet ? 'YES' : 'NO',
    confidence: pBand,
    lambdaFinal: combined,
    prob2Goals: prob2,
    prob3Goals: prob3,
    probBand: pBand,
    gates,
    lambdaComponents: {
      lambdaXg: combined,
      lambdaH2h: combined,
      lambdaLeague: combined,
      restModifier: 0,
      availabilityModifier: 0,
      refereeModifier: 0,
      weatherModifier: 0,
    },
    expectedTotalGoals: combined,
  };
}

function evaluateGates(input: GoalsBandInput): GoalsBandPrediction['gates'] {
  const combinedXg = input.xgHome + input.xgAway;
  const gate1 = combinedXg >= 2.0 && combinedXg <= 3.2;
  const gate2 = input.xgHome >= 0.8 && input.xgAway >= 0.8;
  const h2hCount = input.h2hTotalGoals.length;
  const avgH2H = h2hCount > 0 ? input.h2hTotalGoals.reduce((s, g) => s + g, 0) / h2hCount : 0;
  const gate3 = h2hCount >= 4 && avgH2H >= 2.0 && avgH2H <= 4.0;
  const gate4 = input.leagueAvgGoals >= 2.4;
  const gate5 = input.homeCleanSheetStreak < 3 && input.awayCleanSheetStreak < 3;
  const gate6 = !input.isEliminationMatch;
  return {
    gate1_xgRange: gate1,
    gate2_minGoalsEach: gate2,
    gate3_h2hVolume: gate3,
    gate4_leagueBaseline: gate4,
    gate5_cleanSheets: gate5,
    gate6_context: gate6,
    allPass: gate1 && gate2 && gate3 && gate4 && gate5 && gate6,
  };
}

function computeRestModifier(homeDays: number, awayDays: number): number {
  let mod = 0;
  if (homeDays < 6) mod -= 0.1;
  if (awayDays < 6) mod -= 0.1;
  return mod;
}

function computeAvailabilityModifier(homeMissing: number, awayMissing: number): number {
  let mod = 0;
  if (homeMissing > 2) mod -= 0.15;
  if (awayMissing > 2) mod -= 0.15;
  return mod;
}

function computeRefereeModifier(avgCards: number): number {
  return avgCards > 4 ? -0.05 : 0;
}

function computeWeatherModifier(weather: string): number {
  switch (weather) {
    case 'rain': return -0.1;
    case 'wind': return -0.15;
    case 'snow': return -0.2;
    default: return 0;
  }
}

function computeLambda(input: GoalsBandInput): {
  lambdaFinal: number;
  components: GoalsBandPrediction['lambdaComponents'];
} {
  const lambdaXg = input.xgHome + input.xgAway;
  const h2hCount = input.h2hTotalGoals.length;
  const lambdaH2h = h2hCount > 0 ? input.h2hTotalGoals.reduce((s, g) => s + g, 0) / h2hCount : input.leagueAvgGoals;
  const lambdaLeague = input.leagueAvgGoals;
  const restMod = computeRestModifier(input.homeRestDays, input.awayRestDays);
  const availMod = computeAvailabilityModifier(input.homeMissingKeyPlayers, input.awayMissingKeyPlayers);
  const refMod = computeRefereeModifier(input.refereeAvgCards);
  const weatherMod = computeWeatherModifier(input.weather);
  const lambdaFinal = Math.max(0.5, 0.6 * lambdaXg + 0.25 * lambdaH2h + 0.15 * lambdaLeague + restMod + availMod + refMod + weatherMod);
  return {
    lambdaFinal,
    components: { lambdaXg, lambdaH2h, lambdaLeague, restModifier: restMod, availabilityModifier: availMod, refereeModifier: refMod, weatherModifier: weatherMod },
  };
}

function determineSignal(gatesPass: boolean, pBand: number, lambdaFinal: number): { signal: 'BET' | 'MONITOR' | 'SKIP'; yesNo: 'YES' | 'NO' } {
  if (!gatesPass) return { signal: 'SKIP', yesNo: 'NO' };
  if (pBand >= 0.44 && lambdaFinal >= 1.8 && lambdaFinal <= 3.4) return { signal: 'BET', yesNo: 'YES' };
  if (pBand >= 0.38) return { signal: 'MONITOR', yesNo: 'NO' };
  return { signal: 'SKIP', yesNo: 'NO' };
}

function assertValidInput(input: GoalsBandInput): void {
  if (input.xgHome < 0 || input.xgAway < 0) {
    console.warn('[chairmanGoalsBand] Negative xG values (home=' + input.xgHome + ', away=' + input.xgAway + ')');
  }
  if (input.leagueAvgGoals <= 0) {
    console.warn('[chairmanGoalsBand] League avg goals is ' + input.leagueAvgGoals + ' - prediction unreliable');
  }
  if (input.h2hTotalGoals.length > 0 && input.h2hTotalGoals.some((g) => g < 0)) {
    console.warn('[chairmanGoalsBand] Negative H2H goal totals detected');
  }
  if (input.homeRestDays < 0 || input.awayRestDays < 0) {
    console.warn('[chairmanGoalsBand] Negative rest days');
  }
  if (input.homeMissingKeyPlayers < 0 || input.awayMissingKeyPlayers < 0) {
    console.warn('[chairmanGoalsBand] Negative missing-player counts');
  }
}

export interface CalibrationEntry {
  timestamp: string;
  home: string;
  away: string;
  league: string;
  gates: GoalsBandPrediction['gates'];
  components: GoalsBandPrediction['lambdaComponents'];
  lambdaFinal: number;
  pBand: number;
  signal: string;
  actualTotalGoals?: number;
  correct?: boolean;
}

const calibrationLog: CalibrationEntry[] = [];

export function getCalibrationLog(): CalibrationEntry[] { return calibrationLog; }

export function logCalibration(entry: CalibrationEntry): void {
  calibrationLog.push(entry);
  if (calibrationLog.length > 500) calibrationLog.splice(0, calibrationLog.length - 500);
}

export class GoalsBandError extends Error {
  constructor(message: string, public input?: Partial<GoalsBandInput>) {
    super('[GoalsBand] ' + message);
    this.name = 'GoalsBandError';
  }
}

export function chairmanGoalsBand(input: GoalsBandInput): GoalsBandPrediction {
  assertValidInput(input);
  const gates = evaluateGates(input);
  const { lambdaFinal, components } = computeLambda(input);
  const prob2 = poissonProb(2, lambdaFinal);
  const prob3 = poissonProb(3, lambdaFinal);
  const pBand = prob2 + prob3;
  const { signal, yesNo } = determineSignal(gates.allPass, pBand, lambdaFinal);
  const prediction: GoalsBandPrediction = { signal, yesNo, confidence: pBand, lambdaFinal, prob2Goals: prob2, prob3Goals: prob3, probBand: pBand, gates, lambdaComponents: components, expectedTotalGoals: lambdaFinal };
  logCalibration({ timestamp: new Date().toISOString(), home: input.homeTeam, away: input.awayTeam, league: input.league, gates, components, lambdaFinal, pBand: pBand, signal });
  return prediction;
}
