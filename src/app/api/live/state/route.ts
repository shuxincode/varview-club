import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getFotmobDataForFixture } from '@/lib/live/fotmob-scraper';
import type { LiveMatchState } from '@/lib/live/live-state';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fixtureId = searchParams.get('fixtureId');

    if (!fixtureId || isNaN(Number(fixtureId))) {
      return NextResponse.json({ error: 'Valid fixtureId required' }, { status: 400 });
    }

    const admin = await createAdminClient();
    const { data: fixture, error } = await admin
      .from('fixtures')
      .select('*')
      .eq('id', Number(fixtureId))
      .single();

    if (error || !fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    }

    if (fixture.status !== 'in_play') {
      return NextResponse.json({
        status: 'not_in_play',
        fixtureStatus: fixture.status,
      });
    }

    // Fetch FotMob enrichment
    const fotmobData = await getFotmobDataForFixture(fixture.home_team, fixture.away_team);

    // Parse minute — prefer FotMob, fall back to Flashscore partial parse
    let minute = 0;
    if (fotmobData?.minute !== null && fotmobData?.minute !== undefined) {
      minute = fotmobData.minute;
    }

    const now = new Date();

    const state: LiveMatchState = {
      fixtureId: fixture.id,
      homeTeam: fixture.home_team,
      awayTeam: fixture.away_team,
      status: 'in_play',
      minute,
      stoppageTime: 0,
      homeScore: fixture.home_goals ?? 0,
      awayScore: fixture.away_goals ?? 0,
      homeScoreHT: fixture.home_ht_goals ?? null,
      awayScoreHT: fixture.away_ht_goals ?? null,
      liveXg: fotmobData?.liveXg ?? null,
      dangerousAttacks: fotmobData?.dangerousAttacks ?? null,
      possession: fotmobData?.possession ?? null,
      redCards: fotmobData?.redCards ?? { home: 0, away: 0 },
      lastUpdated: now.toISOString(),
      dataFreshnessSeconds: 0,
      sources: {
        flashscore: true,
        fotmob: fotmobData !== null,
      },
    };

    return NextResponse.json(state);
  } catch (error) {
    console.error('[live/state] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch live state' }, { status: 500 });
  }
}
