// ===== Analyst Data Layer: 3 Archetypes (Hybrid AI + Synthetic Fallback) =====

import type {
  AnalystAssessment,
  StatisticianFindings,
  ScoutFindings,
  ObserverFindings,
} from '@/types/chairman-protocol';
import { getTeamRating } from '@/lib/agents/team-ratings';
import { LEAGUE_BASE_GOAL_RATES, DEFAULT_LEAGUE_GOAL_RATE } from './constants';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/** Quick single-shot OpenRouter call with short timeout. */
async function quickModelCall(
  systemPrompt: string,
  userPrompt: string,
  modelId = 'google/gemini-2.0-flash-exp:free',
  timeoutMs = 5000,
): Promise<any> {
  if (!OPENROUTER_API_KEY) return null;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'varview-club Chairman Protocol',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) return null;
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ============================================================
// Statistician: quantitative data (form, xG, H2H, league context)
// ============================================================

function syntheticStatistician(homeTeam: string, awayTeam: string, league: string): StatisticianFindings {
  const homeRating = getTeamRating(homeTeam);
  const awayRating = getTeamRating(awayTeam);
  const leagueAvg = LEAGUE_BASE_GOAL_RATES[league] ?? DEFAULT_LEAGUE_GOAL_RATE;

  return {
    attackingRating: homeRating.attack / 2.2, // normalize to 0-1
    defensiveRating: 1 - homeRating.defense / 2.2, // inverted: higher = better defense
    homeRecentAvgGoals: homeRating.attack,
    awayRecentAvgGoals: awayRating.attack,
    homeAvgGoalsConceded: homeRating.defense,
    awayAvgGoalsConceded: awayRating.defense,
    homeBTTSRate: 0.55,
    awayBTTSRate: 0.50,
    h2hAvgTotal: Math.min(4.5, Math.max(1.5, (homeRating.attack + awayRating.attack) * 0.9)),
    h2hSampleSize: 3,
    leagueAvgGoals: leagueAvg,
  };
}

async function aiStatistician(homeTeam: string, awayTeam: string, league: string): Promise<StatisticianFindings | null> {
  const systemPrompt = `You are a football statistics analyst. Return structured JSON with team form data.
Use your training knowledge to provide realistic estimates. Never return null fields.`;
  const userPrompt = `Return detailed statistics for ${homeTeam} vs ${awayTeam} (${league}) as JSON:
{
  "homeRecentAvgGoals": number,
  "awayRecentAvgGoals": number,
  "homeAvgGoalsConceded": number,
  "awayAvgGoalsConceded": number,
  "homeBTTSRate": number,
  "awayBTTSRate": number,
  "h2hAvgTotal": number,
  "h2hSampleSize": number
}
Use realistic values based on known team strength. h2hSampleSize should be 1-10.`;
  const result = await quickModelCall(systemPrompt, userPrompt);
  if (!result || typeof result.homeRecentAvgGoals !== 'number') return null;

  const leagueAvg = LEAGUE_BASE_GOAL_RATES[league] ?? DEFAULT_LEAGUE_GOAL_RATE;
  const homeRating = getTeamRating(homeTeam);
  const awayRating = getTeamRating(awayTeam);

  return {
    attackingRating: homeRating.attack / 2.2,
    defensiveRating: 1 - homeRating.defense / 2.2,
    homeRecentAvgGoals: result.homeRecentAvgGoals,
    awayRecentAvgGoals: result.awayRecentAvgGoals,
    homeAvgGoalsConceded: result.homeAvgGoalsConceded,
    awayAvgGoalsConceded: result.awayAvgGoalsConceded,
    homeBTTSRate: Math.min(1, Math.max(0, result.homeBTTSRate)),
    awayBTTSRate: Math.min(1, Math.max(0, result.awayBTTSRate)),
    h2hAvgTotal: Math.min(6, Math.max(0.5, result.h2hAvgTotal)),
    h2hSampleSize: Math.max(1, Math.min(20, Math.round(result.h2hSampleSize))),
    leagueAvgGoals: leagueAvg,
  };
}

