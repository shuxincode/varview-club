import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { calculateProbabilities, monteCarloSimulation, buildSeasonalContext, applySeasonalAdjustment } from '@/lib/dixon-coles';
import type { DixonColesParams } from '@/lib/dixon-coles';
import { computeConfidenceScore } from '@/lib/bayesian';
import { generateFullAnalysis } from '@/lib/agents';
import { LEAGUES } from '@/lib/leagues';
import { checkRateLimit, getClientIp, buildRateLimitHeaders } from '@/lib/rate-limiter';

const PREDICTION_ENGINE_URL = process.env.PREDICTION_ENGINE_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const { fixtureId } = await request.json();
    if (!fixtureId) {
      return NextResponse.json({ error: 'fixtureId required' }, { status: 400 });
    }

    // Rate limiting (IP-based, checked before auth to catch unauthenticated abuse)
    const ip = getClientIp(request);
    const { allowed, ...rateLimitInfo } = await checkRateLimit(null, ip, '/api/predict');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: buildRateLimitHeaders(rateLimitInfo) }
      );
    }

    // Verify authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const admin = await createAdminClient();

    // Get fixture
    const { data: fixture } = await admin
      .from('fixtures')
      .select('*')
      .eq('id', fixtureId)
      .single();

    if (!fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    }

    // Determine league config for seasonal offset
    const leagueKey = Object.entries(LEAGUES).find(
      ([, config]) => config.id === fixture.league_id
    );
    const leagueConfig = leagueKey ? LEAGUES[leagueKey[0]] : undefined;

    // Build seasonal context for the fixture's league
    const seasonalContext = leagueConfig
      ? buildSeasonalContext(
          leagueConfig.seasonStartMonth,
          leagueConfig.seasonEndMonth,
          leagueConfig.hemisphere
        )
      : undefined;

    // Call prediction engine (FastAPI) for λ_adj instead of Football Pro API
    const query = `${fixture.home_team} vs ${fixture.away_team}`;
    let lambdaHome = 1.5;
    let lambdaAway = 1.2;
    let enrichmentData = null;

    try {
      const enrichUrl = `${PREDICTION_ENGINE_URL}/predict?q=${encodeURIComponent(query)}`;
      const enrichRes = await fetch(enrichUrl, { signal: AbortSignal.timeout(10000) });

      if (enrichRes.ok) {
        enrichmentData = await enrichRes.json();
        const breakdown = enrichmentData.breakdown;
        lambdaHome = breakdown.form_home_expected;
        lambdaAway = breakdown.form_away_expected;
      } else {
        console.warn('[predict] Prediction engine returned', enrichRes.status, '- using defaults');
      }
    } catch (err) {
      console.warn('[predict] Prediction engine unreachable, using default λ:', err);
    }

    // Build Dixon-Coles params from λ_adj (or defaults if enrichment failed)
    const dcParams: DixonColesParams & { uncertaintyMultiplier: number } = {
      lambdaHome,
      lambdaAway,
      rho: -0.15,
      uncertaintyMultiplier: 1,
    };

    const adjustedDcParams = seasonalContext
      ? applySeasonalAdjustment(
          { lambdaHome: dcParams.lambdaHome, lambdaAway: dcParams.lambdaAway, rho: dcParams.rho },
          seasonalContext
        )
      : dcParams;

    const probs = calculateProbabilities(adjustedDcParams);

    // Monte Carlo simulation for confidence
    const simulation = monteCarloSimulation(adjustedDcParams);
    const confidenceScore = computeConfidenceScore(
      Math.round(simulation.homeWinRate * 100),
      100
    );

    // AI Agent analysis
    const analysis = await generateFullAnalysis(
      fixtureId,
      {
        homeTeam: fixture.home_team,
        awayTeam: fixture.away_team,
        leagueName: fixture.league_name,
        recentForm: {
          home: enrichmentData
            ? `λ_home=${lambdaHome.toFixed(2)}, confidence=${enrichmentData.confidence}`
            : 'Using default expectancy (enrichment unavailable)',
          away: `λ_away=${lambdaAway.toFixed(2)}`,
        },
        h2hSummary: enrichmentData
          ? `${enrichmentData.breakdown.h2h_samples} H2H matches (avg ${enrichmentData.breakdown.h2h_total_avg} goals)`
          : 'H2H data unavailable',
        dixonColes: {
          ...dcParams,
          ...probs,
        },
      },
      {
        ...dcParams,
        ...probs,
      }
    );

    // Apply uncertainty multiplier from seasonal adjustment
    const uncertaintyMult = adjustedDcParams.uncertaintyMultiplier || 1;
    const ciHalfWidth = 0.1 * (1 - confidenceScore) * uncertaintyMult;

    // Store analysis in Supabase
    const upsertData = {
      fixture_id: fixtureId,
      ...analysis,
      total_goals_confidence: (analysis.total_goals_confidence ?? 0.5) * (1 / uncertaintyMult),
      winner_confidence: (analysis.winner_confidence ?? 0.5) * (1 / uncertaintyMult),
      btts_confidence: (analysis.btts_confidence ?? 0.5) * (1 / uncertaintyMult),
      confidence_interval_low: Math.max(0, simulation.homeWinRate - ciHalfWidth),
      confidence_interval_high: Math.min(1, simulation.homeWinRate + ciHalfWidth),
    };

    const { data: stored } = await admin
      .from('ai_analyses')
      .upsert(upsertData)
      .select()
      .single();

    return NextResponse.json({ analysis: stored });
  } catch (error) {
    console.error('Prediction error:', error);
    return NextResponse.json({ error: 'Failed to generate prediction' }, { status: 500 });
  }
}
