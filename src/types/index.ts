// ===== Supabase Database Types =====

export interface Profile {
  id: string;
  email: string;
  username?: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export type FixtureStatus = 'scheduled' | 'in_play' | 'finished' | 'postponed' | 'cancelled';

export interface Fixture {
  id: number;
  api_fixture_id: number;
  league_id: number;
  league_name: string;
  season: number;
  round?: string;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  venue?: string;
  status: FixtureStatus;
  scheduled_date: string;
  home_goals?: number;
  away_goals?: number;
  home_ht_goals?: number;
  away_ht_goals?: number;
  created_at: string;
  updated_at: string;
}

export interface AIAnalysis {
  id: string;
  fixture_id: number;
  chairman_signed: boolean;
  chairman_report?: string;
  analyst_a_report?: string;
  analyst_b_report?: string;
  analyst_c_report?: string;
  // 4 Pillars
  total_goals_prediction: 'over_2.5' | 'under_2.5';
  total_goals_confidence: number;
  btts_prediction: 'yes' | 'no';
  btts_confidence: number;
  winner_prediction: 'home' | 'away' | 'draw';
  winner_confidence: number;
  first_half_goals_prediction: 'over_0.5' | 'under_0.5';
  first_half_goals_confidence: number;
  // Dixon-Coles outputs
  lambda_home: number;
  lambda_away: number;
  // Bayesian confidence interval
  confidence_interval_low: number;
  confidence_interval_high: number;
  // Results (populated post-match)
  success_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface UserPrediction {
  id: string;
  user_id: string;
  fixture_id: number;
  total_goals_prediction: 'over_2.5' | 'under_2.5';
  btts_prediction: 'yes' | 'no';
  winner_prediction: 'home' | 'away' | 'draw';
  first_half_goals_prediction: 'over_0.5' | 'under_0.5';
  is_correct?: boolean;
  created_at: string;
}

// ===== API Types =====

export interface FixtureSearchResult {
  id: number;
  home_team: string;
  away_team: string;
  league_name: string;
  scheduled_date: string;
  home_logo?: string;
  away_logo?: string;
  status: FixtureStatus;
}

export interface RevealedAnalysis {
  analysis: AIAnalysis;
  fixture: Fixture;
}

export interface DailyTabulation {
  date: string;
  total_picks: number;
  correct_picks: number;
  success_rate: number;
  chairman_signed: boolean;
}

// ===== Agent Types =====

export interface AgentReport {
  agent: 'chairman' | 'analyst_a' | 'analyst_b' | 'analyst_c';
  report: string;
  findings: Record<string, unknown>;
  risk_flags?: string[];
}

export interface ChairmanVerdict {
  selected: boolean;
  veto: boolean;
  veto_reason?: string;
  final_confidence: number;
}

