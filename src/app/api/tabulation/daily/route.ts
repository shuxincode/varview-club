import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { computeGoalsBandFromLambdas } from '@/lib/agents';
import type { AIAnalysis, Fixture } from '@/types';

export interface PillarResult {
  label: string;
  key: string;
  prediction: string;
  actual: string | null;
  correct: boolean | null; // null = pending
}

export interface PickResult {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  homeScore: number | null;
  awayScore: number | null;
  prediction: string;
  correct: boolean | null;
  status: 'pending' | 'correct' | 'incorrect';
  pillars: PillarResult[];
  missPercentage: number | null; // % of 5 pillars missed (null if pending)
}

interface PicksSummary {
  picks: PickResult[];
  totalPicks: number;
  correctPicks: number;
  pendingPicks: number;
  successRate: number;
}

const PILLAR_DEFS: Array<{ key: string; label: string }> = [
  { key: 'total_goals', label: 'Total Goals (O/U 2.5)' },
  { key: 'btts', label: 'Both Teams to Score' },
  { key: 'winner', label: 'Winner (1X2)' },
  { key: 'first_half_goals', label: 'First Half (O/U 0.5)' },
  { key: 'goals_band', label: 'Chairman 2/3 Goal Band' },
];

/**
 * Evaluate a single pillar and return its correctness.
 */
function evalPillar(
  key: string,
  analysis: AIAnalysis,
  hg: number,
  ag: number,
  totalGoals: number,
): { prediction: string; actual: string; correct: boolean | null } {
  switch (key) {
    case 'total_goals': {
      const pred = analysis.total_goals_prediction;
      return {
        prediction: pred === 'over_2.5' ? 'Over 2.5' : 'Under 2.5',
        actual: totalGoals > 2 ? 'Over 2.5' : 'Under 2.5',
        correct: pred === 'over_2.5' ? totalGoals > 2 : totalGoals <= 2,
      };
    }
    case 'btts': {
      const pred = analysis.btts_prediction;
      const bothScored = hg > 0 && ag > 0;
      return {
        prediction: pred === 'yes' ? 'Yes' : 'No',
        actual: bothScored ? 'Yes' : 'No',
        correct: pred === 'yes' ? bothScored : !bothScored,
      };
    }
    case 'winner': {
      const pred = analysis.winner_prediction;
      let actualWinner: string;
      if (hg > ag) actualWinner = 'home';
      else if (ag > hg) actualWinner = 'away';
      else actualWinner = 'draw';

      const predLabel = pred === 'home' ? 'Home' : pred === 'away' ? 'Away' : 'Draw';
      const actualLabel = actualWinner === 'home' ? 'Home' : actualWinner === 'away' ? 'Away' : 'Draw';
      return {
        prediction: predLabel,
        actual: actualLabel,
        correct: pred === actualWinner,
      };
    }
    case 'first_half_goals': {
      // We don't have actual first-half data in the fixture row,
      // so we derive from context or leave as "N/A" if unavailable.
      // For now, we infer: finished matches with total goals, some likely had FH goals.
      const pred = analysis.first_half_goals_prediction;
      // Without actual FH data, we cannot evaluate post-match.
      // We'll mark as "N/A" and exclude from miss rate.
      return {
        prediction: pred === 'over_0.5' ? 'Over 0.5' : 'Under 0.5',
        actual: 'N/A',
        correct: null, // unknown
      };
    }
    case 'goals_band': {
      // Compute goals band prediction from analysis lambda values
      const band = computeGoalsBandFromLambdas(
        analysis.lambda_home,
        analysis.lambda_away,
      );
      const expectsBand = band.signal === 'BET';
      const isMonitor = band.signal === 'MONITOR';
      const actualInBand = totalGoals >= 2 && totalGoals <= 3;

      let prediction: string;
      let correct: boolean;

      if (isMonitor) {
        // MONITOR = uncertain, not scored
        return {
          prediction: 'Monitor',
          actual: actualInBand ? '2-3 goals' : 'Not 2-3 goals',
          correct: null,
        };
      }

      if (expectsBand) {
        prediction = '2-3 Goals';
        correct = actualInBand;
      } else {
        prediction = 'Not 2-3 Goals';
        correct = !actualInBand;
      }

      return {
        prediction,
        actual: actualInBand ? '2-3 goals' : 'Not 2-3 goals',
        correct,
      };
    }
    default:
      return { prediction: '?', actual: '?', correct: false };
  }
}

