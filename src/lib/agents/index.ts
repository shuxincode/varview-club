// Goals band — Chairman's 2–3 goal prediction with gate evaluation and Poisson λ

export {
  chairmanGoalsBand,
  normalizeTeamName,
  getCalibrationLog,
  logCalibration,
  GoalsBandError,
  computeGoalsBandFromLambdas,
} from './chairman-goals-band';

export type {
  GoalsBandInput,
  GoalsBandPrediction,
  CalibrationEntry,
} from './chairman-goals-band';
