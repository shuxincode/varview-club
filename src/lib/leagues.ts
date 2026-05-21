// VARview.club League Registry
// API-Football v3 league IDs with seasonal offset configurations
// Seasonal offsets ensure the Dixon-Coles model doesn't mix data from different football years

export interface LeagueConfig {
  id: number;
  name: string;
  region: Region;
  seasonStartMonth: number;  // Month the season typically starts (1-12)
  seasonEndMonth: number;    // Month the season typically ends (1-12)
  // Summer leagues (Mar-Nov) vs Winter leagues (Aug-May)
  // This affects which "football year" a match belongs to
  hemisphere: 'northern_summer' | 'northern_winter' | 'southern_summer' | 'southern_winter' | 'global';
  worldCupYear?: number;     // For World Cup-specific config
}

export type Region =
  | 'south_america'
  | 'europe'
  | 'scandinavia'
  | 'north_america'
  | 'asia'
  | 'oceania'
  | 'global';

// Full league registry as specified in Master Build Prompt Phase B
export const LEAGUES: Record<string, LeagueConfig> = {
  // South America
  libertadores: { id: 13, name: 'Copa Libertadores', region: 'south_america', seasonStartMonth: 1, seasonEndMonth: 12, hemisphere: 'southern_summer' },
  sudamericana: { id: 11, name: 'Copa Sudamericana', region: 'south_america', seasonStartMonth: 1, seasonEndMonth: 12, hemisphere: 'southern_summer' },

  // Europe
  epl: { id: 39, name: 'Premier League', region: 'europe', seasonStartMonth: 8, seasonEndMonth: 5, hemisphere: 'northern_winter' },
  championship: { id: 40, name: 'Championship', region: 'europe', seasonStartMonth: 8, seasonEndMonth: 5, hemisphere: 'northern_winter' },
  ligue1: { id: 61, name: 'Ligue 1', region: 'europe', seasonStartMonth: 8, seasonEndMonth: 5, hemisphere: 'northern_winter' },
  serieA: { id: 135, name: 'Serie A', region: 'europe', seasonStartMonth: 8, seasonEndMonth: 5, hemisphere: 'northern_winter' },
  bundesliga: { id: 78, name: 'Bundesliga', region: 'europe', seasonStartMonth: 8, seasonEndMonth: 5, hemisphere: 'northern_winter' },
  laLiga: { id: 140, name: 'La Liga', region: 'europe', seasonStartMonth: 8, seasonEndMonth: 5, hemisphere: 'northern_winter' },

  // Scandinavia (summer leagues)
  eliteserien: { id: 103, name: 'Eliteserien', region: 'scandinavia', seasonStartMonth: 4, seasonEndMonth: 11, hemisphere: 'northern_summer' },
  allsvenskan: { id: 113, name: 'Allsvenskan', region: 'scandinavia', seasonStartMonth: 4, seasonEndMonth: 11, hemisphere: 'northern_summer' },

  // Americas (summer leagues)
  mls: { id: 253, name: 'MLS', region: 'north_america', seasonStartMonth: 2, seasonEndMonth: 10, hemisphere: 'northern_summer' },
  argentinaPrimera: { id: 128, name: 'Liga Profesional Argentina', region: 'south_america', seasonStartMonth: 1, seasonEndMonth: 12, hemisphere: 'southern_summer' },
  chilePrimera: { id: 265, name: 'Chile Primera División', region: 'south_america', seasonStartMonth: 1, seasonEndMonth: 12, hemisphere: 'southern_summer' },

  // Asia/Oceania
  j1League: { id: 98, name: 'J1 League', region: 'asia', seasonStartMonth: 3, seasonEndMonth: 11, hemisphere: 'northern_summer' },
  kLeague1: { id: 292, name: 'K League 1', region: 'asia', seasonStartMonth: 3, seasonEndMonth: 11, hemisphere: 'northern_summer' },
  aLeagueMen: { id: 188, name: 'A-League Men', region: 'oceania', seasonStartMonth: 10, seasonEndMonth: 5, hemisphere: 'southern_winter' },
  aLeagueWomen: { id: 189, name: 'A-League Women', region: 'oceania', seasonStartMonth: 10, seasonEndMonth: 5, hemisphere: 'southern_winter' },

  // Global
  worldCup2026: { id: 2000, name: 'World Cup 2026', region: 'global', seasonStartMonth: 6, seasonEndMonth: 7, hemisphere: 'global', worldCupYear: 2026 },
};

