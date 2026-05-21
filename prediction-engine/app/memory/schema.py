"""
Data Contracts for the VarView Tiered Memory Layer.

Defines the Pydantic models used across all three layers (L1–L3)
to ensure a consistent data contract between cache, logic, and archive.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MatchFixture(BaseModel):
    """A football fixture with resolved identifiers."""

    match_id: str = Field(..., description="Unique match identifier (e.g. flashscore_id)")
    home_team: str
    away_team: str
    kickoff_time: datetime
    competition: str = ""
    season: str = ""
    league_id: int | None = None
    home_logo: str | None = None
    away_logo: str | None = None
    venue: str | None = None
    status: str = "scheduled"

    @property
    def slug(self) -> str:
        """Normalised search key, e.g. 'arsenal vs manchester-city'."""
        return f"{self.home_team.lower().strip()} vs {self.away_team.lower().strip()}"

    @property
    def search_text(self) -> str:
        """Full-text search string for embedding."""
        return f"{self.home_team} {self.away_team} {self.competition} {self.season}"


class TacticalSnapshot(BaseModel):
    """Per-team tactical context computed ahead of a fixture."""

    match_id: str
    team: str
    opponent: str
    formation: str = "4-3-3"
    xG_last_5: list[float] = Field(default_factory=list)
    xG_average: float = 0.0
    pressing_intensity: float = 0.5  # 0–1 scale
    manager_id: str | None = None
    manager_name: str | None = None
    avg_possession: float = 50.0
    corner_kicks_avg: float = 4.0
    shots_on_target_avg: float = 3.0
    fouls_per_game: float = 10.0
    yellow_cards_avg: float = 1.5
    red_cards_avg: float = 0.05
    computed_at: datetime = Field(default_factory=datetime.utcnow)

    # Embedding vector (populated by the cache layer)
    vector: list[float] | None = None


class ManagerProfile(BaseModel):
    """Persistent managerial facts stored in Mem0 (L2)."""

    manager_id: str
    manager_name: str
    current_club: str = ""
    preferred_formations: list[str] = Field(default_factory=lambda: ["4-3-3"])
    tactical_style: str = ""
    pressing_style: str = "moderate"  # low / moderate / high
    defensive_line: str = "mixed"     # low / mixed / high
    set_piece_threat: float = 0.5
    derby_performance: float = 0.5
    notes: list[str] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class DixonColesInputs(BaseModel):
    """Feature vector for the Dixon-Coles model, computed by the inference engine."""

    match_id: str
    lambda_home: float = 1.5
    lambda_away: float = 1.2
    rho: float = -0.15
    home_attack_strength: float = 1.0
    home_defence_strength: float = 1.0
    away_attack_strength: float = 1.0
    away_defence_strength: float = 1.0
    h2h_total_goals_avg: float = 2.5
    h2h_samples: int = 0
    form_home_expected: float = 1.5
    form_away_expected: float = 1.2
    confidence_score: float = 0.5
    seasonal_adjustment: float = 1.0
    computed_at: datetime = Field(default_factory=datetime.utcnow)

    # Embedding vector for similarity search
    vector: list[float] | None = None


class HistoricalMatch(BaseModel):
    """Archived match result for long-term backtesting (L3)."""

    match_id: str
    home_team: str
    away_team: str
    competition: str
    season: str
    kickoff_time: datetime
    home_goals: int = 0
    away_goals: int = 0
    home_xG: float = 0.0
    away_xG: float = 0.0
    formation_home: str = ""
    formation_away: str = ""
    manager_home: str = ""
    manager_away: str = ""
    lambda_home: float = 0.0
    lambda_away: float = 0.0
    predicted_total_goals: float = 0.0
    actual_total_goals: int = 0
    prediction_error: float = 0.0
    calibration_weight: float = 1.0
    archived_at: datetime = Field(default_factory=datetime.utcnow)
    vector: list[float] | None = None


# ── Canonical embedding dimension ──
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2
