// DEPRECATED — Football Pro API replaced by AI-led web search.
// All fixture/team data now comes from the prediction engine's
// AI search agent (Gemini 1.5 Flash via OpenRouter).
// See: prediction-engine/app/scrapers/ai_search.py
//
// This file kept only as reference. No code should import from it.
// Remove entirely once all old imports are verified clean.

import { getAllLeagueIds, getActiveLeaguesForDate, type LeagueConfig, LEAGUES } from './leagues';

const RAPIDAPI_HOST = 'football-pro.p.rapidapi.com';
const BASE_URL = 'https://football-pro.p.rapidapi.com/api/v2.0';

interface RapidAPIHeaders extends Record<string, string> {
  'x-rapidapi-key': string;
  'x-rapidapi-host': string;
}

function getHeaders(): RapidAPIHeaders {
  return {
    'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
    'x-rapidapi-host': RAPIDAPI_HOST,
  };
}

// ---- Football Pro response types ----

interface FpResponse<T> {
  data: T[];
}

interface FpFixtureTime {
  status: string;
  starting_at: {
    date_time: string;
    date: string;
    time: string;
    timestamp: number;
    timezone: string;
  };
  minute: number | null;
  second: number | null;
  added_time: number | null;
  injury_time: number | null;
}

interface FpFixtureScores {
  localteam_score: number | null;
  visitorteam_score: number | null;
  localteam_pen_score: number | null;
  visitorteam_pen_score: number | null;
  ht_score: string | null;
  ft_score: string | null;
  et_score: string | null;
  ps_score: string | null;
}

interface FpTeamData {
  id: number;
  name: string;
  logo_path: string | null;
}

interface FpLeagueData {
  id: number;
  name: string;
  logo_path: string | null;
  current_season_id: number;
}

interface FpFixture {
  id: number;
  league_id: number;
  season_id: number;
  round_id: number;
  localteam_id: number;
  visitorteam_id: number;
  winner_team_id: number | null;
  scores: FpFixtureScores;
  time: FpFixtureTime;
  localTeam?: { data: FpTeamData };
  visitorTeam?: { data: FpTeamData };
  league?: { data: FpLeagueData };
  formations?: {
    localteam_formation: string | null;
    visitorteam_formation: string | null;
  };
  venue_id: number | null;
  neutral_venue: boolean;
  attendance: number | null;
  weather_report: { temperature: { temp: number } } | null;
}

// ---- Mapped output type (compatible with existing code) ----

export interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string };
    venue?: { name: string };
  };
  league: {
    id: number;
    name: string;
    season: number;
    round?: string;
  };
  teams: {
    home: { name: string; logo: string };
    away: { name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
  };
}

// ---- Helpers ----

function parseHalftime(htScore: string | null): { home: number | null; away: number | null } {
  if (!htScore) return { home: null, away: null };
  const parts = htScore.split('-');
  return {
    home: parts[0] ? parseInt(parts[0]) : null,
    away: parts[1] ? parseInt(parts[1]) : null,
  };
}

function mapFixture(fp: FpFixture): ApiFixture {
  const home = fp.localTeam?.data;
  const away = fp.visitorTeam?.data;
  const league = fp.league?.data;
  const ht = parseHalftime(fp.scores.ht_score);

  return {
    fixture: {
      id: fp.id,
      date: fp.time.starting_at.date_time,
      status: {
        short: fp.time.status,
        long: fp.time.status,
      },
    },
    league: {
      id: fp.league_id,
      name: league?.name || `League ${fp.league_id}`,
      season: fp.season_id,
    },
    teams: {
      home: {
        name: home?.name || `Team ${fp.localteam_id}`,
        logo: home?.logo_path || '',
      },
      away: {
        name: away?.name || `Team ${fp.visitorteam_id}`,
        logo: away?.logo_path || '',
      },
    },
    goals: {
      home: fp.scores.localteam_score,
      away: fp.scores.visitorteam_score,
    },
    score: {
      halftime: ht,
    },
  };
}

// ---- Core API functions ----

export async function fetchFixturesByDate(date: string): Promise<ApiFixture[]> {
  const url = `${BASE_URL}/fixtures/date/${date}?include=localTeam,visitorTeam,league`;
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) throw new Error(`Football Pro error: ${res.status}`);
  const data: FpResponse<FpFixture> = await res.json();
  return (data.data || []).map(mapFixture);
}

export async function fetchFixturesByLeague(
  leagueId: number,
  seasonId: number
): Promise<ApiFixture[]> {
  const url = `${BASE_URL}/fixtures/between/2026-01-01/2026-12-31?include=localTeam,visitorTeam,league&league_id=${leagueId}`;
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) throw new Error(`Football Pro error: ${res.status}`);
  const data: FpResponse<FpFixture> = await res.json();
  return (data.data || []).map(mapFixture);
}

export async function fetchFixturesByTeam(team: string): Promise<ApiFixture[]> {
  // Search team first
  const searchUrl = `${BASE_URL}/teams/search/${encodeURIComponent(team)}`;
  const searchRes = await fetch(searchUrl, { headers: getHeaders() });
  if (!searchRes.ok) throw new Error(`Football Pro error: ${searchRes.status}`);
  const searchData: FpResponse<{ id: number }> = await searchRes.json();

  const teams = searchData.data || [];
  if (teams.length === 0) return [];

  const teamId = teams[0].id;
  const fixturesUrl = `${BASE_URL}/fixtures/between/2025-01-01/2026-12-31?include=localTeam,visitorTeam,league&localteam_id=${teamId}`;
  const fixturesRes = await fetch(fixturesUrl, { headers: getHeaders() });
  if (!fixturesRes.ok) throw new Error(`Football Pro error: ${fixturesRes.status}`);
  const data: FpResponse<FpFixture> = await fixturesRes.json();
  return (data.data || []).map(mapFixture);
}

