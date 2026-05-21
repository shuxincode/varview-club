// FotMob API client — live xG, possession, dangerous attacks, and match minute

import type { FotMobMatchDetailsResponse, FotMobSearchResult, FotMobTeamPage } from './live-state';

// ── Team name aliases tuned for FotMob naming conventions ──

const FOTMOB_TEAM_ALIASES: Record<string, string[]> = {
  'Manchester United': ['man united', 'man utd', 'mu', 'mufc', 'manchester utd', 'manchester united'],
  'Manchester City': ['man city', 'mci', 'man. city', 'mancity', 'manchester city'],
  Liverpool: ['liverpool fc', 'lfc', 'liverpool f.c.'],
  Arsenal: ['arsenal fc', 'afc', 'arsenal f.c.'],
  Chelsea: ['chelsea fc', 'cfc', 'chelsea f.c.'],
  'Tottenham Hotspur': ['tottenham', 'spurs', 'thfc', 'tottenham hotspur fc', 'tottenham'],
  'Newcastle United': ['newcastle', 'nufc', 'newcastle utd', 'newcastle united fc'],
  'Aston Villa': ['aston villa fc', 'avfc', 'villa'],
  'West Ham United': ['west ham', 'whu', 'west ham utd', 'west ham united fc'],
  'Wolverhampton Wanderers': ['wolves', 'wolverhampton', 'wwfc'],
  'Brighton & Hove Albion': ['brighton', 'bhafc'],
  'Crystal Palace': ['palace', 'cpfc'],
  Everton: ['everton fc', 'efc'],
  Fulham: ['fulham fc', 'ffc'],
  Brentford: ['brentford fc', 'bec'],
  'Nottingham Forest': ['nottingham', 'nffc', 'notts forest'],
  Bournemouth: ['afc bournemouth', 'bournemouth fc'],
  'Leicester City': ['leicester', 'lcfc', 'leicester city fc'],
  Southampton: ['southampton fc', 'sfc'],
  'Bayern Munich': ['bayern', 'fc bayern', 'bayern munchen', 'bayern munich', 'fc bayern münchen'],
  'Borussia Dortmund': ['dortmund', 'bvb', 'bvb dortmund'],
  Barcelona: ['fc barcelona', 'barca', 'barcelona'],
  'Real Madrid': ['real madrid cf', 'rmcf', 'madrid', 'real madrid'],
  'Atletico Madrid': ['atletico madrid', 'atleti', 'atlético madrid'],
  'Paris Saint-Germain': ['psg', 'paris sg', 'paris saint-germain'],
  'Inter Milan': ['inter', 'inter milan', 'fc internazionale', 'internazionale'],
  'AC Milan': ['ac milan', 'milan'],
  Juventus: ['juventus fc', 'juve'],
};

// ── Cache ──

interface CachedMapping {
  fotmobTeamId: number;
  canonicalName: string;
  expiresAt: number;
}

const teamCache = new Map<string, CachedMapping>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Rate limiter ──

let fotmobRequestTimestamps: number[] = [];
const MAX_REQUESTS = 10;
const WINDOW_MS = 10_000;

function checkFotmobRateLimit(): boolean {
  const now = Date.now();
  fotmobRequestTimestamps = fotmobRequestTimestamps.filter(t => now - t < WINDOW_MS);
  if (fotmobRequestTimestamps.length >= MAX_REQUESTS) return false;
  fotmobRequestTimestamps.push(now);
  return true;
}

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function fuzzyMatch(query: string, candidates: Array<{ id: number; name: string }>): { id: number; name: string } | null {
  const q = normalize(query);

  // Exact match first
  const exact = candidates.find(c => normalize(c.name) === q);
  if (exact) return exact;

  // Check aliases
  for (const [canonical, aliases] of Object.entries(FOTMOB_TEAM_ALIASES)) {
    const normalCanonical = normalize(canonical);
    if (q === normalCanonical) {
      const byAlias = candidates.find(c => normalize(c.name) === normalCanonical);
      if (byAlias) return byAlias;
    }
    for (const alias of aliases) {
      if (q === normalize(alias) || q.includes(normalize(alias)) || normalize(alias).includes(q)) {
        const byAlias = candidates.find(c => normalize(c.name) === normalCanonical);
        if (byAlias) return byAlias;
      }
    }
  }

  // Substring match
  const bySubstring = candidates.find(c => {
    const cn = normalize(c.name);
    return cn.includes(q) || q.includes(cn);
  });
  if (bySubstring) return bySubstring;

  return null;
}

/**
 * Resolve a team name to a FotMob team ID.
 */
