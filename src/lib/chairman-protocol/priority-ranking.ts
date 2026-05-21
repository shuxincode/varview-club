// ===== Priority Ranking Formula (Section VI) =====

import type { PriorityRanking } from '@/types/chairman-protocol';

export interface PriorityInput {
  compositeConfidence: number;
  probOver4_5: number;
  closenessToKickoffHours: number; // 0-168
  leagueReputation: number; // 0-1 (higher for top leagues)
  isLiveMatch: boolean;
}

export function computePriorityRanking(input: PriorityInput): PriorityRanking {
  // Urgency score based on time to kickoff (Section VI)
  let urgencyScore: number;
  if (input.isLiveMatch) {
    urgencyScore = 9;
  } else if (input.closenessToKickoffHours <= 2) {
    urgencyScore = 10;
  } else if (input.closenessToKickoffHours <= 6) {
    urgencyScore = 8;
  } else if (input.closenessToKickoffHours <= 24) {
    urgencyScore = 6;
  } else if (input.closenessToKickoffHours <= 72) {
    urgencyScore = 4;
  } else {
    urgencyScore = 2;
  }

  // Conviction score (0-10)
  const convictionScore = Math.min(10, input.compositeConfidence * 10);

  // Priority score (Section VI formula)
  const priorityScore = (urgencyScore * convictionScore) / 10;

  // Tier assignment
  let tier: 'ELITE' | 'HIGH' | 'MEDIUM' | 'LOW';
  if (priorityScore >= 7) {
    tier = 'ELITE';
  } else if (priorityScore >= 5) {
    tier = 'HIGH';
  } else if (priorityScore >= 3) {
    tier = 'MEDIUM';
  } else {
    tier = 'LOW';
  }

  return {
    priorityScore,
    tier,
  };
}
