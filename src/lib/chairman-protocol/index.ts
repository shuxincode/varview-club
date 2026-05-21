// ===== Chairman's Protocol: Over-4.5 Outlier Detection =====

export { computeSignatureStack } from './signature-stack';
export type { SignatureInput } from './signature-stack';

export { evaluateVetos } from './veto-list';
export type { VetoInput } from './veto-list';

export { computeCompositeConfidence } from './composite-confidence';
export type { ConfidenceInput } from './composite-confidence';

export { computeRelevanceIndex } from './relevance-index';
export type { RelevanceInput } from './relevance-index';

export { analyzeStatistician, analyzeScout, analyzeObserver, runAllAnalysts } from './analyst-data';

export { synthesizeOutlierReport } from './chairman-synthesis';

export {
  ELEVATED_THRESHOLD,
  MODERATE_THRESHOLD,
  POISSON_P_OVER_45_THRESHOLD,
  MODEL_SPREAD_THRESHOLD,
  GATE1_WEIGHT,
  GATE2_WEIGHT,
  GATE3_WEIGHT,
  GATE4_WEIGHT,
  SIG_MIN_SCORE,
  LEAGUE_BASE_GOAL_RATES,
  DEFAULT_LEAGUE_GOAL_RATE,
} from './constants';
