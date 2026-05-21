"""
L3 — Sovereign Archive (DuckDB + vector storage).

Local-first persistence layer for historical match results and
model calibration data.  Uses DuckDB — an embedded OLAP database
with native array/vector support — for sovereign data residency.

When Redis data expires (L1 TTL), it is synced here for backtesting.
No external database server required; everything lives in one file.
"""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

import duckdb

from app.memory.embedder import embed, embedding_dim
from app.memory.schema import (
    DixonColesInputs,
    HistoricalMatch,
    MatchFixture,
    TacticalSnapshot,
)

NS = "VarView"


class DuckDBArchive:
    """L3 sovereign store backed by DuckDB.

    Each instance holds a single-file database at ``db_path``.
    Vectors are stored as FLOAT[] arrays with cosine similarity
    computed via DuckDB's ``array_cosine_similarity`` function.
    """

    def __init__(self, db_path: str = "varview_archive.duckdb"):
        self._db_path = db_path
        self._conn: duckdb.DuckDBPyConnection | None = None

    async def initialize(self) -> None:
        """Open DuckDB, install array extension, create tables."""
        def _init():
            conn = duckdb.connect(self._db_path)
            conn.execute("SET enable_progress_bar=false;")

            conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {NS}_historical_matches (
                    id          INTEGER PRIMARY KEY,
                    match_id    TEXT UNIQUE NOT NULL,
                    home_team   TEXT NOT NULL,
                    away_team   TEXT NOT NULL,
                    competition TEXT,
                    season      TEXT,
                    kickoff_ts  TIMESTAMP,
                    home_goals  INTEGER DEFAULT 0,
                    away_goals  INTEGER DEFAULT 0,
                    home_xg     REAL DEFAULT 0,
                    away_xg     REAL DEFAULT 0,
                    formation_home TEXT DEFAULT '',
                    formation_away TEXT DEFAULT '',
                    manager_home TEXT DEFAULT '',
                    manager_away TEXT DEFAULT '',
                    lambda_home REAL DEFAULT 0,
                    lambda_away REAL DEFAULT 0,
                    pred_goals  REAL DEFAULT 0,
                    act_goals   INTEGER DEFAULT 0,
                    pred_error  REAL DEFAULT 0,
                    cal_weight  REAL DEFAULT 1.0,
                    archived_at TIMESTAMP DEFAULT now(),
                    embedding   FLOAT[{embedding_dim()}]
                )
            """)

            conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {NS}_dixon_coles_inputs (
                    id          INTEGER PRIMARY KEY,
                    match_id    TEXT UNIQUE NOT NULL,
                    lambda_home REAL NOT NULL,
                    lambda_away REAL NOT NULL,
                    rho         REAL NOT NULL DEFAULT -0.15,
                    confidence  REAL DEFAULT 0.5,
                    form_home   REAL DEFAULT 0,
                    form_away   REAL DEFAULT 0,
                    h2h_avg     REAL DEFAULT 0,
                    computed_at TIMESTAMP DEFAULT now(),
                    embedding   FLOAT[{embedding_dim()}]
                )
            """)

            # Sequence for auto-increment (DuckDB doesn't have SERIAL)
            conn.execute(f"CREATE SEQUENCE IF NOT EXISTS {NS}_seq START 1;")

            # Cosine similarity helper (inline expression)
            conn.execute("""
                CREATE MACRO cosine_similarity(a, b) AS
                list_sum(list_transform(list_zip(a, b), x -> x[1] * x[2])) /
                (sqrt(list_sum(list_transform(a, x -> x * x))) *
                 sqrt(list_sum(list_transform(b, x -> x * x))));
            """)

            return conn

        loop = asyncio.get_running_loop()
        self._conn = await loop.run_in_executor(None, _init)
        print(f"[L3] DuckDB archive ready at {self._db_path}")

    # ── Write ──

    async def archive_match(self, match: HistoricalMatch) -> None:
        """Store a completed match for long-term backtesting."""
        if not self._conn:
            return
        vec = await embed(
            f"{match.home_team} vs {match.away_team} {match.competition} {match.season}"
        )

        def _write():
            self._conn.execute(f"""
                INSERT INTO {NS}_historical_matches VALUES (
                    nextval('{NS}_seq'), ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    now(), ?
                )
                ON CONFLICT (match_id) DO UPDATE SET
                    home_goals = EXCLUDED.home_goals,
                    away_goals = EXCLUDED.away_goals,
                    pred_error = EXCLUDED.pred_error,
                    cal_weight = EXCLUDED.cal_weight,
                    archived_at = now()
            """, (
                match.match_id, match.home_team, match.away_team,
                match.competition, match.season, match.kickoff_time,
                match.home_goals, match.away_goals,
                match.home_xG, match.away_xG,
                match.formation_home, match.formation_away,
                match.manager_home, match.manager_away,
                match.lambda_home, match.lambda_away,
                match.predicted_total_goals, match.actual_total_goals,
                match.prediction_error, match.calibration_weight,
                vec,
            ))

        await asyncio.get_running_loop().run_in_executor(None, _write)

    async def store_dixon_coles_inputs(self, dci: DixonColesInputs) -> None:
        """Persist feature vectors for later model calibration."""
        if not self._conn:
            return
        vec = await embed(f"match={dci.match_id} lh={dci.lambda_home:.3f} la={dci.lambda_away:.3f}")

        def _write():
            self._conn.execute(f"""
                INSERT INTO {NS}_dixon_coles_inputs VALUES (
                    nextval('{NS}_seq'), ?, ?, ?, ?, ?, ?, ?, ?, now(), ?
                )
                ON CONFLICT (match_id) DO NOTHING
            """, (
                dci.match_id, dci.lambda_home, dci.lambda_away, dci.rho,
                dci.confidence_score, dci.form_home_expected,
                dci.form_away_expected, dci.h2h_total_goals_avg,
                vec,
            ))

        await asyncio.get_running_loop().run_in_executor(None, _write)

    # ── Read ──

    async def get_calibration_data(
        self,
        limit: int = 100,
        min_confidence: float = 0.0,
    ) -> list[dict[str, Any]]:
        """Return archived matches for model calibration/backtesting."""
        if not self._conn:
            return []

        def _read():
            cur = self._conn.execute(f"""
                SELECT h.match_id, h.home_team, h.away_team,
                       h.home_goals, h.away_goals,
                       h.lambda_home, h.lambda_away,
                       h.pred_goals, h.act_goals, h.pred_error,
                       h.cal_weight, d.confidence
                FROM {NS}_historical_matches h
                LEFT JOIN {NS}_dixon_coles_inputs d USING (match_id)
                WHERE h.pred_error IS NOT NULL
                  AND (d.confidence IS NULL OR d.confidence >= ?)
                ORDER BY h.archived_at DESC
                LIMIT ?
            """, (min_confidence, limit))
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

        return await asyncio.get_running_loop().run_in_executor(None, _read)

    async def find_similar_matches(self, query: str, top_k: int = 10) -> list[dict[str, Any]]:
        """Vector similarity search over archived matches."""
        if not self._conn:
            return []
        qvec = await embed(query)

        def _search():
            cur = self._conn.execute(f"""
                SELECT match_id, home_team, away_team,
                       home_goals, away_goals,
                       competition, season,
                       lambda_home, lambda_away,
                       cosine_similarity(embedding, ?::FLOAT[{embedding_dim()}]) AS similarity
                FROM {NS}_historical_matches
                WHERE embedding IS NOT NULL
                ORDER BY similarity DESC
                LIMIT ?
            """, (qvec, top_k))
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

        return await asyncio.get_running_loop().run_in_executor(None, _search)

    # ── Sync from L1 ──

    async def sync_expired_tactical(
        self, snaps: list[TacticalSnapshot], fixtures: list[MatchFixture]
    ) -> int:
        """Move expired L1 tactical snapshots into L3 archive."""
        fixture_map = {f.match_id: f for f in fixtures}
        count = 0
        for snap in snaps:
            fx = fixture_map.get(snap.match_id)
            if not fx:
                continue
            hist = HistoricalMatch(
                match_id=snap.match_id,
                home_team=fx.home_team,
                away_team=fx.away_team,
                competition=fx.competition,
                season=fx.season,
                kickoff_time=fx.kickoff_time,
                formation_home=snap.formation if snap.team == fx.home_team else "",
                formation_away=snap.formation if snap.team == fx.away_team else "",
                home_xG=snap.xG_average if snap.team == fx.home_team else 0,
                away_xG=snap.xG_average if snap.team == fx.away_team else 0,
            )
            await self.archive_match(hist)
            count += 1
        return count

    # ── Admin ──

    async def clear(self) -> None:
        """Drop all archive tables (development helper)."""
        if not self._conn:
            return

        def _clear():
            self._conn.execute(f"DROP TABLE IF EXISTS {NS}_historical_matches")
            self._conn.execute(f"DROP TABLE IF EXISTS {NS}_dixon_coles_inputs")
            self._conn.execute(f"DROP SEQUENCE IF EXISTS {NS}_seq")

        await asyncio.get_running_loop().run_in_executor(None, _clear)

    async def close(self) -> None:
        if self._conn:
            def _close():
                self._conn.close()
            await asyncio.get_running_loop().run_in_executor(None, _close)