export async function resolveTeamName(
  teamName: string
): Promise<{ fotmobTeamId: number; canonicalName: string } | null> {
  const cacheKey = normalize(teamName);

  // Check cache
  const cached = teamCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return { fotmobTeamId: cached.fotmobTeamId, canonicalName: cached.canonicalName };
  }

  // Rate limit
  if (!checkFotmobRateLimit()) return null;

  try {
    const res = await fetch(
      `https://www.fotmob.com/api/search?q=${encodeURIComponent(teamName)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const teams: Array<{ id: number; name: string }> = data?.teams ?? [];

    if (teams.length === 0) return null;

    const match = fuzzyMatch(teamName, teams);
    if (!match) return null;

    teamCache.set(cacheKey, {
      fotmobTeamId: match.id,
      canonicalName: match.name,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return { fotmobTeamId: match.id, canonicalName: match.name };
  } catch {
    return null;
  }
}

/**
 * Find active FotMob match ID for a given home/away pairing.
 */
export async function findFotmobMatchId(
  homeTeam: string,
  awayTeam: string
): Promise<number | null> {
  const home = await resolveTeamName(homeTeam);
  if (!home) return null;

  if (!checkFotmobRateLimit()) return null;

  try {
    const res = await fetch(
      `https://www.fotmob.com/api/teamDetails?id=${home.fotmobTeamId}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;

    const data: FotMobTeamPage = await res.json();
    const matches = data?.matches ?? [];

    const normAway = normalize(awayTeam);
    const liveMatch = matches.find(m => {
      if (m.status !== 'live' && m.status !== 'inprogress') return false;
      const opponent = m.home.name && normalize(m.home.name) !== normalize(home.canonicalName)
        ? m.home.name
        : m.away.name;
      return normalize(opponent) === normAway || normalize(opponent).includes(normAway) || normAway.includes(normalize(opponent));
    });

    return liveMatch?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch live match data from FotMob (xG, attacks, possession, minute).
 */
export async function fetchFotmobLiveData(
  fotmobMatchId: number
): Promise<{
  liveXg: { home: number; away: number } | null;
  dangerousAttacks: { home: number; away: number } | null;
  possession: { home: number; away: number } | null;
  redCards: { home: number; away: number };
  minute: number | null;
} | null> {
  if (!checkFotmobRateLimit()) return null;

  try {
    const res = await fetch(
      `https://www.fotmob.com/api/matchDetails?id=${fotmobMatchId}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;

    const data: FotMobMatchDetailsResponse = await res.json();
    const stats = data?.stats;
    if (!stats) return null;

    // Parse xG — FotMob may use "expectedGoals" or "xG" key
    let liveXg: { home: number; away: number } | null = null;
    if (stats.expectedGoals) {
      liveXg = {
        home: parseFloat(stats.expectedGoals.home) || 0,
        away: parseFloat(stats.expectedGoals.away) || 0,
      };
    }

    // Parse dangerous attacks
    let dangerousAttacks: { home: number; away: number } | null = null;
    if (stats.dangerousAttacks) {
      dangerousAttacks = {
        home: parseInt(stats.dangerousAttacks.home) || 0,
        away: parseInt(stats.dangerousAttacks.away) || 0,
      };
    }

    // Parse possession
    let possession: { home: number; away: number } | null = null;
    if (stats.possession) {
      possession = {
        home: parseInt(stats.possession.home) || 50,
        away: parseInt(stats.possession.away) || 50,
      };
    }

    // Parse minute from liveTime
    let minute: number | null = null;
    const liveTime = data?.general?.liveTime?.short;
    if (liveTime) {
      const parsed = parseInt(liveTime.replace(/'/, ''));
      if (!isNaN(parsed)) minute = parsed;
    }

    return {
      liveXg,
      dangerousAttacks,
      possession,
      redCards: { home: 0, away: 0 },
      minute,
    };
  } catch {
    return null;
  }
}

/**
 * Convenience: fixture home/away team names → FotMob live data.
 */
export async function getFotmobDataForFixture(
  homeTeam: string,
  awayTeam: string
): Promise<{
  fotmobMatchId: number;
  liveXg: { home: number; away: number } | null;
  dangerousAttacks: { home: number; away: number } | null;
  possession: { home: number; away: number } | null;
  redCards: { home: number; away: number };
  minute: number | null;
} | null> {
  const matchId = await findFotmobMatchId(homeTeam, awayTeam);
  if (!matchId) return null;

  const liveData = await fetchFotmobLiveData(matchId);
  if (!liveData) return null;

  return { fotmobMatchId: matchId, ...liveData };
}
