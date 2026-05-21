// ===== Veto List: 8 Automatic Disqualifications (Section VII) =====

import type { VetoResult, VetoCondition } from '@/types/chairman-protocol';
import { VETO_WIND_MAX, VETO_PRECIP_MAX, VETO_ALTITUDE_MAX, VETO_DEFINITIONS } from './constants';

export interface VetoInput {
  // VETO_01: Dead rubber mismatch
  homeStakes: 'must_win' | 'important' | 'routine' | 'dead_rubber';
  awayStakes: 'must_win' | 'important' | 'routine' | 'dead_rubber';

  // VETO_02: Adverse conditions
  pitchCondition: 'excellent' | 'good' | 'wet' | 'heavy' | 'hard';
  windKph: number;
  precipitationProb: number; // 0-1

  // VETO_03: Both teams defensive
  homeDefensiveLine: 'deep' | 'mid' | 'high';
  awayDefensiveLine: 'deep' | 'mid' | 'high';
  homeTransition: 'slow' | 'balanced' | 'fast';
  awayTransition: 'slow' | 'balanced' | 'fast';

  // VETO_04: Multiple key absences (>= 2 of top-5 outfield)
  homeKeyAbsences: number;
  awayKeyAbsences: number;

  // VETO_05: Friendly after major tournament
  isFriendly: boolean;
  isPostMajorTournament: boolean;

  // VETO_06: High-friction referee
  refereeCardsPerMatch: number;
  refereeCardsUpperQuartile?: number;
  refereeStoppageTimeUpperQuartile?: boolean;

  // VETO_07: Thin market + contradictory line movement
  marketVolume: 'thin' | 'moderate' | 'heavy';
  lineMovementContradictsModel: boolean;
  modelVsMarketGap: number; // percentage points

  // VETO_08: Extreme altitude
  altitudeMetres: number;
  visitorPlayedAltitudeRecently: boolean; // within last 12 months
}

