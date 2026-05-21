// ===== Signature Stack: 10-Point Qualitative Filter (Section V) =====

import type { SignatureStackResult, SignatureCondition } from '@/types/chairman-protocol';
import {
  SIG_TWIN_ATTACK_THRESHOLD,
  SIG_TWIN_DEFENSE_THRESHOLD,
  SIG_GOALKEEPER_WEAK_THRESHOLD,
  SIG_H2H_AVG_THRESHOLD,
  SIG_H2H_MIN_MATCHES,
  SIG_SET_PIECE_THRESHOLD,
  SIG_ABSENCE_XG_THRESHOLD,
  SIG_REF_PENALTY_THRESHOLD,
  SIGNATURE_DEFINITIONS,
} from './constants';

export interface SignatureInput {
  // SIG_01: Twin attack
  homeLambda: number;
  awayLambda: number;
  // SIG_02: Twin defense
  homeXgConceded: number;
  awayXgConceded: number;
  // SIG_03: Goalkeeper weakness
  homeGoalkeeperPsxgMinusGoals?: number; // PSxG - goals, positive = good
  awayGoalkeeperPsxgMinusGoals?: number;
  // SIG_04: Historical H2H
  h2hAvgTotalGoals: number;
  h2hSampleSize: number;
  // SIG_05: Stakes alignment
  homeStakes: 'must_win' | 'important' | 'routine' | 'dead_rubber';
  awayStakes: 'must_win' | 'important' | 'routine' | 'dead_rubber';
  goalDifferenceRelevant: boolean;
  // SIG_06: Tactical mismatch
  homePress: 'low' | 'mid' | 'high';
  awayBuildStyle: 'long_ball' | 'mixed' | 'short_build';
  homeTransition: 'slow' | 'balanced' | 'fast';
  awayDefensiveLine: 'deep' | 'mid' | 'high';
  // SIG_07: Set-piece asymmetry
  homeSetPieceThreat: number; // 0-10
  homeSetPieceVulnerability: number;
  awaySetPieceThreat: number;
  awaySetPieceVulnerability: number;
  // SIG_08: Environment
  pitchCondition: 'excellent' | 'good' | 'wet' | 'heavy' | 'hard';
  windKph: number;
  precipitationProb: number; // 0-1
  // SIG_09: Key absences
  homeDefensiveAbsenceXgLost: number;
  awayDefensiveAbsenceXgLost: number;
  // SIG_10: Referee
  refereePenaltiesPerMatch: number;
  refereeCardsPerMatch: number;
  refereeCardsLowerQuartile?: number;
}