/**
 * Determine which "football year" a match date belongs to based on league seasonal offset.
 * Winter leagues (Aug-May): football year = calendar year if month >= Aug, else calendar year - 1
 *   Example: Jan 2025 match in EPL → football year 2024/25
 * Summer leagues (Mar-Nov): football year = calendar year
 *   Example: Jul 2025 match in MLS → football year 2025
 */
export function getFootballYear(date: Date, league: LeagueConfig): string {
  const month = date.getMonth() + 1; // 1-indexed

  switch (league.hemisphere) {
    case 'northern_winter': {
      // Season spans across calendar years, e.g., Aug 2024 - May 2025
      if (month >= league.seasonStartMonth) {
        // Aug-Dec: this is the START of the football year
        return `${date.getFullYear()}/${date.getFullYear() + 1}`;
      } else {
        // Jan-May: this is the END of the football year
        return `${date.getFullYear() - 1}/${date.getFullYear()}`;
      }
    }
    case 'northern_summer': {
      // Season is within a calendar year, e.g., Mar-Nov
      if (month >= league.seasonStartMonth || month <= league.seasonEndMonth) {
        return `${date.getFullYear()}`;
      }
      // Off-season: assign to the upcoming season
      return `${date.getFullYear()}`;
    }
    case 'southern_summer': {
      // Calendar year season
      return `${date.getFullYear()}`;
    }
    case 'southern_winter': {
      // A-League: Oct-May, spans calendar years
      if (month >= league.seasonStartMonth) {
        return `${date.getFullYear()}/${date.getFullYear() + 1}`;
      } else {
        return `${date.getFullYear() - 1}/${date.getFullYear()}`;
      }
    }
    case 'global': {
      // World Cup: single year
      return `${league.worldCupYear || date.getFullYear()}`;
    }
    default:
      return `${date.getFullYear()}`;
  }
}

/**
 * Check if a fixture from one league should have its data mixed with another.
 * Two fixtures should only be compared if they belong to the same football year.
 */
export function isSameFootballYear(date1: Date, date2: Date, league: LeagueConfig): boolean {
  return getFootballYear(date1, league) === getFootballYear(date2, league);
}

/**
 * Get the active season range for a league based on its offset.
 * Returns { start, end } as month/day tuples.
 */
export function getActiveSeasonRange(league: LeagueConfig): { start: { m: number; d: number }; end: { m: number; d: number } } {
  const ranges: Record<string, { start: { m: number; d: number }; end: { m: number; d: number } }> = {
    // Winter leagues (Aug-May)
    northern_winter: { start: { m: 8, d: 1 }, end: { m: 5, d: 31 } },
    // Summer leagues (Mar-Nov)
    northern_summer: { start: { m: 3, d: 1 }, end: { m: 11, d: 30 } },
    // Southern summer (Jan-Dec)
    southern_summer: { start: { m: 1, d: 1 }, end: { m: 12, d: 31 } },
    // Southern winter (Oct-May)
    southern_winter: { start: { m: 10, d: 1 }, end: { m: 5, d: 31 } },
    // Global/World Cup (Jun-Jul)
    global: { start: { m: 6, d: 1 }, end: { m: 7, d: 31 } },
  };

  return ranges[league.hemisphere] || ranges.northern_winter;
}

/**
 * Get combined list of all monitored league IDs for batch fetching.
 */
export function getAllLeagueIds(): number[] {
  return Object.values(LEAGUES).map((l) => l.id);
}

/**
 * Get leagues that are in-season on a given date.
 */
export function getActiveLeaguesForDate(date: Date): LeagueConfig[] {
  const month = date.getMonth() + 1;

  return Object.values(LEAGUES).filter((league) => {
    const range = getActiveSeasonRange(league);

    // Handle cross-year ranges
    if (range.start.m <= range.end.m) {
      // Same-year range: Apr-Nov
      return month >= range.start.m && month <= range.end.m;
    } else {
      // Cross-year range: Aug-May
      return month >= range.start.m || month <= range.end.m;
    }
  });
}