export async function analyzeStatistician(
  homeTeam: string,
  awayTeam: string,
  league: string,
): Promise<AnalystAssessment> {
  const aiData = await aiStatistician(homeTeam, awayTeam, league);
  const findings = aiData ?? syntheticStatistician(homeTeam, awayTeam, league);

  return {
    agent: 'statistician',
    report: JSON.stringify(findings),
    summary: `${homeTeam} avg ${findings.homeRecentAvgGoals.toFixed(2)} GF, ${findings.homeAvgGoalsConceded.toFixed(2)} GA | ${awayTeam} avg ${findings.awayRecentAvgGoals.toFixed(2)} GF, ${findings.awayAvgGoalsConceded.toFixed(2)} GA | H2H avg ${findings.h2hAvgTotal.toFixed(1)} over ${findings.h2hSampleSize} matches`,
    findings: findings as unknown as Record<string, unknown>,
    dataConfidence: aiData ? 0.75 : 0.50,
  };
}

// ============================================================
// Scout: tactical profile, players, morale, absences
// ============================================================

function syntheticScout(homeTeam: string, awayTeam: string): ScoutFindings {
  return {
    topPlayers: [
      { name: `${homeTeam} CF`, position: 'FW', xgPer90: 0.45, formRating: 7, fitnessStatus: 'full' },
      { name: `${homeTeam} Winger`, position: 'LW', xgPer90: 0.35, formRating: 7, fitnessStatus: 'full' },
      { name: `${awayTeam} CF`, position: 'FW', xgPer90: 0.40, formRating: 7, fitnessStatus: 'full' },
      { name: `${awayTeam} Winger`, position: 'LW', xgPer90: 0.30, formRating: 7, fitnessStatus: 'full' },
    ],
    tacticalProfile: {
      buildStyle: 'mixed',
      pressIntensity: 'mid',
      defensiveLine: 'mid',
      transitionSpeed: 'balanced',
      setPieceThreat: 5,
      setPieceVulnerability: 5,
    },
    moraleIndicators: {
      managerTenureMonths: 18,
      squadUnity: 'neutral',
      mediaPressure: 0.5,
      stakesForTeam: 'routine',
    },
    absences: [],
  };
}