export function computeSignatureStack(input: SignatureInput): SignatureStackResult {
  const conditions: SignatureCondition[] = [];
  const pointsSatisfied: string[] = [];

  // SIG_01: Twin attack signal — both teams adjusted_lambda_attack >= threshold
  const sig01 = input.homeLambda >= SIG_TWIN_ATTACK_THRESHOLD &&
    input.awayLambda >= SIG_TWIN_ATTACK_THRESHOLD;
  conditions.push({
    id: 'SIG_01',
    label: SIGNATURE_DEFINITIONS[0].label,
    passed: sig01,
    detail: sig01
      ? `Both teams: ${input.homeLambda.toFixed(2)}, ${input.awayLambda.toFixed(2)}`
      : `Home: ${input.homeLambda.toFixed(2)}, Away: ${input.awayLambda.toFixed(2)} (need >= ${SIG_TWIN_ATTACK_THRESHOLD})`,
  });
  if (sig01) pointsSatisfied.push('SIG_01');

  // SIG_02: Twin defensive vulnerability — both teams xG conceded >= threshold
  const sig02 = input.homeXgConceded >= SIG_TWIN_DEFENSE_THRESHOLD &&
    input.awayXgConceded >= SIG_TWIN_DEFENSE_THRESHOLD;
  conditions.push({
    id: 'SIG_02',
    label: SIGNATURE_DEFINITIONS[1].label,
    passed: sig02,
    detail: sig02
      ? `Both teams: ${input.homeXgConceded.toFixed(2)}, ${input.awayXgConceded.toFixed(2)}`
      : `Home: ${input.homeXgConceded.toFixed(2)}, Away: ${input.awayXgConceded.toFixed(2)} (need >= ${SIG_TWIN_DEFENSE_THRESHOLD})`,
  });
  if (sig02) pointsSatisfied.push('SIG_02');

  // SIG_03: Goalkeeper weakness — at least one keeper with PSxG - goals <= threshold
  const gkHomeWeak = input.homeGoalkeeperPsxgMinusGoals != null &&
    input.homeGoalkeeperPsxgMinusGoals <= SIG_GOALKEEPER_WEAK_THRESHOLD;
  const gkAwayWeak = input.awayGoalkeeperPsxgMinusGoals != null &&
    input.awayGoalkeeperPsxgMinusGoals <= SIG_GOALKEEPER_WEAK_THRESHOLD;
  const sig03 = gkHomeWeak || gkAwayWeak;
  conditions.push({
    id: 'SIG_03',
    label: SIGNATURE_DEFINITIONS[2].label,
    passed: sig03,
    detail: sig03
      ? gkHomeWeak
        ? `Home keeper: ${input.homeGoalkeeperPsxgMinusGoals?.toFixed(3)}`
        : `Away keeper: ${input.awayGoalkeeperPsxgMinusGoals?.toFixed(3)}`
      : 'Both keepers above weakness threshold',
  });
  if (sig03) pointsSatisfied.push('SIG_03');

  // SIG_04: Historical H2H signature — avg >= threshold with sufficient sample
  const sig04 = input.h2hAvgTotalGoals >= SIG_H2H_AVG_THRESHOLD &&
    input.h2hSampleSize >= SIG_H2H_MIN_MATCHES;
  conditions.push({
    id: 'SIG_04',
    label: SIGNATURE_DEFINITIONS[3].label,
    passed: sig04,
    detail: sig04
      ? `Avg ${input.h2hAvgTotalGoals.toFixed(1)} over ${input.h2hSampleSize} meetings`
      : `Avg ${input.h2hAvgTotalGoals.toFixed(1)} over ${input.h2hSampleSize} meetings (need >= ${SIG_H2H_AVG_THRESHOLD}, n >= ${SIG_H2H_MIN_MATCHES})`,
  });
  if (sig04) pointsSatisfied.push('SIG_04');

  // SIG_05: Stakes alignment — both teams need result with GD relevance
  const homeHighStakes = input.homeStakes === 'must_win' || input.homeStakes === 'important';
  const awayHighStakes = input.awayStakes === 'must_win' || input.awayStakes === 'important';
  const sig05 = homeHighStakes && awayHighStakes && input.goalDifferenceRelevant;
  conditions.push({
    id: 'SIG_05',
    label: SIGNATURE_DEFINITIONS[4].label,
    passed: sig05,
    detail: sig05
      ? `Both teams motivated (${input.homeStakes}, ${input.awayStakes}), GD relevant`
      : `Home: ${input.homeStakes}, Away: ${input.awayStakes}, GD relevant: ${input.goalDifferenceRelevant}`,
  });
  if (sig05) pointsSatisfied.push('SIG_05');

  // SIG_06: Tactical mismatch — high press vs long ball OR fast transition vs high line
  const pressVsBuild = input.homePress === 'high' && input.awayBuildStyle === 'long_ball';
  const transitionVsLine = input.homeTransition === 'fast' && input.awayDefensiveLine === 'high';
  // Also check reverse (away press vs home build)
  const pressVsBuildRev = input.awayBuildStyle === 'long_ball' && input.homePress === 'high'; // same condition
  const transitionVsLineRev = input.awayDefensiveLine === 'high' && input.homeTransition === 'fast'; // same
  const sig06 = pressVsBuild || transitionVsLine;
  conditions.push({
    id: 'SIG_06',
    label: SIGNATURE_DEFINITIONS[5].label,
    passed: sig06,
    detail: sig06
      ? pressVsBuild ? 'High press vs long ball creates transition chances'
      : 'Fast transitions vs high defensive line'
      : 'No clear tactical mismatch favouring goals',
  });
  if (sig06) pointsSatisfied.push('SIG_06');

  // SIG_07: Set-piece asymmetry — threat >= 7 facing vulnerability >= 7
  const homeSpAsym = input.homeSetPieceThreat >= SIG_SET_PIECE_THRESHOLD &&
    input.awaySetPieceVulnerability >= SIG_SET_PIECE_THRESHOLD;
  const awaySpAsym = input.awaySetPieceThreat >= SIG_SET_PIECE_THRESHOLD &&
    input.homeSetPieceVulnerability >= SIG_SET_PIECE_THRESHOLD;
  const sig07 = homeSpAsym || awaySpAsym;
  conditions.push({
    id: 'SIG_07',
    label: SIGNATURE_DEFINITIONS[6].label,
    passed: sig07,
    detail: sig07
      ? homeSpAsym
        ? `Home SP threat ${input.homeSetPieceThreat} vs Away SP vuln ${input.awaySetPieceVulnerability}`
        : `Away SP threat ${input.awaySetPieceThreat} vs Home SP vuln ${input.homeSetPieceVulnerability}`
      : 'No set-piece asymmetry above threshold',
  });
  if (sig07) pointsSatisfied.push('SIG_07');

  // SIG_08: Environment permits — pitch ok, wind low, precip low
  const pitchOk = input.pitchCondition === 'excellent' || input.pitchCondition === 'good' || input.pitchCondition === 'hard';
  const windOk = input.windKph <= 25;
  const precipOk = input.precipitationProb <= 0.40;
  const sig08 = pitchOk && windOk && precipOk;
  conditions.push({
    id: 'SIG_08',
    label: SIGNATURE_DEFINITIONS[7].label,
    passed: sig08,
    detail: sig08
      ? 'Pitch, wind, and precipitation all favourable'
      : `Pitch: ${input.pitchCondition}, Wind: ${input.windKph}kph, Precip: ${(input.precipitationProb * 100).toFixed(0)}%`,
  });
  if (sig08) pointsSatisfied.push('SIG_08');

  // SIG_09: Key defensive absences — combined xG lost >= threshold
  const sig09 = (input.homeDefensiveAbsenceXgLost + input.awayDefensiveAbsenceXgLost) >= SIG_ABSENCE_XG_THRESHOLD;
  conditions.push({
    id: 'SIG_09',
    label: SIGNATURE_DEFINITIONS[8].label,
    passed: sig09,
    detail: sig09
      ? `Combined xG lost from defensive absences: ${(input.homeDefensiveAbsenceXgLost + input.awayDefensiveAbsenceXgLost).toFixed(2)}`
      : `Defensive absence xG lost: home ${input.homeDefensiveAbsenceXgLost.toFixed(2)}, away ${input.awayDefensiveAbsenceXgLost.toFixed(2)}`,
  });
  if (sig09) pointsSatisfied.push('SIG_09');

  // SIG_10: Referee tendency — penalties >= threshold AND lenient (cards in lower quartile)
  const refPenalties = input.refereePenaltiesPerMatch >= SIG_REF_PENALTY_THRESHOLD;
  const refLenient = input.refereeCardsLowerQuartile != null
    ? input.refereeCardsPerMatch <= input.refereeCardsLowerQuartile
    : input.refereeCardsPerMatch <= 3.5; // default lenient threshold
  const sig10 = refPenalties && refLenient;
  conditions.push({
    id: 'SIG_10',
    label: SIGNATURE_DEFINITIONS[9].label,
    passed: sig10,
    detail: sig10
      ? `Referee: ${input.refereePenaltiesPerMatch.toFixed(2)} pens/match, ${input.refereeCardsPerMatch.toFixed(1)} cards/match (lenient)`
      : `Referee: ${input.refereePenaltiesPerMatch.toFixed(2)} pens/match, ${input.refereeCardsPerMatch.toFixed(1)} cards/match`,
  });
  if (sig10) pointsSatisfied.push('SIG_10');

  const totalPassed = conditions.filter(c => c.passed).length;

  return {
    conditions,
    totalPassed,
    totalConditions: conditions.length,
    passRate: totalPassed / conditions.length,
    pointsSatisfied,
  };
}
