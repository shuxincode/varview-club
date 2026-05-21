"""
Inference engine — computes λ_adj (adjusted goal expectancy).

Takes team form data and H2H data, applies weights, returns
the adjusted lambda that feeds into Dixon-Coles.
"""

import numpy as np

from .confidence import calculate_confidence


def compute_lambda_adj(
    home_matches: list[dict],
    away_matches: list[dict],
    h2h_matches: list[dict] | None = None,
) -> dict:
    """
    Calculate adjusted goal expectancy (λ_adj) from team form and H2H data.

    Form λ = weighted average of recent goals (last 5 weighted 2x)
    H2H λ = average total goals in direct encounters
    λ_adj = (0.7 * Form λ) + (0.3 * H2H λ)
    """
    # --- Home team attacking strength ---
    home_gf = _extract_goals_for(home_matches)
    away_ga = _extract_goals_against(away_matches)

    # --- Away team attacking strength ---
    away_gf = _extract_goals_for(away_matches)
    home_ga = _extract_goals_against(home_matches)

    # Weighted form: last 5 matches weighted 2x
    home_attack_form = _weighted_avg(home_gf, last_n_weight=5, weight_mult=2.0)
    away_defense_form = _weighted_avg(away_ga, last_n_weight=5, weight_mult=2.0)
    away_attack_form = _weighted_avg(away_gf, last_n_weight=5, weight_mult=2.0)
    home_defense_form = _weighted_avg(home_ga, last_n_weight=5, weight_mult=2.0)

    # Expected goals from form
    form_home_expected = (home_attack_form + away_defense_form) / 2.0
    form_away_expected = (away_attack_form + home_defense_form) / 2.0
    form_total = form_home_expected + form_away_expected

    # --- H2H component ---
    h2h_total = form_total  # fallback
    h2h_samples = 0

    if h2h_matches and len(h2h_matches) > 0:
        h2h_goals = []
        for m in h2h_matches:
            gf = m.get("goals_for")
            ga = m.get("goals_against")
            if gf is not None and ga is not None:
                h2h_goals.append(gf + ga)
        if h2h_goals:
            h2h_total = float(np.mean(h2h_goals))
            h2h_samples = len(h2h_goals)

    # --- Weighted synthesis ---
    h2h_weight = 0.3 if h2h_samples >= 3 else 0.15 if h2h_samples > 0 else 0.0
    form_weight = 1.0 - h2h_weight

    lambda_adj = (form_weight * form_total) + (h2h_weight * h2h_total)

    # --- Component breakdown for transparency ---
    confidence = calculate_confidence(
        home_goals=home_gf,
        away_goals=away_gf,
        h2h_goals=[m.get("goals_for", 0) + m.get("goals_against", 0) for m in (h2h_matches or [])
                   if m.get("goals_for") is not None and m.get("goals_against") is not None],
        lambda_adj=lambda_adj,
    )

    return {
        "lambda_adj": round(lambda_adj, 3),
        "confidence": round(confidence, 3),
        "form_home_expected": round(form_home_expected, 3),
        "form_away_expected": round(form_away_expected, 3),
        "h2h_total_avg": round(h2h_total, 3),
        "h2h_samples": h2h_samples,
        "form_weight": round(form_weight, 2),
        "h2h_weight": round(h2h_weight, 2),
        "home_matches_used": len([g for g in home_gf if g is not None]),
        "away_matches_used": len([g for g in away_gf if g is not None]),
    }


def _extract_goals_for(matches: list[dict]) -> list[float | None]:
    return [float(m["goals_for"]) if m.get("goals_for") is not None else None for m in matches]


def _extract_goals_against(matches: list[dict]) -> list[float | None]:
    return [float(m["goals_against"]) if m.get("goals_against") is not None else None for m in matches]


def _weighted_avg(values: list[float | None], last_n: int = 5, weight_mult: float = 2.0) -> float:
    """Weighted average: last N items get higher weight."""
    valid = [v for v in values if v is not None]
    if not valid:
        return 1.5  # league average fallback

    weights = [1.0] * len(valid)
    for i in range(max(0, len(valid) - last_n), len(valid)):
        weights[i] = weight_mult

    return float(np.average(valid, weights=weights))