async function aiScout(homeTeam: string, awayTeam: string): Promise<ScoutFindings | null> {
  const systemPrompt = `You are a football scouting analyst. Return structured JSON with tactical and player data.
Use your training knowledge to provide realistic estimates for the teams mentioned.`;
  const userPrompt = `Analyze ${homeTeam} vs ${awayTeam}. Return JSON:
{
  "homeTactics": { "buildStyle": "long_ball"|"mixed"|"short_build", "pressIntensity": "low"|"mid"|"high", "defensiveLine": "deep"|"mid"|"high", "transitionSpeed": "slow"|"balanced"|"fast", "setPieceThreat": 0-10, "setPieceVulnerability": 0-10 },
  "awayTactics": { "buildStyle": "long_ball"|"mixed"|"short_build", "pressIntensity": "low"|"mid"|"high", "defensiveLine": "deep"|"mid"|"high", "transitionSpeed": "slow"|"balanced"|"fast", "setPieceThreat": 0-10, "setPieceVulnerability": 0-10 },
  "homeMorale": { "managerTenureMonths": number, "squadUnity": "positive"|"neutral"|"negative", "mediaPressure": 0-1, "stakesForTeam": "must_win"|"important"|"routine"|"dead_rubber" },
  "awayMorale": { "managerTenureMonths": number, "squadUnity": "positive"|"neutral"|"negative", "mediaPressure": 0-1, "stakesForTeam": "must_win"|"important"|"routine"|"dead_rubber" },
  "absences": [{ "team": "home"|"away", "position": string, "xgContributionLost": number }]
}`;
  const result = await quickModelCall(systemPrompt, userPrompt);
  if (!result || !result.homeTactics) return null;

  const homeTac = result.homeTactics;
  const awayTac = result.awayTactics;
  const homeMor = result.homeMorale;
  const awayMor = result.awayMorale;
  const absences: Array<{ position: string; xgContributionLost: number }> = [];

  for (const a of result.absences || []) {
    absences.push({ position: a.position, xgContributionLost: a.xgContributionLost ?? 0.1 });
  }

  // Merge home + away tactics into single profiles (use home tactics for both for the scout findings)
  return {
    topPlayers: [
      { name: `${homeTeam} Key Attacker`, position: 'FW', xgPer90: 0.45, formRating: 7, fitnessStatus: 'full' },
      { name: `${homeTeam} Playmaker`, position: 'MF', xgPer90: 0.15, formRating: 7, fitnessStatus: 'full' },
      { name: `${awayTeam} Key Attacker`, position: 'FW', xgPer90: 0.40, formRating: 7, fitnessStatus: 'full' },
      { name: `${awayTeam} Playmaker`, position: 'MF', xgPer90: 0.12, formRating: 7, fitnessStatus: 'full' },
    ],
    tacticalProfile: {
      buildStyle: homeTac.buildStyle ?? 'mixed',
      pressIntensity: homeTac.pressIntensity ?? 'mid',
      defensiveLine: homeTac.defensiveLine ?? 'mid',
      transitionSpeed: homeTac.transitionSpeed ?? 'balanced',
      setPieceThreat: Math.min(10, Math.max(0, homeTac.setPieceThreat ?? 5)),
      setPieceVulnerability: Math.min(10, Math.max(0, homeTac.setPieceVulnerability ?? 5)),
    },
    moraleIndicators: {
      managerTenureMonths: homeMor?.managerTenureMonths ?? 18,
      squadUnity: homeMor?.squadUnity ?? 'neutral',
      mediaPressure: Math.min(1, Math.max(0, homeMor?.mediaPressure ?? 0.5)),
      stakesForTeam: homeMor?.stakesForTeam ?? 'routine',
    },
    absences,
  };
}

export async function analyzeScout(
  homeTeam: string,
  awayTeam: string,
): Promise<AnalystAssessment> {
  const aiData = await aiScout(homeTeam, awayTeam);
  const findings = aiData ?? syntheticScout(homeTeam, awayTeam);

  return {
    agent: 'scout',
    report: JSON.stringify(findings),
    summary: `Tactical: ${findings.tacticalProfile.buildStyle} build, ${findings.tacticalProfile.pressIntensity} press, ${findings.tacticalProfile.defensiveLine} line | ${findings.absences.length} absence concerns | Stakes: ${findings.moraleIndicators.stakesForTeam}`,
    findings: findings as unknown as Record<string, unknown>,
    dataConfidence: aiData ? 0.70 : 0.45,
  };
}

// ============================================================
// Observer: environmental data (venue, weather, travel, referee)
// ============================================================

function syntheticObserver(): ObserverFindings {
  return {
    venue: {
      altitudeMetres: 50,
      pitchSurface: 'grass',
      pitchCondition: 'good',
      neutralVenue: false,
    },
    weather: {
      temperatureCelsius: 15,
      precipitationProb: 0.20,
      windKph: 12,
    },
    travel: {
      homeRestDays: 5,
      awayRestDays: 5,
      awayTravelKm: 150,
      awayTimezoneShift: 0,
    },
    referee: {
      yellowCardsPerMatch: 3.5,
      redCardsPerMatch: 0.10,
      penaltiesPerMatch: 0.25,
      matchesOfficiated: 25,
    },
    competitionContext: {
      matchdayNumber: 15,
      goalDifferenceRelevance: false,
      scenarioSummary: 'Regular league matchday',
    },
  };
}

