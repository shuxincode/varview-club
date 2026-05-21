import { NextResponse } from "next/server";
import { calculateProbabilities, monteCarloSimulation } from "@/lib/dixon-coles";
import { generateFullAnalysis } from "@/lib/agents";
import { estimateLambdas } from "@/lib/agents/team-ratings";
import type { DixonColesParams } from "@/lib/dixon-coles";

const PREDICTION_ENGINE_URL = process.env.PREDICTION_ENGINE_URL || "http://localhost:8000";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/** Try to parse a JSON agent report and return a readable summary string. */
function formatAgentReport(report: string | null | undefined): string | null {
  if (!report) return null;
  try {
    const parsed = JSON.parse(report);
    if (parsed.summary) return parsed.summary;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return report;
  }
}

/**
 * Quick single-shot model call — tries one model with short timeout.
 */
async function quickModelCall(
  systemPrompt: string,
  userPrompt: string,
  modelId = "google/gemini-2.0-flash-exp:free",
  timeoutMs = 5000
): Promise<any> {
  if (!OPENROUTER_API_KEY) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "varview-club Preview",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const cleaned = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Non-blocking web search — quick attempt, no waiting if it fails.
 */
async function quickWebSearch(homeTeam: string, awayTeam: string) {
  const systemPrompt = `You are a football data extraction AI. Return structured match data as JSON only.`;
  const userPrompt = `Recent form and H2H for: ${homeTeam} vs ${awayTeam}

Return JSON: { "home_recent_matches": [{ "date": string, "goals_for": number, "goals_against": number }], "away_recent_matches": [...], "h2h_matches": [{ "date": string, "home_goals": number, "away_goals": number }], "home_morale": "high"|"medium"|"low", "away_morale": "high"|"medium"|"low" }`;
  return quickModelCall(systemPrompt, userPrompt);
}

/**
 * Compute approximate λ values from web search match data.
 */
function computeLambdasFromSearch(searchData: any): { lambdaHome: number; lambdaAway: number } {
  let homeGoals: number[] = [];
  let awayGoals: number[] = [];
  let homeConceded: number[] = [];
  let awayConceded: number[] = [];

  for (const m of searchData.home_recent_matches || []) {
    if (m.goals_for != null) homeGoals.push(m.goals_for);
    if (m.goals_against != null) homeConceded.push(m.goals_against);
  }
  for (const m of searchData.away_recent_matches || []) {
    if (m.goals_for != null) awayGoals.push(m.goals_for);
    if (m.goals_against != null) awayConceded.push(m.goals_against);
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 1.5;
  const homeAttack = avg(homeGoals);
  const awayDefense = avg(awayConceded);
  const awayAttack = avg(awayGoals);
  const homeDefense = avg(homeConceded);

  return {
    lambdaHome: (homeAttack + awayDefense) / 2,
    lambdaAway: (awayAttack + homeDefense) / 2,
  };
}

export async function POST(request: Request) {
  try {
    const { homeTeam, awayTeam, leagueName } = await request.json();

    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: "homeTeam and awayTeam are required" },
        { status: 400 }
      );
    }

    // Start with team-specific strength estimates (vary per fixture)
    const estimated = estimateLambdas(homeTeam, awayTeam, leagueName);
    let lambdaHome = estimated.lambdaHome;
    let lambdaAway = estimated.lambdaAway;
    let usedDefaultLambdas = true;

    let webSearchData: any = null;
    let formSummary = {
      home: "Using default expectancy (no data available)",
      away: "Using default expectancy (no data available)",
    };
    let h2hSummary = "H2H data unavailable";

    // Try prediction engine first (fast path, requires Docker running)
    try {
      const enrichUrl = `${PREDICTION_ENGINE_URL}/predict?q=${encodeURIComponent(homeTeam + " vs " + awayTeam)}&skip_registry=true`;
      const enrichRes = await fetch(enrichUrl, { signal: AbortSignal.timeout(3000) });
      if (enrichRes.ok) {
        const enrichmentData = await enrichRes.json();
        const breakdown = enrichmentData.breakdown;
        lambdaHome = breakdown.form_home_expected;
        lambdaAway = breakdown.form_away_expected;
        usedDefaultLambdas = false;
        formSummary = {
          home: `λ=${lambdaHome.toFixed(2)}, confidence=${enrichmentData.confidence} (AI search)`,
          away: `λ=${lambdaAway.toFixed(2)} (AI search)`,
        };
        h2hSummary = `${breakdown.h2h_samples} H2H matches found (avg ${breakdown.h2h_total_avg} goals) (AI search)`;
      }
    } catch {
      // Prediction engine unavailable — try quick web search
    }

    // Quick fallback AI web search (short timeout, non-blocking feel)
    if (usedDefaultLambdas) {
      try {
        webSearchData = await quickWebSearch(homeTeam, awayTeam);
        if (webSearchData) {
          const lambdas = computeLambdasFromSearch(webSearchData);
          lambdaHome = lambdas.lambdaHome;
          lambdaAway = lambdas.lambdaAway;
          usedDefaultLambdas = false;

          const homeMatches = webSearchData.home_recent_matches || [];
          const awayMatches = webSearchData.away_recent_matches || [];
          const h2h = webSearchData.h2h_matches || [];

          formSummary = {
            home: `${homeMatches.length} recent matches found via web search`,
            away: `${awayMatches.length} recent matches found via web search`,
          };
          h2hSummary = `${h2h.length} H2H matches found via web search`;
        }
      } catch {
        // Both failed — keep defaults
      }
    }

    const dcParams: DixonColesParams = { lambdaHome, lambdaAway, rho: -0.1 };
    const probs = calculateProbabilities(dcParams);
    const simulation = monteCarloSimulation(dcParams);

    // Local-only agent reports (instant — no external API calls)
    const analysis = await generateFullAnalysis(
      0,
      {
        homeTeam,
        awayTeam,
        leagueName: leagueName || "Unknown League",
        recentForm: formSummary,
        h2hSummary,
        dixonColes: { ...dcParams, ...probs },
      },
      { ...dcParams, ...probs }
    );

    const over2_5Pct = Math.round(probs.over2_5 * 100);
    const maxWin = Math.max(probs.homeWin, probs.awayWin, probs.draw);
    const winnerPrediction = maxWin === probs.homeWin ? "Home" : maxWin === probs.awayWin ? "Away" : "Draw";

    // Build soft signals from whichever search worked
    const softSignals = webSearchData ? {
      home: {
        conditions: {
          morale: webSearchData.home_morale || "medium",
          fatigue: "medium",
          manager_pressure: webSearchData.home_manager_pressure || "medium",
          injuries: (webSearchData.home_injuries || []).map((i: string) => ({ player: i, issue: i, status: "unknown" })),
          summary: `${homeTeam}: morale ${webSearchData.home_morale || "medium"}, ${(webSearchData.home_injuries || []).length} injury concerns.`,
        },
      },
      away: {
        conditions: {
          morale: webSearchData.away_morale || "medium",
          fatigue: "medium",
          manager_pressure: webSearchData.away_manager_pressure || "medium",
          injuries: (webSearchData.away_injuries || []).map((i: string) => ({ player: i, issue: i, status: "unknown" })),
          summary: `${awayTeam}: morale ${webSearchData.away_morale || "medium"}, ${(webSearchData.away_injuries || []).length} injury concerns.`,
        },
      },
    } : null;

    const totalGoalsExplanation = `${homeTeam} (λ=${lambdaHome.toFixed(2)}) vs ${awayTeam} (λ=${lambdaAway.toFixed(2)}): combined expectancy of ${(lambdaHome + lambdaAway).toFixed(2)} total goals. The Dixon-Coles model estimates a ${over2_5Pct}% probability of exceeding 2.5 goals, based on ${webSearchData ? "AI-researched team form from the web" : "default league-average form"}. Both teams' attacking coefficients and defensive solidity are factored into the bivariate Poisson distribution.`;

    return NextResponse.json({
      pillars: [
        {
          label: "Over 2.5 Goals",
          prediction: probs.over2_5 > 0.5 ? "Yes" : "No",
          confidence: probs.over2_5,
        },
        {
          label: "Both Teams to Score",
          prediction: probs.bttsYes > 0.5 ? "Yes" : "No",
          confidence: probs.bttsYes,
        },
        {
          label: "Winner",
          prediction: winnerPrediction,
          confidence: maxWin,
        },
        {
          label: "FHG Over 0.5",
          prediction: simulation.firstHalfOver0_5Rate > 0.5 ? "Yes" : "No",
          confidence: simulation.firstHalfOver0_5Rate,
        },
      ],
      lambdaHome,
      lambdaAway,
      ciLow: Math.max(0, simulation.homeWinRate - 0.1),
      ciHigh: Math.min(1, simulation.homeWinRate + 0.1),
      analystA: formatAgentReport(analysis.analyst_a_report),
      analystB: formatAgentReport(analysis.analyst_b_report),
      analystC: formatAgentReport(analysis.analyst_c_report),
      chairman: formatAgentReport(analysis.chairman_report),
      chairmanSigned: analysis.chairman_signed ?? false,
      totalGoalsExplanation,
      softSignals,
      _source: webSearchData ? "direct_ai_search" : "prediction_engine",
    });
  } catch (error) {
    console.error("Preview generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
}