export function evaluateVetos(input: VetoInput): VetoResult {
  const vetos: VetoCondition[] = [];
  const vetoesTriggered: string[] = [];
  let hardVetoCount = 0;
  let softVetoCount = 0;

  // VETO_01: Dead rubber mismatch
  const isoHome = input.homeStakes === 'dead_rubber';
  const isoAway = input.awayStakes === 'dead_rubber';
  const oppEngaged = input.homeStakes === 'important' || input.homeStakes === 'must_win' ||
    input.awayStakes === 'important' || input.awayStakes === 'must_win';
  const veto01 = (isoHome || isoAway) && oppEngaged;
  vetos.push({
    id: 'VETO_01',
    label: VETO_DEFINITIONS[0].label,
    triggered: veto01,
    description: veto01
      ? `One team (${isoHome ? 'home' : 'away'}) in dead rubber, opponent still has stakes`
      : 'No dead rubber mismatch',
  });
  if (veto01) { hardVetoCount++; vetoesTriggered.push('VETO_01'); }

  // VETO_02: Adverse conditions
  const heavyPitch = input.pitchCondition === 'heavy';
  const highWind = input.windKph > VETO_WIND_MAX;
  const highPrecip = input.precipitationProb > VETO_PRECIP_MAX;
  const veto02 = heavyPitch || highWind || highPrecip;
  vetos.push({
    id: 'VETO_02',
    label: VETO_DEFINITIONS[1].label,
    triggered: veto02,
    description: veto02
      ? `Pitch: ${input.pitchCondition}, Wind: ${input.windKph}kph, Precip: ${(input.precipitationProb * 100).toFixed(0)}%`
      : 'Conditions favourable for football',
  });
  if (veto02) { hardVetoCount++; vetoesTriggered.push('VETO_02'); }

  // VETO_03: Both teams defensive (deep line + slow/balanced transition)
  const bothDeep = input.homeDefensiveLine === 'deep' && input.awayDefensiveLine === 'deep';
  const bothSlowTrans = (input.homeTransition === 'slow' || input.homeTransition === 'balanced') &&
    (input.awayTransition === 'slow' || input.awayTransition === 'balanced');
  const veto03 = bothDeep && bothSlowTrans;
  vetos.push({
    id: 'VETO_03',
    label: VETO_DEFINITIONS[2].label,
    triggered: veto03,
    description: veto03
      ? 'Both teams playing deep defence with slow transitions — suppresses goals'
      : 'Not both teams defensively oriented',
  });
  if (veto03) { hardVetoCount++; vetoesTriggered.push('VETO_03'); }

  // VETO_04: Multiple key absences (>= 2 of top-5 outfield for either team)
  const veto04 = input.homeKeyAbsences >= 2 || input.awayKeyAbsences >= 2;
  vetos.push({
    id: 'VETO_04',
    label: VETO_DEFINITIONS[3].label,
    triggered: veto04,
    description: veto04
      ? `Home missing ${input.homeKeyAbsences}, Away missing ${input.awayKeyAbsences} key players`
      : 'No major absentee concerns',
  });
  if (veto04) { hardVetoCount++; vetoesTriggered.push('VETO_04'); }

  // VETO_05: Friendly after major tournament (rotation risk)
  const veto05 = input.isFriendly && input.isPostMajorTournament;
  vetos.push({
    id: 'VETO_05',
    label: VETO_DEFINITIONS[4].label,
    triggered: veto05,
    description: veto05
      ? 'Friendly match following major tournament — high rotation risk'
      : 'Not a post-tournament friendly',
  });
  if (veto05) { hardVetoCount++; vetoesTriggered.push('VETO_05'); }

  // VETO_06: High-friction referee (cards upper quartile + stoppage time upper quartile)
  const highCards = input.refereeCardsUpperQuartile != null
    ? input.refereeCardsPerMatch >= input.refereeCardsUpperQuartile
    : input.refereeCardsPerMatch >= 4.5;
  const veto06 = highCards && (input.refereeStoppageTimeUpperQuartile ?? false);
  vetos.push({
    id: 'VETO_06',
    label: VETO_DEFINITIONS[5].label,
    triggered: veto06,
    description: veto06
      ? `Referee: ${input.refereeCardsPerMatch.toFixed(1)} cards/match (high-friction)`
      : 'Referee not in high-friction category',
  });
  if (veto06) { softVetoCount++; vetoesTriggered.push('VETO_06'); }

  // VETO_07: Thin market + contradictory line movement
  const veto07 = input.marketVolume === 'thin' && input.lineMovementContradictsModel &&
    input.modelVsMarketGap > 15;
  vetos.push({
    id: 'VETO_07',
    label: VETO_DEFINITIONS[6].label,
    triggered: veto07,
    description: veto07
      ? `Thin market, line movement contradicts model by ${input.modelVsMarketGap.toFixed(0)}pp`
      : 'Market conditions acceptable',
  });
  if (veto07) { softVetoCount++; vetoesTriggered.push('VETO_07'); }

  // VETO_08: Extreme altitude with unprepared visitors
  const veto08 = input.altitudeMetres > VETO_ALTITUDE_MAX && !input.visitorPlayedAltitudeRecently;
  vetos.push({
    id: 'VETO_08',
    label: VETO_DEFINITIONS[7].label,
    triggered: veto08,
    description: veto08
      ? `Altitude ${input.altitudeMetres}m > ${VETO_ALTITUDE_MAX}m, visitors unprepared`
      : 'Altitude within normal range or visitors acclimated',
  });
  if (veto08) { softVetoCount++; vetoesTriggered.push('VETO_08'); }

  // Compute effective multiplier
  const hardMultiplier = hardVetoCount > 0 ? 0 : 1;
  const softPenalty = Math.min(softVetoCount * 0.10, 0.40); // max 40% penalty from soft vetoes
  const effectiveMultiplier = hardMultiplier * (1 - softPenalty);

  return {
    vetos,
    hardVetoCount,
    softVetoCount,
    isVetoed: hardVetoCount > 0,
    effectiveMultiplier,
    vetoesTriggered,
  };
}