export async function fetchHeadToHead(
  homeTeam: string,
  awayTeam: string
): Promise<ApiFixture[]> {
  // Search both teams to get their IDs
  const [homeRes, awayRes] = await Promise.all([
    fetch(`${BASE_URL}/teams/search/${encodeURIComponent(homeTeam)}`, {
      headers: getHeaders(),
    }),
    fetch(`${BASE_URL}/teams/search/${encodeURIComponent(awayTeam)}`, {
      headers: getHeaders(),
    }),
  ]);

  if (!homeRes.ok || !awayRes.ok) return [];

  const homeData: FpResponse<{ id: number }> = await homeRes.json();
  const awayData: FpResponse<{ id: number }> = await awayRes.json();

  const homeTeams = homeData.data || [];
  const awayTeams = awayData.data || [];
  if (homeTeams.length === 0 || awayTeams.length === 0) return [];

  const h2hUrl = `${BASE_URL}/head2head/${homeTeams[0].id}/${awayTeams[0].id}?include=localTeam,visitorTeam,league`;
  const res = await fetch(h2hUrl, { headers: getHeaders() });
  if (!res.ok) return [];
  const data: FpResponse<FpFixture> = await res.json();
  return (data.data || []).map(mapFixture);
}

export async function fetchTeamStatistics(
  teamId: number,
  leagueId: number,
  season: number
) {
  // Football Pro doesn't have a direct stats endpoint — return empty
  return null;
}

export async function searchTeams(query: string) {
  const url = `${BASE_URL}/teams/search/${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Football Pro error: ${res.status}`);
  const data: FpResponse<FpTeamData> = await res.json();
  return (data.data || []).map((t) => ({
    team: { id: t.id, name: t.name, logo: t.logo_path || '' },
  }));
}

export async function fetchLeagues() {
  const url = `${BASE_URL}/leagues?per_page=50`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Football Pro error: ${res.status}`);
  const data: FpResponse<FpLeagueData> = await res.json();
  return (data.data || []).map((l) => ({
    league: { id: l.id, name: l.name, logo: l.logo_path || '' },
    seasons: [{ year: l.current_season_id }],
  }));
}

// ---- Season-aware functions ----

export async function fetchAllActiveLeagueFixtures(date: string): Promise<ApiFixture[]> {
  const targetDate = new Date(date);
  const activeLeagues = getActiveLeaguesForDate(targetDate);

  console.log(`Fetching fixtures for ${activeLeagues.length} active leagues on ${date}`);

  const results = await Promise.allSettled(
    activeLeagues.map((league) =>
      fetchFixturesByLeague(league.id, getSeasonForDate(league, targetDate))
    )
  );

  const allFixtures: ApiFixture[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allFixtures.push(...result.value);
    }
  }

  return allFixtures;
}

function getSeasonForDate(league: LeagueConfig, date: Date): number {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  switch (league.hemisphere) {
    case 'northern_winter': {
      if (month >= league.seasonStartMonth) {
        return year;
      } else {
        return year - 1;
      }
    }
    case 'northern_summer': {
      return year;
    }
    case 'southern_summer': {
      return year;
    }
    case 'southern_winter': {
      if (month >= league.seasonStartMonth) {
        return year;
      } else {
        return year - 1;
      }
    }
    case 'global': {
      return league.worldCupYear || year;
    }
    default:
      return year;
  }
}

export async function fetchTeamMatchesBySeason(
  teamName: string,
  leagueId: number,
  season: number,
  last: number = 10
): Promise<ApiFixture[]> {
  const searchUrl = `${BASE_URL}/teams/search/${encodeURIComponent(teamName)}`;
  const searchRes = await fetch(searchUrl, { headers: getHeaders() });
  if (!searchRes.ok) throw new Error(`Football Pro error: ${searchRes.status}`);
  const searchData: FpResponse<{ id: number }> = await searchRes.json();

  const teams = searchData.data || [];
  if (teams.length === 0) return [];

  const teamId = teams[0].id;
  const fixturesUrl = `${BASE_URL}/fixtures/between/2026-01-01/2026-12-31?include=localTeam,visitorTeam,league&localteam_id=${teamId}&league_id=${leagueId}`;
  const fixturesRes = await fetch(fixturesUrl, { headers: getHeaders() });
  if (!fixturesRes.ok) throw new Error(`Football Pro error: ${fixturesRes.status}`);
  const data: FpResponse<FpFixture> = await fixturesRes.json();
  const fixtures = (data.data || []).map(mapFixture);
  return fixtures.slice(-last);
}

export function mapApiStatus(short: string): string {
  const statusMap: Record<string, string> = {
    TBA: 'scheduled',
    NS: 'scheduled',
    LIVE: 'in_play',
    HT: 'in_play',
    ET: 'in_play',
    BT: 'in_play',
    SUSP: 'in_play',
    INT: 'in_play',
    FT: 'finished',
    AET: 'finished',
    PEN: 'finished',
    AWARDED: 'finished',
    POST: 'postponed',
    CANCL: 'cancelled',
    ABAN: 'cancelled',
    DELAYED: 'postponed',
  };
  return statusMap[short] || 'scheduled';
}
