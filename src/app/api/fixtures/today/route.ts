export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { scrapeFlashscoreFixtures } from '@/lib/scraper/flashscore';
import { createAdminClient } from '@/lib/supabase/server';
import { buildFixtureRow, hashApiFixtureId } from '@/lib/fixture-synthesis';
import { estimateLambdas } from '@/lib/agents/team-ratings';
import { generateFullAnalysis } from '@/lib/agents';
import {
  calculateProbabilities,
  monteCarloSimulation,
  type DixonColesParams,
} from '@/lib/dixon-coles';

// ── In-memory cache (60 s TTL — near-immediate refresh for live scores) ──
let cachedResponse: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

function getCached(): any | null {
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) return cachedResponse.data;
  return null;
}
function setCached(data: any) {
  cachedResponse = { data, timestamp: Date.now() };
}

const FD_API = 'https://api.football-data.org/v4';
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY;

// Helper: get today's date in local time as YYYY-MM-DD
const todayLocal = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

// Helper: convert local date + time string to UTC ISO string
function toUtcIso(dateStr: string, timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const FD_COMPETITIONS = new Set([
  'PL', 'PD', 'SA', 'BL1', 'FL1', 'BSA', 'ELC', 'DED', 'PPL', 'CLI', 'CL',
]);

async function fetchFixturesFromFD(): Promise<any[]> {
  if (!FD_KEY) return [];
  try {
    const res = await fetch(
      `${FD_API}/matches?date=${new Date().toISOString().split('T')[0]}`,
      { headers: { 'X-Auth-Token': FD_KEY }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.matches || [])
      .filter((m: any) => FD_COMPETITIONS.has(m.competition?.code))
      .map((m: any) => {
        let status = 'scheduled';
        const s = m.status || '';
        if (s === 'IN_PLAY' || s === 'PAUSED') status = 'in_play';
        else if (s === 'FINISHED' || s === 'AWARDED') status = 'finished';

        let time = '';
        if (m.utcDate) {
          try {
            const t = new Date(m.utcDate);
            time = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
          } catch { /* ignore */ }
        }

        return {
          home_team: m.homeTeam?.name || '',
          away_team: m.awayTeam?.name || '',
          league_name: m.competition?.name || m.competition?.code || '',
          time,
          status,
          scheduled_date: m.utcDate,
        };
      })
      .filter((f: any) => f.home_team && f.away_team);
  } catch {
    return [];
  }
}

function sortFixtures(fixtures: any[]): any[] {
  return [...fixtures].sort((a, b) => {
    // In-play matches first
    if (a.status === 'in_play' && b.status !== 'in_play') return -1;
    if (a.status !== 'in_play' && b.status === 'in_play') return 1;

    // Finished matches last
    if (a.status === 'finished' && b.status !== 'finished') return 1;
    if (a.status !== 'finished' && b.status === 'finished') return -1;

    // Sort by time (ascending) for scheduled matches
    const aTime = a.time || a.scheduled_date || '';
    const bTime = b.time || b.scheduled_date || '';
    return aTime.localeCompare(bTime);
  });
}

// ── Sync scraped fixtures to Supabase via SECURITY DEFINER RPCs ──
async function syncFixturesToSupabase(fixtures: any[]): Promise<Map<string, number>> {
  try {
    const admin = await createAdminClient();

    // Build upsert rows
    const rows = fixtures
      .filter((f: any) => f.home_team && f.away_team)
      .map((f: any) => buildFixtureRow(f));

    if (rows.length === 0) return new Map();

    // Upsert fixtures one-by-one via RPC (bypasses RLS)
    const idMap = new Map<string, number>();
    let upsertedCount = 0;

    for (const row of rows) {
      try {
        const { data, error } = await admin.rpc('upsert_fixture', {
          p_api_fixture_id: row.api_fixture_id,
          p_league_id: row.league_id,
          p_league_name: row.league_name,
          p_season: row.season,
          p_home_team: row.home_team,
          p_away_team: row.away_team,
          p_status: row.status,
          p_scheduled_date: row.scheduled_date,
          p_home_goals: row.home_goals,
          p_away_goals: row.away_goals,
        });

        if (error) {
          console.warn(`[sync] RPC error for ${row.home_team} vs ${row.away_team}:`, error.message);
          continue;
        }

        if (data && typeof data === 'object') {
          const fixtureData = data as any;
          const key = `${row.home_team.toLowerCase().trim()}|${row.away_team.toLowerCase().trim()}`;
          idMap.set(key, fixtureData.id);
          upsertedCount++;
        }
      } catch (rpcErr) {
        console.warn(`[sync] RPC exception for ${row.home_team} vs ${row.away_team}:`, rpcErr);
      }
    }

    console.log(`[sync] Upserted ${upsertedCount} fixtures via RPC`);

    if (idMap.size === 0) return idMap;

    // Seed/re-seed ai_analyses — includes fixtures missing analyses AND
    // existing analyses that still have null agent reports.
    const fixtureIds = Array.from(idMap.values());
    const toSeed: Array<{ id: number; home_team: string; away_team: string; league_name: string }> = [];
    // Track existing chairman_signed so re-seeds don't overwrite it
    const existingSignedMap = new Map<number, boolean>();

    // Helper to find fixture row by idMap key
    const findRow = (id: number) => rows.find(r => {
      const key = `${r.home_team.toLowerCase().trim()}|${r.away_team.toLowerCase().trim()}`;
      return idMap.get(key) === id;
    });

    try {
      const { data: existing, error: existingError } = await admin
        .from('ai_analyses')
        .select('fixture_id,analyst_a_report,chairman_signed')
        .in('fixture_id', fixtureIds);

      if (existingError) {
        console.warn('[sync] Cannot check existing analyses (will seed all):', existingError.message);
        for (const id of fixtureIds) {
          const f = findRow(id);
          if (f) toSeed.push({ id, home_team: f.home_team, away_team: f.away_team, league_name: f.league_name });
        }
      } else {
        const existingMap = new Map((existing || []).map((a: any) => [a.fixture_id, a]));
        for (const id of fixtureIds) {
          const existingRow = existingMap.get(id);
          // Track existing chairman_signed so re-seeds preserve it
          if (existingRow?.chairman_signed) existingSignedMap.set(id, true);
          // Seed if missing entirely OR if analyst reports are still null
          if (!existingRow || existingRow.analyst_a_report === null) {
            const f = findRow(id);
            if (f) toSeed.push({ id, home_team: f.home_team, away_team: f.away_team, league_name: f.league_name });
          }
        }
      }
    } catch {
      for (const id of fixtureIds) {
        const f = findRow(id);
        if (f) toSeed.push({ id, home_team: f.home_team, away_team: f.away_team, league_name: f.league_name });
      }
    }

    if (toSeed.length > 0) {
      // Generate AI agent reports for all fixtures that need them
      // (runs in parallel, uses local fallbacks — no API calls since apiModelIds are empty)
      const agentResults = await Promise.all(
        toSeed.map(async (f) => {
          const lambdas = estimateLambdas(f.home_team, f.away_team, f.league_name);
          const dcParams: DixonColesParams = { lambdaHome: lambdas.lambdaHome, lambdaAway: lambdas.lambdaAway, rho: -0.15 };
          const probs = calculateProbabilities(dcParams);

          const fullAnalysis = await generateFullAnalysis(f.id, {
            homeTeam: f.home_team,
            awayTeam: f.away_team,
            leagueName: f.league_name,
            recentForm: { home: 'Default', away: 'Default' },
            h2hSummary: 'H2H data unavailable during sync',
            dixonColes: { ...dcParams, ...probs },
          }, { ...dcParams, ...probs });

          return { f, lambdas, dcParams, probs, fullAnalysis };
        })
      );

      const analysisRows = agentResults.map(({ f, lambdas, dcParams, probs, fullAnalysis }) => ({
        p_fixture_id: f.id,
        p_chairman_signed: existingSignedMap.get(f.id) ?? false, // preserve existing chairman_signed
        p_total_goals_prediction: probs.over2_5 > 0.5 ? 'over_2.5' : 'under_2.5',
        p_total_goals_confidence: Math.abs(probs.over2_5 - 0.5) * 2,
        p_btts_prediction: probs.bttsYes > 0.5 ? 'yes' : 'no',
        p_btts_confidence: Math.abs(probs.bttsYes - 0.5) * 2,
        p_winner_prediction: probs.homeWin > probs.awayWin ? (probs.homeWin > probs.draw ? 'home' : 'draw') : (probs.awayWin > probs.draw ? 'away' : 'draw'),
        p_winner_confidence: Math.max(probs.homeWin, probs.awayWin, probs.draw),
        p_first_half_goals_prediction: 'over_0.5',
        p_first_half_goals_confidence: 0.65,
        p_lambda_home: lambdas.lambdaHome,
        p_lambda_away: lambdas.lambdaAway,
        p_confidence_interval_low: Math.max(0, probs.homeWin - 0.1),
        p_confidence_interval_high: Math.min(1, probs.homeWin + 0.1),
        p_analyst_a_report: fullAnalysis.analyst_a_report ?? null,
        p_analyst_b_report: fullAnalysis.analyst_b_report ?? null,
        p_chairman_report: fullAnalysis.chairman_report ?? null,
        p_analyst_c_report: fullAnalysis.analyst_c_report ?? null,
      }));

      // AUTO-SIGN: Allow up to 3 chairman-signed picks per day.
      // Picks from earlier syncs are preserved; new high-confidence fixtures
      // fill any remaining slots so late-arriving matches get chairman attention.
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setUTCHours(23, 59, 59, 999);
      const { count: alreadySigned } = await admin
        .from('ai_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('chairman_signed', true)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      let signedCount = 0;
      const currentSigned = alreadySigned ?? 0;
      if (currentSigned < 3) {
        const slotsRemaining = 3 - currentSigned;
        // Only consider rows that are not already signed as chairman
        const unsigned = analysisRows.filter(a => !a.p_chairman_signed);
        const sorted = [...unsigned].sort((a, b) => b.p_total_goals_confidence - a.p_total_goals_confidence);
        for (let i = 0; i < Math.min(slotsRemaining, sorted.length); i++) {
          sorted[i].p_chairman_signed = true;
          signedCount++;
        }
      }

      let seededCount = 0;
      for (const analysis of analysisRows) {
        try {
          const { error: seedErr } = await admin.rpc('upsert_analysis', analysis);
          if (!seedErr) seededCount++;
        } catch {
          // individual failures are non-fatal
        }
      }
      console.log(`[sync] Seeded ${seededCount}/${analysisRows.length} analyses with agent reports (${signedCount} chairman-signed)`);
    }

    return idMap;
  } catch (err) {
    console.warn('[sync] Sync failed (non-fatal):', err);
    return new Map();
  }
}

export async function GET() {
  try {
    const cached = getCached();
    if (cached) return NextResponse.json(cached);

    const today = new Date().toISOString().split('T')[0];

    // Primary: Flashscore (no rate limits, wider league coverage)
    let fixtures: any[] = [];
    let source = 'flashscore';

    try {
      const flashscoreFixtures = await scrapeFlashscoreFixtures();
      if (flashscoreFixtures.length > 0) {
        // Try FD for supplementary date data (in-play/finished matches need actual kickoff time)
        const fdDateMap = new Map<string, string>();
        try {
          const fdFixtures = await fetchFixturesFromFD();
          for (const fd of fdFixtures) {
            if (fd.scheduled_date) {
              const key = `${fd.home_team.toLowerCase().trim()}|${fd.away_team.toLowerCase().trim()}`;
              fdDateMap.set(key, fd.scheduled_date);
            }
          }
        } catch {
          // FD is optional — dates fall back to todayT00:00:00
        }

        // Helper: convert bare "HH:MM" time to a UTC ISO string using the
        // server's local timezone so the client renders the correct wall-clock time.
        function toUtcIso(todayLocal: string, time: string): string {
          return new Date(`${todayLocal}T${time}:00`).toISOString();
        }

        // todayLocal = today's date in the SERVER timezone (YYYY-MM-DD).
        // We use this instead of the UTC `today` because Flashscore returns
        // kickoff times in the venue local timezone.
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayLocal = `${y}-${m}-${d}`;

        fixtures = flashscoreFixtures.map((f, i) => {
          let scheduled_date: string;

          // 1. Use scheduled_time from dedicated DOM element (persists after match starts)
          if (f.scheduled_time && /^\d{1,2}:\d{2}$/.test(f.scheduled_time)) {
            scheduled_date = toUtcIso(todayLocal, f.scheduled_time);
          } else if (f.status === 'scheduled' && f.time && /^\d{1,2}:\d{2}$/.test(f.time)) {
            // 2. Scheduled match with HH:MM in stage block
            scheduled_date = toUtcIso(todayLocal, f.time);
          } else {
            // 3. Try FD date enrichment for in-play/finished matches
            const fdKey = `${f.home_team.toLowerCase().trim()}|${f.away_team.toLowerCase().trim()}`;
            scheduled_date = fdDateMap.get(fdKey) || toUtcIso(todayLocal, '00:00');
          }

          return {
            id: `fs_${i}`,
            home_team: f.home_team,
            away_team: f.away_team,
            league_name: f.league_name,
            scheduled_date,
            status: f.status,
            time: f.time,
            venue: null,
            home_score: f.home_score,
            away_score: f.away_score,
          };
        });
      }
    } catch (err) {
      console.warn('[today] Flashscore scrape failed, trying FD API:', err);
    }

    // Fallback: football-data.org if Flashscore returned nothing
    if (fixtures.length === 0) {
      const fdFixtures = await fetchFixturesFromFD();
      if (fdFixtures.length > 0) {
        fixtures = fdFixtures.map((f, i) => ({
          id: `fd_${i}`,
          home_team: f.home_team,
          away_team: f.away_team,
          league_name: f.league_name,
          scheduled_date: f.scheduled_date || toUtcIso(todayLocal, f.time || '00:00'),
          status: f.status,
          time: f.time,
          venue: null,
          home_score: f.home_score,
          away_score: f.away_score,
        }));
        source = 'football-data.org';
      }
    }

    // Sort: in-play first, then scheduled by time, then finished
    const sorted = sortFixtures(fixtures);

    // Sync to Supabase (non-fatal — falls back to in-memory fixtures on failure)
    const idMap = await syncFixturesToSupabase(sorted);

    // Replace fs_ IDs with Supabase IDs where available
    if (idMap.size > 0) {
      for (const f of sorted) {
        const key = `${f.home_team.toLowerCase().trim()}|${f.away_team.toLowerCase().trim()}`;
        const sid = idMap.get(key);
        if (sid) {
          f.id = sid;
          f.supabase_id = sid;
        }
      }
    }

    const body = { date: today, fixtures: sorted, source };
    setCached(body);
    return NextResponse.json(body);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Today fixtures error:', msg);
    return NextResponse.json({ fixtures: [], error: `Failed: ${msg}` });
  }
}
