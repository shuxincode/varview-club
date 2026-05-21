import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { publishToThreads, formatPicksForThreads } from '@/lib/threads';
import type { AIAnalysis, Fixture } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const admin = await createAdminClient();

    // Fetch today's chairman-signed analyses
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const { data: analyses } = await admin
      .from('ai_analyses')
      .select('*')
      .eq('chairman_signed', true)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(3);

    if (!analyses || analyses.length === 0) {
      return NextResponse.json({ error: 'No chairman-signed picks for today' }, { status: 404 });
    }

    // Fetch fixtures
    const fixtureIds = analyses.map((a: AIAnalysis) => a.fixture_id);
    const { data: fixtures } = await admin
      .from('fixtures')
      .select('*')
      .in('id', fixtureIds);

    const fixtureMap = new Map<number, Fixture>();
    for (const f of fixtures || []) {
      fixtureMap.set(f.id, f as Fixture);
    }

    // Build picks list
    const picks: Array<{
      homeTeam: string;
      awayTeam: string;
      leagueName: string;
      prediction: string;
      homeScore: number | null;
      awayScore: number | null;
    }> = [];

    for (const analysis of analyses as AIAnalysis[]) {
      const fixture = fixtureMap.get(analysis.fixture_id);
      if (!fixture) continue;

      picks.push({
        homeTeam: fixture.home_team,
        awayTeam: fixture.away_team,
        leagueName: fixture.league_name,
        prediction: analysis.total_goals_prediction === 'over_2.5' ? 'Over 2.5 Goals' : 'Under 2.5 Goals',
        homeScore: fixture.home_goals ?? null,
        awayScore: fixture.away_goals ?? null,
      });
    }

    if (picks.length === 0) {
      return NextResponse.json({ error: 'No fixtures found for today\'s picks' }, { status: 404 });
    }

    const text = formatPicksForThreads(picks);
    const result = await publishToThreads(text);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, postId: result.postId, picks: picks.length });
  } catch (error) {
    console.error('[threads/publish] Error:', error);
    return NextResponse.json({ error: 'Failed to publish to Threads' }, { status: 500 });
  }
}
