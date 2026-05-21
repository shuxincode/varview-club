/**
 * Utility functions for synthesizing required DB fields that the
 * Flashscore scraper doesn't natively provide.
 */
import { LEAGUES } from '@/lib/leagues';

// ── League name mapping ──
// Flashscore returns display names; we need to map them to LEAGUES keys.
const LEAGUE_NAME_TO_KEY: Record<string, string> = {
  'premier league': 'epl',
  'championship': 'championship',
  'ligue 1': 'ligue1',
  'ligue1': 'ligue1',
  'serie a': 'serieA',
  'serie a brasil': 'serieA', // not in registry, map to similar
  'serie b': 'championship', // approximate
  'bundesliga': 'bundesliga',
  '2. bundesliga': 'bundesliga', // approximate
  'laliga': 'laLiga',
  'la liga': 'laLiga',
  'eredivisie': 'epl', // approximate, not in our registry
  'primeira liga': 'ligue1', // approximate
  'mls': 'mls',
  'eliteserien': 'eliteserien',
  'allsvenskan': 'allsvenskan',
  'libertadores': 'libertadores',
  'copa libertadores': 'libertadores',
  'sudamericana': 'sudamericana',
  'copa sudamericana': 'sudamericana',
  'argentina primera': 'argentinaPrimera',
  'liga profesional argentina': 'argentinaPrimera',
  'chile primera': 'chilePrimera',
  'chile primera division': 'chilePrimera',
  'j1 league': 'j1League',
  'j.league': 'j1League',
  'k league 1': 'kLeague1',
  'a-league': 'aLeagueMen',
  'serie brasil': 'epl', // unknown -> default
};

function findLeagueKey(leagueName: string): string | undefined {
  const normalized = leagueName.trim().toLowerCase();
  if (LEAGUE_NAME_TO_KEY[normalized]) return LEAGUE_NAME_TO_KEY[normalized];
  // Try matching against LEAGUES names directly
  for (const [key, config] of Object.entries(LEAGUES)) {
    if (config.name.toLowerCase() === normalized) return key;
  }
  return undefined;
}

/**
 * Convert a string to a deterministic positive 32-bit integer.
 * Uses FNV-1a hash for good distribution.
 */
export function hashString(str: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return Math.abs(hash) % 0x7fffffff; // stay in positive 31-bit range
}

/**
 * Synthesize a unique api_fixture_id from team names and date.
 * Uses FNV-1a hash of "homeTeam|awayTeam|YYYY-MM-DD".
 * Deterministic — same teams+date always produces the same ID.
 */
export function hashApiFixtureId(homeTeam: string, awayTeam: string, dateStr: string): number {
  const raw = `${homeTeam.toLowerCase().trim()}|${awayTeam.toLowerCase().trim()}|${dateStr.split('T')[0]}`;
  return hashString(raw);
}

/**
 * Resolve a numeric league ID from a league name string.
 * Looks up the LEAGUES registry via fuzzy name matching.
 * Falls back to 0 for unknown leagues.
 */
export function resolveLeagueId(leagueName: string): number {
  const key = findLeagueKey(leagueName);
  if (key) return LEAGUES[key].id;
  return 0;
}

/**
 * Derive the calendar year season for a fixture date.
 */
export function deriveSeason(scheduledDate: string): number {
  return new Date(scheduledDate).getFullYear();
}

/**
 * Build an upsert-ready fixture row from scraped fixture data.
 */
export function buildFixtureRow(scraped: {
  home_team: string;
  away_team: string;
  league_name: string;
  scheduled_date: string;
  status: string;
  time?: string;
  home_score?: string | null;
  away_score?: string | null;
}): {
  api_fixture_id: number;
  league_id: number;
  league_name: string;
  season: number;
  home_team: string;
  away_team: string;
  status: string;
  scheduled_date: string;
  home_goals: number | null;
  away_goals: number | null;
} {
  const api_fixture_id = hashApiFixtureId(scraped.home_team, scraped.away_team, scraped.scheduled_date);
  const league_id = resolveLeagueId(scraped.league_name);

  return {
    api_fixture_id,
    league_id,
    league_name: scraped.league_name,
    season: deriveSeason(scraped.scheduled_date),
    home_team: scraped.home_team,
    away_team: scraped.away_team,
    status: scraped.status,
    scheduled_date: scraped.scheduled_date,
    home_goals: scraped.home_score != null ? parseInt(scraped.home_score, 10) || null : null,
    away_goals: scraped.away_score != null ? parseInt(scraped.away_score, 10) || null : null,
  };
}
