"""
Soft Signal Scraper — agentic web navigation for non-statistical football data.

Collects qualitative intelligence: weather, morale, managerial pressure,
squad congestion, pitch quality, and match motivation. Designed for a
2-Analyst + 1-Chairman decision hierarchy.

Output format:
    {
        "raw_signals": { ... },
        "qualitative_scores": { "morale": 0.0-1.0, "fatigue": 0.0-1.0, "pressure": 0.0-1.0 },
        "contextual_anomalies": [ ... ]
    }
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Any


# ── Data models ──


@dataclass
class SoftSignalReport:
    match_id: str
    home_team: str
    away_team: str
    competition: str
    fixture_date: str
    venue: str = ""

    # Raw signals (extracted text / links)
    raw_signals: dict[str, list[str]] = field(default_factory=dict)

    # Normalised qualitative scores [0, 1]
    qualitative_scores: dict[str, float] = field(default_factory=dict)

    # Contextual anomalies (sudden news, travel issues, etc.)
    contextual_anomalies: list[dict[str, Any]] = field(default_factory=list)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(asdict(self), indent=indent, default=str)


# ── Query builders ──


def _build_search_queries(home: str, away: str, competition: str) -> dict[str, list[str]]:
    """Build targeted search queries for each signal category."""
    return {
        "weather": [
            f"{home} weather forecast {datetime.now().strftime('%B %Y')} precipitation wind",
            f"{home} stadium pitch conditions today",
        ],
        "morale_fans": [
            f"{home} vs {away} fan sentiment X reddit",
            f"{home} squad harmony rumours latest",
            f"{away} squad harmony rumours latest",
        ],
        "manager_pressure": [
            f"{home} manager sacking pressure news {competition}",
            f"{away} manager sacking pressure news {competition}",
        ],
        "injuries_squad": [
            f"{home} team news injuries suspension latest",
            f"{away} team news injuries suspension latest",
        ],
        "travel_congestion": [
            f"{home} last match result score",
            f"{away} last match result score",
            f"{away} travel distance to {home}",
        ],
        "pitch_quality": [
            f"{home} stadium pitch quality groundsman report",
            f"{home} pitch irrigation surface condition",
        ],
        "match_context": [
            f"{home} vs {away} preview {competition} stakes",
            f"{home} vs {away} rivalry derby history",
        ],
    }


# ── Signal extraction helpers ──


def _extract_morale(texts: list[str]) -> dict[str, float]:
    """Score morale (0 = awful, 1 = euphoric) from text signals."""
    positive = [
        "win", "victory", "confident", "form", " unbeaten", "top of",
        "euphoria", "support", "together", "spirit", "belief", "trust",
        "momentum", "run", "quality", "class", "dominant",
    ]
    negative = [
        "crisis", "loss", "defeat", " turmoil", "unrest", "protest",
        "sack", "pressure", " fan", "anger", "anxious", "nervous",
        "slide", "rut", "struggle", "drop", "injuries", "suspend",
    ]
    pos_count = sum(1 for t in texts for w in positive if w.lower() in t.lower())
    neg_count = sum(1 for t in texts for w in negative if w.lower() in t.lower())
    total = pos_count + neg_count
    if total == 0:
        return 0.5
    raw = pos_count / total
    # Normalise — scores tend to cluster in the middle
    return round(raw, 2)


def _extract_pressure(texts: list[str]) -> float:
    """Score board-level / managerial pressure (0 = cool, 1 = hot seat)."""
    hot = [
        "sack", "fired", "dismiss", "board", "ultimatum", "vote of confidence",
        "pressure", "crisis meeting", "emergency", "replace", "candidate",
        "shortlist", "out of work", "ruthless",
    ]
    cool = [
        "extend", "contract", "backing", "support", "trust", "long-term",
        "project", "patience", "faith", "committed",
    ]
    hot_count = sum(1 for t in texts for w in hot if w.lower() in t.lower())
    cool_count = sum(1 for t in texts for w in cool if w.lower() in t.lower()) * 2  # weighted
    net = hot_count - cool_count
    # Clamp to [0, 1] and normalise
    return round(max(0.0, min(1.0, 0.5 + net * 0.1)), 2)


def _extract_fatigue(
    texts: list[str],
    days_since_last_match: int | None = None,
    travel_distance_km: int | None = None,
) -> float:
    """Score fatigue (0 = fully rested, 1 = exhausted)."""
    score = 0.2  # baseline fresh

    if days_since_last_match is not None:
        if days_since_last_match <= 2:
            score += 0.3
        elif days_since_last_match <= 4:
            score += 0.1

    if travel_distance_km is not None:
        if travel_distance_km > 500:
            score += 0.2
        elif travel_distance_km > 200:
            score += 0.1

    # Check text for congestion signals
    congestion_words = [
        "tight", "schedule", "rotation", "rested", "fatigue", "tired",
        "heavy legs", "midweek", "three games", "travel",
    ]
    text_hits = sum(1 for t in texts for w in congestion_words if w.lower() in t.lower())
    score += text_hits * 0.05

    return round(min(1.0, score), 2)


def _extract_match_stakes(texts: list[str]) -> dict[str, Any]:
    """Classify match motivation stakes."""
    high = [
        "derby", "final", "title decider", "relegation", "el clasico",
        "old firm", "must-win", "six-pointer", "top of the table",
        "championship", "clasico",
    ]
    low = [
        "dead rubber", "nothing to play", "already relegated",
        "safety secured", "mid-table", "meaningless",
    ]

    combined = " ".join(texts).lower()
    for w in high:
        if w in combined:
            return {"classification": "High-Stakes", "reason": f"Keyword match: '{w}'"}
    for w in low:
        if w in combined:
            return {"classification": "Low-Stakes", "reason": f"Keyword match: '{w}'"}
    return {"classification": "Medium-Stakes", "reason": "Default — no high/low signals detected"}


def _find_anomalies(texts: list[str]) -> list[dict[str, Any]]:
    """Detect contextual anomalies from text signals."""
    patterns = {
        "food_poisoning": ["food poison", "sickness bug", "illness", "stomach"],
        "travel_delay": ["travel delay", "flight cancel", "stranded", "late arrival"],
        "protests": ["protest", "fan demonstration", "against", "walk out", "boycott"],
        "transfer_turmoil": ["transfer request", "hands in", "refuses to play", "fallout"],
        "internal_conflict": ["fight", "altercation", "argument", "fall out", "training ground bust-up"],
        "referee_controversy": ["referee bias", "VAR controversy", "officiating", "corrupt"],
    }
    anomalies = []
    for category, keywords in patterns.items():
        for t in texts:
            for k in keywords:
                if k.lower() in t.lower():
                    anomalies.append({
                        "type": category,
                        "source_text": t[:200],
                        "severity": "high" if category in ("internal_conflict", "food_poisoning") else "medium",
                    })
                    break
            else:
                continue
            break
    return anomalies


# ── Main orchestrator ──


async def collect_soft_signals(
    home_team: str,
    away_team: str,
    competition: str = "",
    fixture_date: str = "",
    venue: str = "",
) -> SoftSignalReport:
    """Orchestrate soft-signal collection for a single match.

    Uses web search + heuristic extraction to build the full report.
    This is the primary entry point for the 2-Analyst, 1-Chairman pipeline.
    """
    from app.scrapers.web_search import web_search_batch

    match_id = f"{home_team.lower()}-{away_team.lower()}-{fixture_date[:10]}".replace(" ", "-")
    report = SoftSignalReport(
        match_id=match_id,
        home_team=home_team,
        away_team=away_team,
        competition=competition,
        fixture_date=fixture_date,
        venue=venue,
    )

    queries = _build_search_queries(home_team, away_team, competition)
    all_texts: list[str] = []

    for category, category_queries in queries.items():
        results = await web_search_batch(category_queries)
        report.raw_signals[category] = results
        all_texts.extend(r["snippet"] for r in results)

    # ── Compute qualitative scores ──
    report.qualitative_scores = {
        "morale": _extract_morale(all_texts),
        "fatigue": _extract_fatigue(all_texts),
        "pressure": _extract_pressure(all_texts),
    }

    # ── Match stakes classification ──
    stakes = _extract_match_stakes(all_texts)
    report.qualitative_scores["match_stakes"] = stakes

    # ── Contextual anomalies ──
    report.contextual_anomalies = _find_anomalies(all_texts)

    return report
