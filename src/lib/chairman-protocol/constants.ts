// ===== Chairman's Protocol: Constants & Thresholds =====

// --- Confidence Thresholds ---
export const ELEVATED_THRESHOLD = 0.75;
export const MODERATE_THRESHOLD = 0.60;

// --- Gate 1: Poisson Threshold ---
export const POISSON_P_OVER_45_THRESHOLD = 0.42;

// --- Signature Stack (Section V) ---
export const SIG_TWIN_ATTACK_THRESHOLD = 1.6; // both teams adjusted_lambda_attack >= this
export const SIG_TWIN_DEFENSE_THRESHOLD = 1.3; // both teams xG conceded >= this
export const SIG_GOALKEEPER_WEAK_THRESHOLD = -0.10; // PSxG - goals <= this
export const SIG_H2H_AVG_THRESHOLD = 3.2; // h2h avg total goals >= this
export const SIG_H2H_MIN_MATCHES = 4;
export const SIG_SET_PIECE_THRESHOLD = 7.0; // threat or vulnerability >= this
export const SIG_ABSENCE_XG_THRESHOLD = 0.40; // xG lost from defensive absences
export const SIG_REF_PENALTY_THRESHOLD = 0.30; // penalties per match
export const SIG_MIN_SCORE = 7; // minimum points for 75% flag

// --- Model Spread ---
export const MODEL_SPREAD_THRESHOLD = 0.12; // +12 percentage points

// --- Weather Veto ---
export const VETO_WIND_MAX = 35; // kph
export const VETO_PRECIP_MAX = 0.70;
export const VETO_ALTITUDE_MAX = 2500; // metres

// --- League Base Goal Rates ---
export const LEAGUE_BASE_GOAL_RATES: Record<string, number> = {
  'Premier League': 2.85,
  'Bundesliga': 3.22,
  'Serie A': 2.65,
  'La Liga': 2.52,
  'Ligue 1': 2.78,
  'Eredivisie': 3.12,
  'Primeira Liga': 2.55,
  'Championship': 2.60,
  'MLS': 2.95,
  'J1 League': 2.70,
  'K League 1': 2.40,
  'A-League': 2.65,
  'Super Lig': 2.80,
  'Pro League': 2.50,
  'Super League': 2.45,
  'Brasileiro Serie A': 2.30,
  'Primera Division': 2.20,
  'Liga MX': 2.55,
  'Russian Premier League': 2.35,
  'Champions League': 2.90,
  'Europa League': 2.75,
  'Conference League': 2.60,
  'World Cup': 2.50,
  'European Championship': 2.40,
  'Copa America': 2.20,
  'AFC Asian Cup': 2.10,
  'Africa Cup of Nations': 2.00,
};

export const DEFAULT_LEAGUE_GOAL_RATE = 2.60;

// --- Composite Confidence Weights (Section VIII) ---
export const GATE1_WEIGHT = 0.35; // Poisson P(over4.5)
export const GATE2_WEIGHT = 0.30; // Signature stack
export const GATE3_WEIGHT = 0.25; // Model spread
export const GATE4_WEIGHT = 0.10; // Veto multiplier

// --- Signature Condition Definitions ---
export const SIGNATURE_DEFINITIONS = [
  { id: 'SIG_01', label: 'Twin attack signal (both teams lambda >= 1.6)' },
  { id: 'SIG_02', label: 'Twin defensive vulnerability (both xGA >= 1.3)' },
  { id: 'SIG_03', label: 'Goalkeeper weakness (PSxG - goals <= -0.10)' },
  { id: 'SIG_04', label: 'Historical H2H signature (avg >= 3.2, n >= 4)' },
  { id: 'SIG_05', label: 'Stakes alignment (both teams need result)' },
  { id: 'SIG_06', label: 'Tactical mismatch (press vs build/transition vs line)' },
  { id: 'SIG_07', label: 'Set-piece asymmetry (threat vs vulnerability >= 7)' },
  { id: 'SIG_08', label: 'Environment permits (pitch, wind, precip)' },
  { id: 'SIG_09', label: 'Key defensive absences (xG lost >= 0.40)' },
  { id: 'SIG_10', label: 'Referee tendency (penalties >= 0.30, lenient)' },
] as const;

// --- Veto Definitions ---
export const VETO_DEFINITIONS = [
  { id: 'VETO_01', label: 'Dead rubber mismatch (one team checked out)' },
  { id: 'VETO_02', label: 'Adverse conditions (heavy pitch, wind > 35kph, precip > 70%)' },
  { id: 'VETO_03', label: 'Both teams defensive (deep line + slow transition)' },
  { id: 'VETO_04', label: 'Multiple key absences (>= 2 of top-5 outfield out)' },
  { id: 'VETO_05', label: 'Friendly after major tournament (rotation risk)' },
  { id: 'VETO_06', label: 'High-friction referee (strict cards + stoppage time)' },
  { id: 'VETO_07', label: 'Thin market with contradictory line movement' },
  { id: 'VETO_08', label: 'Altitude > 2,500m with unprepared visitors' },
] as const;
