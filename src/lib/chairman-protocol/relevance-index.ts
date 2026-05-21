// ===== Relevance Index Formula (Section VI) =====

import type { RelevanceIndex } from '@/types/chairman-protocol';

export interface RelevanceInput {
  compositeConfidence: number;
  probOver4_5: number;
  closenessToKickoffHours: number; // 0-168
  leagueReputation: number; // 0-1 (higher for top leagues)
  isLiveMatch: boolean;
}

export function computeRelevanceIndex(input: RelevanceInput): RelevanceIndex {
  // Proximity score based on time to kickoff (Section VI)
  let proximityScore: number;
  if (input.isLiveMatch) {
    proximityScore = 9;
  } else if (input.closenessToKickoffHours <= 2) {
    proximityScore = 10;
  } else if (input.closenessToKickoffHours <= 6) {
    proximityScore = 8;
  } else if (input.closenessToKickoffHours <= 24) {
    proximityScore = 6;
  } else if (input.closenessToKickoffHours <= 72) {
    proximityScore = 4;
  } else {
    proximityScore = 2;
  }

  // Signal score (0-10)
  const signalScore = Math.min(10, input.compositeConfidence * 10);

  // Relevance score (Section VI formula)
  const relevanceScore = (proximityScore * signalScore) / 10;

  // Tier assignment
  let tier: 'STRONG' | 'ELEVATED' | 'MODERATE' | 'LOW';
  if (relevanceScore >= 7) {
    tier = 'STRONG';
  } else if (relevanceScore >= 5) {
    tier = 'ELEVATED';
  } else if (relevanceScore >= 3) {
    tier = 'MODERATE';
  } else {
    tier = 'LOW';
  }

  return {
    relevanceScore,
    tier,
  };
}
