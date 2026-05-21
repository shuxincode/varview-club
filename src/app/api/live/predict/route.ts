import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getFotmobDataForFixture } from '@/lib/live/fotmob-scraper';
import {
  computeMomentum,
  computeAdjustedLambdas,
  liveMonteCarloSimulation,
  computeLiveConfidence,
} from '@/lib/live/live-simulation';
import type { LivePrediction, LiveSimulationInput } from '@/lib/live/live-state';

export const dynamic = 'force-dynamic';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Resolve base lambda values from stored pre-match analysis or defaults.
 */
async function resolveBaseLambdas(
  fixtureId: number
): Promise<{ home: number; away: number }> {
  try {
    const admin = await createAdminClient();
    const { data } = await admin
      .from('ai_analyses')
      .select('lambda_home, lambda_away')
      .eq('fixture_id', fixtureId)
      .single();

    if (data && typeof data.lambda_home === 'number' && typeof data.lambda_away === 'number') {
      return { home: data.lambda_home, away: data.lambda_away };
    }
  } catch {
    // Fall through to defaults
  }
  return { home: 1.5, away: 1.2 };
}

/**
 * Generate chairman reasoning for live match. Tries DeepSeek, falls back to OpenRouter, then template.
 */
async function generateChairmanReasoning(params: {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  homeXg: number | null;
  awayXg: number | null;
  homeMomentum: number;
  awayMomentum: number;
  lambdaHome: number;
  lambdaAway: number;
}): Promise<string> {
  const prompt = `You are the Chairman — live match analyst.

Match: ${params.homeTeam} ${params.homeScore}-${params.awayScore} ${params.awayTeam}
Minute: ${params.minute}'
Home xG: ${params.homeXg?.toFixed(2) ?? 'N/A'} | Away xG: ${params.awayXg?.toFixed(2) ?? 'N/A'}
Home momentum: ${(params.homeMomentum * 100).toFixed(0)}% | Away momentum: ${(params.awayMomentum * 100).toFixed(0)}%
Adjusted λ_home: ${params.lambdaHome.toFixed(2)} | λ_away: ${params.lambdaAway.toFixed(2)}

Provide a concise 2-3 sentence live match prediction covering:
1. Who is likely to score next and why
2. Whether the current scoreline is likely to hold
3. Key momentum shift or tactical observation

Keep it under 100 words. Plain text only — no JSON, no markdown.`;

  // Try DeepSeek first
  if (DEEPSEEK_API_KEY) {
    try {
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a concise live football match analyst. Respond in plain text only, max 100 words.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }
    } catch {
      // Fall through
    }
  }

  // Try OpenRouter fallback
  if (OPENROUTER_API_KEY) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'varview-club Live',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: [
            { role: 'system', content: 'You are a concise live football match analyst. Respond in plain text only.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }
    } catch {
      // Fall through
    }
  }

  // Template fallback
  return `Live update: ${params.homeTeam} ${params.homeScore}-${params.awayScore} ${params.awayTeam} at ${params.minute}'. ` +
    `Adjusted model expects ${(params.lambdaHome + params.lambdaAway).toFixed(2)} remaining goals. ` +
    `${params.homeMomentum > params.awayMomentum ? params.homeTeam : params.awayTeam} has the momentum advantage.`;
}

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

    // Get base lambdas from pre-match analysis
    const baseLambdas = await resolveBaseLambdas(Number(fixtureId));

    // Get FotMob enrichment
    const fotmobData = await getFotmobDataForFixture(fixture.home_team, fixture.away_team);

    // Parse minute
    let minute = 0;
    if (fotmobData?.minute !== null && fotmobData?.minute !== undefined) {
      minute = fotmobData.minute;
    }

    const homeScore = fixture.home_goals ?? 0;
    const awayScore = fixture.away_goals ?? 0;

    // Compute momentum
    const momentum = computeMomentum(
      fotmobData?.liveXg?.home ?? null,
      fotmobData?.liveXg?.away ?? null,
      fotmobData?.possession?.home ?? null,
      fotmobData?.possession?.away ?? null,
      fotmobData?.dangerousAttacks?.home ?? null,
      fotmobData?.dangerousAttacks?.away ?? null,
      homeScore,
      awayScore,
      minute
    );

    // Build simulation input
    const simInput: LiveSimulationInput = {
      baseLambdaHome: baseLambdas.home,
      baseLambdaAway: baseLambdas.away,
      currentMinute: minute,
      totalMinutes: 90,
      currentHomeScore: homeScore,
      currentAwayScore: awayScore,
      homeMomentum: momentum.homeMomentum,
      awayMomentum: momentum.awayMomentum,
      homeRedCards: fotmobData?.redCards?.home ?? 0,
      awayRedCards: fotmobData?.redCards?.away ?? 0,
      liveXgHome: fotmobData?.liveXg?.home ?? null,
      liveXgAway: fotmobData?.liveXg?.away ?? null,
    };

    // Run simulation
    const simResult = liveMonteCarloSimulation(simInput, 10000);
    const adjustedLambdas = computeAdjustedLambdas(simInput);

    // Compute confidence
    const confidence = computeLiveConfidence(
      0, // dataFreshnessSeconds — fresh for this request
      fotmobData !== null && fotmobData.liveXg !== null,
      0.1, // momentumConsistency — default reasonable value
      0.01, // simulationConvergence — default reasonable value
      minute
    );

    // Generate chairman reasoning
    const chairmanReasoning = await generateChairmanReasoning({
      homeTeam: fixture.home_team,
      awayTeam: fixture.away_team,
      homeScore,
      awayScore,
      minute,
      homeXg: fotmobData?.liveXg?.home ?? null,
      awayXg: fotmobData?.liveXg?.away ?? null,
      homeMomentum: momentum.homeMomentum,
      awayMomentum: momentum.awayMomentum,
      lambdaHome: adjustedLambdas.lambdaHomeAdj,
      lambdaAway: adjustedLambdas.lambdaAwayAdj,
    });

    const prediction: LivePrediction = {
      fixtureId: Number(fixtureId),
      matchMinute: minute,
      currentScore: { home: homeScore, away: awayScore },
      homeWinProbability: simResult.homeWinProb,
      awayWinProbability: simResult.awayWinProb,
      drawProbability: simResult.drawProb,
      homeComebackProb: simResult.homeComebackProb,
      awayComebackProb: simResult.awayComebackProb,
      exactScoreProbs: simResult.topExactScores.map(s => ({
        home: s.home,
        away: s.away,
        probability: s.probability,
      })),
      expectedRemainingGoals: simResult.expectedRemainingGoals,
      expectedFinalGoals: simResult.expectedFinalGoals,
      confidenceScore: confidence.confidenceScore,
      confidenceInterval: confidence.interval,
      chairmanReasoning,
      momentum: {
        homeMomentum: momentum.homeMomentum,
        awayMomentum: momentum.awayMomentum,
        homeAttackRate: 0,
        awayAttackRate: 0,
        homeDangerRate: 0,
        awayDangerRate: 0,
        scorePressure: homeScore < awayScore ? 0.5 : awayScore < homeScore ? 0.5 : 0,
      },
      dataFreshnessSeconds: 0,
      generatedAt: new Date().toISOString(),
      predictionSource: 'live',
    };

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('[live/predict] Error:', error);
    return NextResponse.json({ error: 'Failed to generate live prediction' }, { status: 500 });
  }
}