export async function GET() {
  try {
    const admin = await createAdminClient();

    // Get today's date range (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    // Fetch chairman-signed analyses from today
    const { data: analyses, error: analysisError } = await admin
      .from('ai_analyses')
      .select('*')
      .eq('chairman_signed', true)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false });

    if (analysisError) {
      console.error('[tabulation] Error fetching analyses:', analysisError);
      return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
    }

    if (!analyses || analyses.length === 0) {
      return NextResponse.json({
        picks: [],
        totalPicks: 0,
        correctPicks: 0,
        successRate: 0,
        date: todayStart.toISOString().split('T')[0],
      });
    }

    // Fetch associated fixtures
    const fixtureIds = analyses.map((a: AIAnalysis) => a.fixture_id);
    const { data: fixtures, error: fixtureError } = await admin
      .from('fixtures')
      .select('*')
      .in('id', fixtureIds);

    if (fixtureError) {
      console.error('[tabulation] Error fetching fixtures:', fixtureError);
      return NextResponse.json({ error: 'Failed to fetch fixtures' }, { status: 500 });
    }

    const fixtureMap = new Map<number, Fixture>();
    for (const f of fixtures || []) {
      fixtureMap.set(f.id, f as Fixture);
    }

    // Build picks with per-pillar evaluation
    let correctPicks = 0;
    let pendingPicks = 0;
    let totalFinished = 0;
    let totalPillarAccuracy = 0; // sum of (correct pillars / evaluable pillars) for finished picks
    const picks: PicksSummary['picks'] = [];

    for (const analysis of analyses as AIAnalysis[]) {
      const fixture = fixtureMap.get(analysis.fixture_id);
      if (!fixture) continue;

      if (fixture.status !== 'finished') {
        pendingPicks++;
        picks.push({
          fixtureId: fixture.id,
          homeTeam: fixture.home_team,
          awayTeam: fixture.away_team,
          leagueName: fixture.league_name,
          homeScore: null,
          awayScore: null,
          prediction: analysis.total_goals_prediction === 'over_2.5' ? 'Over 2.5' : 'Under 2.5',
          correct: null,
          status: 'pending',
          pillars: PILLAR_DEFS.map(p => ({
            label: p.label,
            key: p.key,
            prediction: '—',
            actual: null,
            correct: null,
          })),
          missPercentage: null,
        });
        continue;
      }

      totalFinished++;
      const hg = fixture.home_goals ?? 0;
      const ag = fixture.away_goals ?? 0;
      const totalGoals = hg + ag;

      // Evaluate each pillar
      const pillars: PillarResult[] = PILLAR_DEFS.map(p => {
        const result = evalPillar(p.key, analysis, hg, ag, totalGoals);
        return {
          label: p.label,
          key: p.key,
          prediction: result.prediction,
          actual: result.actual,
          correct: result.correct,
        };
      });

      // Count correct/evaluated pillars for miss rate
      const evaluated = pillars.filter(p => p.correct !== null);
      const correctPillarCount = evaluated.filter(p => p.correct === true).length;
      const missPercentage = evaluated.length > 0
        ? Math.round(((evaluated.length - correctPillarCount) / evaluated.length) * 100)
        : null;

      // Track pillar-level accuracy for the overall success rate
      const pillarAccuracy = evaluated.length > 0 ? correctPillarCount / evaluated.length : 0;
      totalPillarAccuracy += pillarAccuracy;

      // A pick is overall-correct if >= 50% of evaluable pillars are correct
      const overallCorrect = evaluated.length > 0
        ? correctPillarCount >= Math.ceil(evaluated.length / 2)
        : false;

      if (overallCorrect) correctPicks++;

      picks.push({
        fixtureId: fixture.id,
        homeTeam: fixture.home_team,
        awayTeam: fixture.away_team,
        leagueName: fixture.league_name,
        homeScore: hg,
        awayScore: ag,
        prediction: analysis.total_goals_prediction === 'over_2.5' ? 'Over 2.5' : 'Under 2.5',
        correct: overallCorrect,
        status: overallCorrect ? 'correct' as const : 'incorrect' as const,
        pillars,
        missPercentage,
      });
    }

    // Sort: correct first, then pending, then incorrect
    picks.sort((a, b) => {
      const order = { correct: 0, pending: 1, incorrect: 2 };
      return order[a.status] - order[b.status];
    });

    // Take top 3
    const topPicks = picks.slice(0, 3);

    // Success rate = average pillar accuracy across finished picks
    // (not pick-level majority — so a 50% miss rate correctly shows as 50% success)
    const successRate = totalFinished > 0
      ? Math.round((totalPillarAccuracy / totalFinished) * 100)
      : 0;

    const summary: PicksSummary & { date: string } = {
      picks: topPicks,
      totalPicks: topPicks.length,
      correctPicks,
      pendingPicks,
      successRate,
      date: todayStart.toISOString().split('T')[0],
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[tabulation] Error:', error);
    return NextResponse.json({ error: 'Failed to generate tabulation' }, { status: 500 });
  }
}
