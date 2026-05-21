// ===== Chairman Synthesis: Pipeline Orchestrator =====

import type { ChairmanOutlierReport, MatchModifiers, ScoutFindings, ObserverFindings, StatisticianFindings } from '@/types/chairman-protocol';
import { estimateLambdas } from '@/lib/agents/team-ratings';
import { calculateProbabilities } from '@/lib/dixon-coles';
import type { DixonColesParams } from '@/lib/dixon-coles';
import { runAllAnalysts } from './analyst-data';
import { computeSignatureStack } from './signature-stack';
import type { SignatureInput } from './signature-stack';
import { evaluateVetos } from './veto-list';
import type { VetoInput } from './veto-list';
import { computeCompositeConfidence } from './composite-confidence';
import type { ConfidenceInput } from './composite-confidence';
import { computePriorityRanking } from './priority-ranking';
import type { PriorityInput } from './priority-ranking';
import { LEAGUE_BASE_GOAL_RATES, DEFAULT_LEAGUE_GOAL_RATE } from './constants';

// ============================================================
// Poisson probability for P(total goals >= 5)
// ============================================================

function poissonProb(k: number, lambda: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function calculateProbOver4_5(lambdaHome: number, lambdaAway: number): number {
  let prob = 0;
  // Sum probabilities where total goals >= 5 (up to 15 each for convergence)
  for (let i = 0; i <= 15; i++) {
    for (let j = 0; j <= 15; j++) {
      if (i + j >= 5) {
        prob += poissonProb(i, lambdaHome) * poissonProb(j, lambdaAway);
      }
    }
  }
  return Math.min(1, Math.max(0, prob));
}

// ============================================================
// Modifier computation from analyst data
// ============================================================

function computeModifiers(
  scout: ScoutFindings,
  observer: ObserverFindings,
): MatchModifiers {
  // Rest modifier: fewer rest days = fatigue penalty
  const minRest = Math.min(scout.moraleIndicators.managerTenureMonths > 0 ? observer.travel.homeRestDays : 5, observer.travel.awayRestDays);
  const restModifier = minRest < 4 ? 0.95 : minRest < 3 ? 0.90 : 1.0;

  // Availability modifier: key absences reduce scoring potential
  const totalAbsenceXg = scout.absences.reduce((s, a) => s + a.xgContributionLost, 0);
  const availabilityModifier = Math.max(0.85, 1 - totalAbsenceXg * 0.15);

  // Weather modifier: heavy rain/wind suppresses goals
  let weatherModifier = 1.0;
  if (observer.weather.precipitationProb > 0.6) weatherModifier -= 0.05;
  if (observer.weather.windKph > 30) weatherModifier -= 0.03;
  if (observer.venue.pitchCondition === 'heavy') weatherModifier -= 0.05;
  if (observer.venue.pitchCondition === 'wet') weatherModifier -= 0.02;

  // Referee modifier: high-card referees may reduce flow
  const refereeModifier = observer.referee.yellowCardsPerMatch > 4.5 ? 0.97 : 1.0;

  return {
    restModifier: Math.max(0.85, restModifier),
    availabilityModifier,
    weatherModifier: Math.max(0.85, weatherModifier),
    refereeModifier,
  };
}

// ============================================================
// Core synthesis function
// ============================================================

export async function synthesizeOutlierReport(
  homeTeam: string,
  awayTeam: string,
  league: string,
): Promise<ChairmanOutlierReport> {
  // Step 1: Run 3 parallel analysts
  const analysts = await runAllAnalysts(homeTeam, awayTeam, league);

  // Step 2: Extract structured findings
  const statFindings = analysts.statistician.findings as unknown as StatisticianFindings;
  const scoutFindings = analysts.scout.findings as unknown as ScoutFindings;
  const obsFindings = analysts.observer.findings as unknown as ObserverFindings;

  // Step 3: Estimate base lambdas from team ratings
  const estimated = estimateLambdas(homeTeam, awayTeam, league);

  // Step 4: Compute modifiers from qualitative data
  const modifiers = computeModifiers(scoutFindings, obsFindings);

  // Step 5: Apply modifiers to lambdas
  const combinedModifier = modifiers.restModifier * modifiers.availabilityModifier *
    modifiers.weatherModifier * modifiers.refereeModifier;
  const lambdaHome = +(estimated.lambdaHome * combinedModifier).toFixed(3);
  const lambdaAway = +(estimated.lambdaAway * combinedModifier).toFixed(3);

  // Step 6: Compute Dixon-Coles probabilities + P(over4.5)
  const dcParams: DixonColesParams = { lambdaHome, lambdaAway, rho: -0.1 };
  const dcProbs = calculateProbabilities(dcParams);
  const probOver4_5 = calculateProbOver4_5(lambdaHome, lambdaAway);

  // Step 7: Build signature stack input
  const sigInput: SignatureInput = {
    homeLambda: lambdaHome,
    awayLambda: lambdaAway,
    homeXgConceded: statFindings.homeAvgGoalsConceded,
    awayXgConceded: statFindings.awayAvgGoalsConceded,
    homeGoalkeeperPsxgMinusGoals: undefined,
    awayGoalkeeperPsxgMinusGoals: undefined,
    h2hAvgTotalGoals: statFindings.h2hAvgTotal,
    h2hSampleSize: statFindings.h2hSampleSize,
    homeStakes: scoutFindings.moraleIndicators.stakesForTeam,
    awayStakes: scoutFindings.moraleIndicators.stakesForTeam,
    goalDifferenceRelevant: obsFindings.competitionContext.goalDifferenceRelevance,
    homePress: scoutFindings.tacticalProfile.pressIntensity,
    awayBuildStyle: scoutFindings.tacticalProfile.buildStyle,
    homeTransition: scoutFindings.tacticalProfile.transitionSpeed,
    awayDefensiveLine: scoutFindings.tacticalProfile.defensiveLine,
    homeSetPieceThreat: scoutFindings.tacticalProfile.setPieceThreat,
    homeSetPieceVulnerability: scoutFindings.tacticalProfile.setPieceVulnerability,
    awaySetPieceThreat: scoutFindings.tacticalProfile.setPieceThreat,
    awaySetPieceVulnerability: scoutFindings.tacticalProfile.setPieceVulnerability,
    pitchCondition: obsFindings.venue.pitchCondition,
    windKph: obsFindings.weather.windKph,
    precipitationProb: obsFindings.weather.precipitationProb,
    homeDefensiveAbsenceXgLost: 0,
    awayDefensiveAbsenceXgLost: 0,
    refereePenaltiesPerMatch: obsFindings.referee.penaltiesPerMatch,
    refereeCardsPerMatch: obsFindings.referee.yellowCardsPerMatch,
    refereeCardsLowerQuartile: undefined,
  };

  // Distribute absences by team if specified
  for (const a of scoutFindings.absences) {
    // Default to home if we can't determine
    sigInput.homeDefensiveAbsenceXgLost += a.xgContributionLost;
  }

  const signatures = computeSignatureStack(sigInput);
  const totalDefensiveAbsenceXg = scoutFindings.absences.reduce((s, a) => s + a.xgContributionLost, 0);

  // Step 8: Build veto input
  const vetoInput: VetoInput = {
    homeStakes: scoutFindings.moraleIndicators.stakesForTeam,
    awayStakes: scoutFindings.moraleIndicators.stakesForTeam,
    pitchCondition: obsFindings.venue.pitchCondition,
    windKph: obsFindings.weather.windKph,
    precipitationProb: obsFindings.weather.precipitationProb,
    homeDefensiveLine: scoutFindings.tacticalProfile.defensiveLine,
    awayDefensiveLine: scoutFindings.tacticalProfile.defensiveLine,
    homeTransition: scoutFindings.tacticalProfile.transitionSpeed,
    awayTransition: scoutFindings.tacticalProfile.transitionSpeed,
    homeKeyAbsences: scoutFindings.absences.filter(a => a.xgContributionLost > 0.1).length,
    awayKeyAbsences: 0,
    isFriendly: false,
    isPostMajorTournament: false,
    refereeCardsPerMatch: obsFindings.referee.yellowCardsPerMatch,
    refereeStoppageTimeUpperQuartile: undefined,
    marketVolume: 'moderate',
    lineMovementContradictsModel: false,
    modelVsMarketGap: 0,
    altitudeMetres: obsFindings.venue.altitudeMetres,
    visitorPlayedAltitudeRecently: false,
  };

  const vetos = evaluateVetos(vetoInput);

  // Step 9: Build confidence input
  const confidenceInput: ConfidenceInput = {
    probOver4_5,
    signaturePassRate: signatures.passRate,
    signatureTotalPassed: signatures.totalPassed,
    marketEdge: 0, // neutral — no odds API
    isVetoed: vetos.isVetoed,
    vetoEffectiveMultiplier: vetos.effectiveMultiplier,
  };

  const confidence = computeCompositeConfidence(confidenceInput);

  // Step 10: Build priority input
  const priorityInput: PriorityInput = {
    compositeConfidence: confidence.compositeConfidence,
    probOver4_5,
    closenessToKickoffHours: 48, // default — caller can override
    leagueReputation: league === 'Premier League' || league === 'Champions League' ? 1.0
      : league === 'Bundesliga' || league === 'La Liga' || league === 'Serie A' || league === 'Ligue 1' ? 0.9
      : league === 'Eredivisie' || league === 'Europa League' ? 0.8
      : 0.6,
    isLiveMatch: false,
  };

  const priority = computePriorityRanking(priorityInput);

  // Step 11: Compute market-implied probability (neutral when no odds API)
  const marketImpliedProb = 0.15;
  const marketEdge = (probOver4_5 - marketImpliedProb) * 100;

  // Step 12: Derive drivers and risks
  const primaryDrivers: string[] = [];
  const primaryRisks: string[] = [];

  if (lambdaHome + lambdaAway > 3.0) {
    primaryDrivers.push(`Combined λ of ${(lambdaHome + lambdaAway).toFixed(2)} suggests high-scoring environment`);
  }
  if (probOver4_5 > 0.3) {
    primaryDrivers.push(`P(over4.5) = ${(probOver4_5 * 100).toFixed(1)}%`);
  }
  for (const c of signatures.conditions) {
    if (c.passed) {
      primaryDrivers.push(c.label);
    }
  }
  for (const v of vetos.vetos) {
    if (v.triggered) {
      primaryRisks.push(v.label);
    }
  }
  if (vetos.isVetoed) {
    primaryRisks.push('Hard veto triggered — match disqualified');
  }
  if (modifiers.weatherModifier < 0.95) {
    primaryRisks.push('Adverse weather may suppress goals');
  }
  if (totalDefensiveAbsenceXg > 0.3) {
    primaryRisks.push(`Total ${totalDefensiveAbsenceXg.toFixed(2)} xG lost to defensive absences`);
  }

  const totalLambda = lambdaHome + lambdaAway;

  // Step 13: Build reasoning summary
  const reasoningSummary = [
    `${homeTeam} (λ=${lambdaHome.toFixed(2)}) vs ${awayTeam} (λ=${lambdaAway.toFixed(2)}) — total λ=${totalLambda.toFixed(2)}.`,
    `P(over4.5) = ${(probOver4_5 * 100).toFixed(1)}%.`,
    `Signatures: ${signatures.totalPassed}/${signatures.totalConditions} passed (${(signatures.passRate * 100).toFixed(0)}%).`,
    vetos.isVetoed ? `VETOED (${vetos.hardVetoCount} hard + ${vetos.softVetoCount} soft).` : `${vetos.softVetoCount} soft vetoes, no hard vetoes.`,
    `Composite confidence: ${(confidence.compositeConfidence * 100).toFixed(1)}% → ${confidence.confidenceLabel}.`,
    `Priority: ${priority.tier} (${priority.priorityScore.toFixed(1)}/10).`,
  ].join(' ');

  return {
    fixture: { homeTeam, awayTeam, league },
    status: confidence.confidenceLabel,
    statusReason: confidence.confidenceLabel === 'FLAGGED'
      ? 'High-confidence outlier: all gates passed with strong conviction'
      : confidence.confidenceLabel === 'WATCH'
      ? 'Moderate-confidence candidate: some gates passed, monitor closely'
      : 'Low confidence: insufficient signal for over-4.5 outlier flag',

    lambdaHome,
    lambdaAway,
    totalLambda,
    probOver4_5,
    marketImpliedProb,
    marketEdge,

    signatures,
    vetos,
    confidence,
    priority,

    statistician: analysts.statistician,
    scout: analysts.scout,
    observer: analysts.observer,

    modifiers,

    primaryDrivers: primaryDrivers.slice(0, 5),
    primaryRisks: primaryRisks.slice(0, 5),
    reasoningSummary,
    dataConfidenceComposite: (analysts.statistician.dataConfidence + analysts.scout.dataConfidence + analysts.observer.dataConfidence) / 3,
  };
}
