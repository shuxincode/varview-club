"""
Confidence scoring for λ_adj estimates.

Factors:
- Consistency: low std dev in recent scores → higher confidence
- H2H alignment: H2H avg close to λ_adj → bonus
- Data freshness: more recent matches → higher confidence
- Sample size: more data points → higher confidence
"""

import numpy as np


def calculate_confidence(
    home_goals: list[float | None],
    away_goals: list[float | None],
    h2h_goals: list[float],
    lambda_adj: float,
) -> float:
    """
    Compute a confidence score (0.1–1.0) for the λ_adj estimate.
    """
    score = 0.5  # base

    # 1. Consistency bonus — low std dev means more predictable
    all_goals = [g for g in home_goals + away_goals if g is not None]
    if len(all_goals) >= 3:
        std_dev = float(np.std(all_goals))
        if std_dev < 1.0:
            score += 0.2
        elif std_dev < 1.5:
            score += 0.1

    # 2. H2H alignment bonus
    if h2h_goals and len(h2h_goals) >= 2:
        h2h_avg = float(np.mean(h2h_goals))
        if abs(h2h_avg - lambda_adj) < 0.5:
            score += 0.1
        if len(h2h_goals) >= 5:
            score += 0.05  # ample H2H history

    # 3. Sample size bonus
    total_samples = len(all_goals)
    if total_samples >= 10:
        score += 0.1
    elif total_samples >= 5:
        score += 0.05

    # 4. Recent data bonus — matches in last 2 weeks get a bump
    # (Simplified: if we have enough data, assume it's recent)
    if total_samples >= 8:
        score += 0.05

    return min(round(score, 2), 1.0)