async function aiObserver(homeTeam: string, awayTeam: string, league: string): Promise<ObserverFindings | null> {
  const systemPrompt = `You are a football match observer. Return structured JSON with environmental and match context data.
Use your training knowledge to provide realistic estimates.`;
  const userPrompt = `Return match context for ${homeTeam} vs ${awayTeam} (${league}) as JSON:
{
  "venue": { "altitudeMetres": number, "pitchSurface": "grass"|"hybrid"|"artificial", "pitchCondition": "excellent"|"good"|"wet"|"heavy"|"hard", "neutralVenue": boolean },
  "weather": { "temperatureCelsius": number, "precipitationProb": 0-1, "windKph": number },
  "travel": { "homeRestDays": number, "awayRestDays": number, "awayTravelKm": number, "awayTimezoneShift": number },
  "referee": { "yellowCardsPerMatch": number, "redCardsPerMatch": number, "penaltiesPerMatch": number, "matchesOfficiated": number },
  "matchContext": { "matchdayNumber": number, "goalDifferenceRelevance": boolean, "scenarioSummary": string }
}`;
  const result = await quickModelCall(systemPrompt, userPrompt);
  if (!result || !result.venue) return null;

  return {
    venue: {
      altitudeMetres: Math.max(0, result.venue.altitudeMetres ?? 50),
      pitchSurface: result.venue.pitchSurface ?? 'grass',
      pitchCondition: result.venue.pitchCondition ?? 'good',
      neutralVenue: result.venue.neutralVenue ?? false,
    },
    weather: {
      temperatureCelsius: result.weather?.temperatureCelsius ?? 15,
      precipitationProb: Math.min(1, Math.max(0, result.weather?.precipitationProb ?? 0.2)),
      windKph: Math.max(0, result.weather?.windKph ?? 12),
    },
    travel: {
      homeRestDays: Math.max(1, result.travel?.homeRestDays ?? 5),
      awayRestDays: Math.max(1, result.travel?.awayRestDays ?? 5),
      awayTravelKm: Math.max(0, result.travel?.awayTravelKm ?? 150),
      awayTimezoneShift: result.travel?.awayTimezoneShift ?? 0,
    },
    referee: {
      yellowCardsPerMatch: Math.max(0, result.referee?.yellowCardsPerMatch ?? 3.5),
      redCardsPerMatch: Math.max(0, result.referee?.redCardsPerMatch ?? 0.1),
      penaltiesPerMatch: Math.max(0, result.referee?.penaltiesPerMatch ?? 0.25),
      matchesOfficiated: Math.max(1, result.referee?.matchesOfficiated ?? 25),
    },
    competitionContext: {
      matchdayNumber: Math.max(1, result.matchContext?.matchdayNumber ?? 15),
      goalDifferenceRelevance: result.matchContext?.goalDifferenceRelevance ?? false,
      scenarioSummary: result.matchContext?.scenarioSummary ?? 'Regular league matchday',
    },
  };
}

export async function analyzeObserver(
  homeTeam: string,
  awayTeam: string,
  league: string,
): Promise<AnalystAssessment> {
  const aiData = await aiObserver(homeTeam, awayTeam, league);
  const findings = aiData ?? syntheticObserver();

  return {
    agent: 'observer',
    report: JSON.stringify(findings),
    summary: `${findings.venue.pitchCondition} pitch, ${findings.weather.temperatureCelsius}°C, ${findings.weather.windKph}kph wind, ${(findings.weather.precipitationProb * 100).toFixed(0)}% rain | Ref: ${findings.referee.yellowCardsPerMatch.toFixed(1)} YC, ${findings.referee.penaltiesPerMatch.toFixed(2)} pens/match`,
    findings: findings as unknown as Record<string, unknown>,
    dataConfidence: aiData ? 0.70 : 0.40,
  };
}

// ============================================================
// Combined runner
// ============================================================

export async function runAllAnalysts(
  homeTeam: string,
  awayTeam: string,
  league: string,
): Promise<{
  statistician: AnalystAssessment;
  scout: AnalystAssessment;
  observer: AnalystAssessment;
}> {
  const [statistician, scout, observer] = await Promise.all([
    analyzeStatistician(homeTeam, awayTeam, league),
    analyzeScout(homeTeam, awayTeam),
    analyzeObserver(homeTeam, awayTeam, league),
  ]);

  return { statistician, scout, observer };
}
