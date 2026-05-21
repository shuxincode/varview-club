/**
 * Team attack/defense strength ratings used as preview defaults when
 * external data sources (prediction engine, AI web search) are unavailable.
 *
 * Rating scale: 0.6 (weak) → 2.2 (strong). League-average ≈ 1.2.
 * attack = expected goals scored per match
 * defense = expected goals conceded per match
 */

export interface TeamRating {
  attack: number;
  defense: number;
}

const TEAM_RATINGS: Record<string, TeamRating> = {
  // — Premier League 2025-26 —
  "Manchester City":       { attack: 2.0, defense: 0.8 },
  "Liverpool":             { attack: 1.9, defense: 0.9 },
  "Arsenal":               { attack: 1.8, defense: 0.8 },
  "Chelsea":               { attack: 1.7, defense: 1.0 },
  "Tottenham Hotspur":     { attack: 1.7, defense: 1.1 },
  "Newcastle United":      { attack: 1.6, defense: 1.0 },
  "Aston Villa":           { attack: 1.6, defense: 1.1 },
  "Manchester United":     { attack: 1.5, defense: 1.1 },
  "West Ham United":       { attack: 1.4, defense: 1.2 },
  "Brighton & Hove Albion":{ attack: 1.5, defense: 1.2 },
  "Nottingham Forest":     { attack: 1.3, defense: 1.1 },
  "Crystal Palace":        { attack: 1.2, defense: 1.1 },
  "Brentford":             { attack: 1.3, defense: 1.3 },
  "Fulham":                { attack: 1.2, defense: 1.3 },
  "Bournemouth":           { attack: 1.3, defense: 1.4 },
  "Everton":               { attack: 1.0, defense: 1.2 },
  "Wolverhampton Wanderers":{ attack: 1.1, defense: 1.4 },
  "Ipswich Town":          { attack: 1.1, defense: 1.5 },
  "Leicester City":        { attack: 1.1, defense: 1.5 },
  "Southampton":           { attack: 1.0, defense: 1.5 },

  // — Bundesliga —
  "Bayern Munich":         { attack: 2.1, defense: 0.8 },
  "Borussia Dortmund":     { attack: 1.8, defense: 1.1 },
  "RB Leipzig":            { attack: 1.6, defense: 1.0 },
  "Bayer Leverkusen":      { attack: 1.7, defense: 1.0 },
  "Eintracht Frankfurt":   { attack: 1.4, defense: 1.2 },
  "VfB Stuttgart":         { attack: 1.4, defense: 1.3 },
  "Borussia Mönchengladbach": { attack: 1.3, defense: 1.3 },

  // — La Liga —
  "Real Madrid":           { attack: 2.0, defense: 0.8 },
  "Barcelona":             { attack: 1.9, defense: 0.9 },
  "Atletico Madrid":       { attack: 1.5, defense: 0.8 },
  "Athletic Bilbao":       { attack: 1.3, defense: 1.0 },
  "Real Sociedad":         { attack: 1.3, defense: 1.1 },
  "Villarreal":            { attack: 1.4, defense: 1.3 },
  "Valencia":              { attack: 1.2, defense: 1.2 },
  "Sevilla":               { attack: 1.2, defense: 1.3 },
  "Real Betis":            { attack: 1.2, defense: 1.2 },

  // — Serie A —
  "Inter Milan":           { attack: 1.8, defense: 0.8 },
  "AC Milan":              { attack: 1.6, defense: 1.0 },
  "Juventus":              { attack: 1.5, defense: 0.9 },
  "Napoli":                { attack: 1.6, defense: 1.0 },
  "Atalanta":              { attack: 1.7, defense: 1.1 },
  "Lazio":                 { attack: 1.4, defense: 1.1 },
  "Roma":                  { attack: 1.4, defense: 1.2 },
  "Fiorentina":            { attack: 1.3, defense: 1.2 },

  // — Ligue 1 —
  "Paris Saint-Germain":   { attack: 2.2, defense: 0.8 },
  "Marseille":             { attack: 1.5, defense: 1.1 },
  "Monaco":                { attack: 1.5, defense: 1.1 },
  "Lyon":                  { attack: 1.4, defense: 1.2 },
  "Lille":                 { attack: 1.3, defense: 1.1 },
  "Nice":                  { attack: 1.2, defense: 1.1 },

  // — Eredivisie —
  "Ajax":                  { attack: 1.8, defense: 1.0 },
  "PSV":                   { attack: 1.9, defense: 1.0 },
  "Feyenoord":             { attack: 1.7, defense: 1.0 },

  // — Primeira Liga —
  "Benfica":               { attack: 1.7, defense: 0.9 },
  "Porto":                 { attack: 1.6, defense: 0.9 },
  "Sporting CP":           { attack: 1.7, defense: 0.9 },

  // — Other known teams —
  "Celtic":                { attack: 1.8, defense: 0.9 },
  "Rangers":               { attack: 1.6, defense: 1.0 },
  "Club Brugge":           { attack: 1.5, defense: 1.1 },
  "Galatasaray":           { attack: 1.6, defense: 1.1 },
  "Fenerbahçe":            { attack: 1.5, defense: 1.1 },
  "Shakhtar Donetsk":      { attack: 1.4, defense: 1.1 },
  "Dinamo Zagreb":         { attack: 1.4, defense: 1.0 },
  "Red Star Belgrade":     { attack: 1.4, defense: 1.0 },
  "FC Copenhagen":         { attack: 1.3, defense: 1.1 },
  "Salzburg":              { attack: 1.4, defense: 1.1 },
  "Slavia Prague":         { attack: 1.3, defense: 1.0 },
  "Bodo/Glimt":            { attack: 1.5, defense: 1.2 },
  "Molde":                 { attack: 1.3, defense: 1.2 },
  "Malmo FF":              { attack: 1.4, defense: 1.1 },
};

