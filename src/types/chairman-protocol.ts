// ===== Chairman's Protocol: Outlier Detection Types =====
// Flags matches with >=75% probability of total goals exceeding 4.5

// ---- Analyst Archetypes (Statistician, Scout, Observer) ----

export interface AnalystAssessment {
  agent: 'statistician' | 'scout' | 'observer';
  report: string;
  summary: string;
  findings: Record<string, unknown>;
  dataConfidence: number; // 0.0-1.0
}

export interface StatisticianFindings {
  attackingRating: number; // 0-1
  defensiveRating: number; // 0-1
  homeRecentAvgGoals: number;
  awayRecentAvgGoals: number;
  homeAvgGoalsConceded: number;
  awayAvgGoalsConceded: number;
  homeBTTSRate: number;
  awayBTTSRate: number;
  h2hAvgTotal: number;
  h2hSampleSize: number;
  leagueAvgGoals: number;
}

export interface ScoutFindings {
  topPlayers: Array<{
    name: string;
    position: string;
    xgPer90: number;
    formRating: number; // 1-10
    fitnessStatus: 'full' | 'managed' | 'doubtful' | 'out';
  }>;
  tacticalProfile: {
    buildStyle: 'long_ball' | 'mixed' | 'short_build';
    pressIntensity: 'low' | 'mid' | 'high';
    defensiveLine: 'deep' | 'mid' | 'high';
    transitionSpeed: 'slow' | 'balanced' | 'fast';
    setPieceThreat: number; // 0-10
    setPieceVulnerability: number; // 0-10
  };
  moraleIndicators: {
    managerTenureMonths: number;
    squadUnity: 'positive' | 'neutral' | 'negative';
    mediaPressure: number; // 0-1
    stakesForTeam: 'must_win' | 'important' | 'routine' | 'dead_rubber';
  };
  absences: Array<{
    position: string;
    xgContributionLost: number;
  }>;
}

export interface ObserverFindings {
  venue: {
    altitudeMetres: number;
    pitchSurface: 'grass' | 'hybrid' | 'artificial';
    pitchCondition: 'excellent' | 'good' | 'wet' | 'heavy' | 'hard';
    neutralVenue: boolean;
  };
  weather: {
    temperatureCelsius: number;
    precipitationProb: number; // 0-1
    windKph: number;
  };
  travel: {
    homeRestDays: number;
    awayRestDays: number;
    awayTravelKm: number;
    awayTimezoneShift: number;
  };
  referee: {
    yellowCardsPerMatch: number;
    redCardsPerMatch: number;
    penaltiesPerMatch: number;
    matchesOfficiated: number;
  };
  competitionContext: {
    matchdayNumber: number;
    goalDifferenceRelevance: boolean;
    scenarioSummary: string;
  };
}

// ---- Signature Stack (Section V) ----

export interface SignatureCondition {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface SignatureStackResult {
  conditions: SignatureCondition[];
  totalPassed: number;
  totalConditions: number;
  passRate: number; // 0-1
  pointsSatisfied: string[]; // list of condition IDs
}

// ---- Veto List (Section VII) ----

export interface VetoCondition {
  id: string;
  label: string;
  triggered: boolean;
  description: string;
}

export interface VetoResult {
  vetos: VetoCondition[];
  hardVetoCount: number;
  softVetoCount: number;
  isVetoed: boolean;
  effectiveMultiplier: number; // penalty factor (0-1)
  vetoesTriggered: string[]; // list of veto codes
}

// ---- Composite Confidence (Section VIII) ----

export interface ConfidenceComponents {
  baseConfidence: number; // from P(over4.5)
  gate1Score: number; // Poisson gate (35% weight)
  gate2Score: number; // Signature stack (30% weight)
  gate3Score: number; // Model spread (25% weight)
  gate4Score: number; // Veto multiplier (10% weight)
  compositeConfidence: number; // final 0-1
  confidenceLabel: 'ELEVATED' | 'MODERATE' | 'BASELINE';
}

// ---- Relevance Index (Section VI) ----

export interface RelevanceIndex {
  relevanceScore: number; // 0-10
  tier: 'STRONG' | 'ELEVATED' | 'MODERATE' | 'LOW';
}

// ---- Match Context Modifiers ----

export interface MatchModifiers {
  restModifier: number; // multiplier on total lambda
  availabilityModifier: number;
  weatherModifier: number;
  refereeModifier: number;
}

// ---- Fixture Summary ----

export interface FixtureSummary {
  homeTeam: string;
  awayTeam: string;
  league: string;
}

// ---- Main Report ----

export interface ChairmanOutlierReport {
  fixture: FixtureSummary;
  status: 'ELEVATED' | 'MODERATE' | 'BASELINE';
  statusReason: string;

  // Core stats
  lambdaHome: number;
  lambdaAway: number;
  totalLambda: number;
  probOver4_5: number;
  referenceProb: number;
  modelSpread: number; // percentage points

  // Pipeline results
  signatures: SignatureStackResult;
  vetos: VetoResult;
  confidence: ConfidenceComponents;
  relevance: RelevanceIndex;

  // Analyst inputs
  statistician: AnalystAssessment;
  scout: AnalystAssessment;
  observer: AnalystAssessment;

  // Modifiers
  modifiers: MatchModifiers;

  // Summary
  primaryDrivers: string[];
  primaryRisks: string[];
  reasoningSummary: string;
  dataConfidenceComposite: number;
}
