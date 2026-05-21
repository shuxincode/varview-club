// ===== Composite Confidence Formula (Section VIII) =====

import type { ConfidenceComponents } from '@/types/chairman-protocol';
import {
  POISSON_P_OVER_45_THRESHOLD,
  MARKET_EDGE_THRESHOLD,
  GATE1_WEIGHT,
  GATE2_WEIGHT,
  GATE3_WEIGHT,
  GATE4_WEIGHT,
  SIG_MIN_SCORE,
  FLAGGED_THRESHOLD,
  WATCH_THRESHOLD,
} from './constants';

export interface ConfidenceInput {
  probOver4_5: number; // from Dixon-Coles
  signaturePassRate: number; // from signature stack (0-1)
  signatureTotalPassed: number; // raw count
  marketEdge: number; // percentage points (model - market implied)
  isVetoed: boolean;
  vetoEffectiveMultiplier: number; // from veto list
}

export function computeCompositeConfidence(input: ConfidenceInput): ConfidenceComponents {
  // Gate 1: Poisson P(over4.5) — clamped to [0, 1], scored relative to threshold
  const gate1Score = Math.min(1.0, input.probOver4_5 / POISSON_P_OVER_45_THRESHOLD);

  // Gate 2: Signature stack — pass rate, with minimum points requirement
  const meetsMinSignatures = input.signatureTotalPassed >= SIG_MIN_SCORE;
  const gate2Score = meetsMinSignatures
    ? input.signaturePassRate
    : input.signaturePassRate * 0.5; // halved if below minimum 7 points

  // Gate 3: Market edge — scored relative to +12pp threshold
  const gate3Score = Math.min(1.0, Math.max(0.0, input.marketEdge / (MARKET_EDGE_THRESHOLD * 100)));

  // Gate 4: Veto multiplier — binary in practice
  const gate4Score = input.isVetoed ? 0.0 : Math.min(1.0, input.vetoEffectiveMultiplier);

  // Composite confidence (Section VIII formula)
  const compositeConfidence =
    (gate1Score * GATE1_WEIGHT) +
    (gate2Score * GATE2_WEIGHT) +
    (gate3Score * GATE3_WEIGHT) +
    (gate4Score * GATE4_WEIGHT);

  // Clamp to [0, 1]
  const clamped = Math.max(0, Math.min(1, compositeConfidence));

  // Determine label
  let confidenceLabel: 'FLAGGED' | 'WATCH' | 'PASS';
  if (input.isVetoed) {
    confidenceLabel = 'PASS';
  } else if (clamped >= FLAGGED_THRESHOLD && meetsMinSignatures) {
    confidenceLabel = 'FLAGGED';
  } else if (clamped >= WATCH_THRESHOLD) {
    confidenceLabel = 'WATCH';
  } else {
    confidenceLabel = 'PASS';
  }

  return {
    baseConfidence: input.probOver4_5,
    gate1Score,
    gate2Score,
    gate3Score,
    gate4Score,
    compositeConfidence: clamped,
    confidenceLabel,
  };
}