const LEAGUE_AVERAGE: TeamRating = { attack: 1.2, defense: 1.2 };

/**
 * League scoring context — adjusts expected goals based on the league's
 * historical goal rate. Applied as a multiplier to combined λ.
 */
const LEAGUE_COEFFICIENTS: Record<string, number> = {
  "Premier League": 1.05,
  "Bundesliga": 1.08,
  "La Liga": 0.95,
  "Ligue 1": 0.98,
  "Serie A": 0.92,
  "Eredivisie": 1.10,
  "Championship": 0.95,
  "Primeira Liga": 0.96,
  "Jupiler Pro League": 0.94,
  "Scottish Premiership": 1.02,
  "Süper Lig": 1.06,
  "Russian Premier League": 0.93,
  "Saudi Pro League": 1.04,
};

/** Home advantage bonus — applied as multiplier to λ_home */
const HOME_ADVANTAGE = 1.10;

/**
 * Look up a team's strength rating by name (case-insensitive).
 * Returns the raw rating or a league-average fallback.
 */
export function getTeamRating(teamName: string): TeamRating {
  const lower = teamName.toLowerCase().trim();

  // Try exact match first
  for (const [canonical, rating] of Object.entries(TEAM_RATINGS)) {
    if (canonical.toLowerCase() === lower) return rating;
  }

  // Try normalized match using aliases from chairman-goals-band
  try {
    const { normalizeTeamName } = require('./chairman-goals-band');
    const normalized = normalizeTeamName(teamName);
    if (normalized !== teamName) {
      const rating = TEAM_RATINGS[normalized];
      if (rating) return rating;
    }
  } catch {
    // fall through
  }

  // Unknown team — return average. Jitter slightly by name length for at least
  // some visual variation across unknown teams.
  const jitter = (teamName.length % 5) * 0.1 - 0.2; // -0.2 to +0.2
  return {
    attack: Math.max(0.8, Math.min(1.6, LEAGUE_AVERAGE.attack + jitter)),
    defense: Math.max(0.8, Math.min(1.6, LEAGUE_AVERAGE.defense - jitter * 0.5)),
  };
}

/**
 * Estimate λ_home and λ_away for a fixture using team strength ratings.
 * Formula: λ_home = home_attack * away_defense * league_base
 *          λ_away = away_attack * home_defense * league_base
 * where league_base ≈ 0.85 (scaling factor to keep λ in realistic range)
 */
export function estimateLambdas(homeTeam: string, awayTeam: string, league?: string): { lambdaHome: number; lambdaAway: number } {
  const home = getTeamRating(homeTeam);
  const away = getTeamRating(awayTeam);

  // Base expected goals: attack * opposing defense * base scaling factor
  const BASE = 0.85;

  // League scoring context — adjusts for historically higher/lower scoring leagues
  const leagueCoeff = league ? (LEAGUE_COEFFICIENTS[league] ?? 1.0) : 1.0;

  // Home advantage boost (~10% more goals for home side)
  let lambdaHome = Math.round(((home.attack * away.defense * BASE) * leagueCoeff * HOME_ADVANTAGE) * 100) / 100;
  let lambdaAway = Math.round(((away.attack * home.defense * BASE) * leagueCoeff) * 100) / 100;

  return {
    lambdaHome: Math.max(0.5, Math.min(3.5, lambdaHome)),
    lambdaAway: Math.max(0.3, Math.min(3.0, lambdaAway)),
  };
}
