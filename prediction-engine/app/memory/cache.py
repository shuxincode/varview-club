"""
L1 — Hot Cache (RedisVL).

Provides semantic match resolution and TTL-bound tactical snapshots
using RedisVL vector search over 384-dim all-MiniLM-L6-v2 embeddings.
"""

from __future__ import annotations

import json
import time
from datetime import datetime
from typing import Any

import numpy as np
from redis.asyncio import Redis as AsyncRedis
from redisvl.index import AsyncSearchIndex
from redisvl.schema import IndexSchema

from app.config import settings
from app.memory.embedder import embed, embedding_dim
from app.memory.schema import MatchFixture, TacticalSnapshot

# ── Namespace ──
NS = "VarView"

# ── Redis key patterns ──
TACTICAL_KEY_TPL = f"{NS}:tactical:{{match_id}}:{{team}}"
MATCH_INDEX_NAME = f"{NS}:idx:matches"
TACTICAL_INDEX_NAME = f"{NS}:idx:tactical"


def _match_schema() -> IndexSchema:
    return IndexSchema.from_dict({
        "index": {"name": MATCH_INDEX_NAME, "prefix": f"{NS}:match:"},
        "fields": [
            {"name": "match_id", "type": "tag"},
            {"name": "home_team", "type": "text"},
            {"name": "away_team", "type": "text"},
            {"name": "competition", "type": "text"},
            {"name": "season", "type": "text"},
            {"name": "kickoff_ts", "type": "numeric"},
            {"name": "embedding", "type": "vector",
             "attrs": {"dims": embedding_dim(), "algorithm": "hnsw",
                       "distance_metric": "cosine"}},
        ],
    })


def _tactical_schema() -> IndexSchema:
    return IndexSchema.from_dict({
        "index": {"name": TACTICAL_INDEX_NAME, "prefix": f"{NS}:tactical:"},
        "fields": [
            {"name": "match_id", "type": "tag"},
            {"name": "team", "type": "tag"},
            {"name": "ttl_epoch", "type": "numeric"},
            {"name": "embedding", "type": "vector",
             "attrs": {"dims": embedding_dim(), "algorithm": "hnsw",
                       "distance_metric": "cosine"}},
        ],
    })


class RedisVLManager:
    """L1 cache backed by RedisVL vector indices."""

    def __init__(self, redis: AsyncRedis | None):
        self.redis = redis
        self._match_index: AsyncSearchIndex | None = None
        self._tactical_index: AsyncSearchIndex | None = None

    async def initialize(self) -> None:
        """Create indices if they do not already exist."""
        if not self.redis:
            return
        try:
            self._match_index = AsyncSearchIndex(_match_schema(), redis_client=self.redis)
            await self._match_index.create(overwrite=False)

            self._tactical_index = AsyncSearchIndex(_tactical_schema(), redis_client=self.redis)
            await self._tactical_index.create(overwrite=False)
        except Exception as exc:
            print(f"[L1] RedisVL init warning: {exc}")

    # ── Match Fixture helpers ──

    async def store_match(self, fixture: MatchFixture) -> None:
        """Index a match fixture for semantic search."""
        if not self.redis or not self._match_index:
            return
        vec = await embed(fixture.search_text)
        key = f"{NS}:match:{fixture.match_id}"
        await self._match_index.load(
            [{
                "match_id": fixture.match_id,
                "home_team": fixture.home_team,
                "away_team": fixture.away_team,
                "competition": fixture.competition,
                "season": fixture.season,
                "kickoff_ts": fixture.kickoff_time.timestamp(),
                "embedding": vec,
            }],
            keys=[key],
        )

    async def resolve_match(self, query: str, top_k: int = 3) -> list[MatchFixture]:
        """
        Semantic match resolution.
        'Arsnl vs City' → correctly resolved MatchFixture objects.
        """
        if not self.redis or not self._match_index:
            return []
        qvec = await embed(query)
        results = await self._match_index.query(
            vector=qvec,
            return_fields=["match_id", "home_team", "away_team",
                           "competition", "season", "kickoff_ts"],
            num_results=top_k,
        )
        out: list[MatchFixture] = []
        for r in results:
            out.append(MatchFixture(
                match_id=r["match_id"],
                home_team=r["home_team"],
                away_team=r["away_team"],
                competition=r.get("competition", ""),
                season=r.get("season", ""),
                kickoff_time=datetime.fromtimestamp(float(r["kickoff_ts"])),
            ))
        return out

    # ── Tactical Snapshot cache (15-min TTL) ──

    async def cache_tactical(self, snap: TacticalSnapshot) -> None:
        """Store a tactical snapshot with 15-min TTL."""
        if not self.redis or not self._tactical_index:
            return
        vec = await embed(f"{snap.team} {snap.opponent} {snap.formation}")
        ttl_epoch = time.time() + 900  # 15 minutes
        key = TACTICAL_KEY_TPL.format(match_id=snap.match_id, team=snap.team.replace(" ", "_"))

        # Store full payload as JSON hash
        payload = snap.model_dump(mode="json")
        payload["embedding"] = vec
        await self.redis.hset(key, mapping={"data": json.dumps(payload)})
        await self.redis.expire(key, 900)

        # Index for vector search
        await self._tactical_index.load(
            [{"match_id": snap.match_id, "team": snap.team,
              "ttl_epoch": ttl_epoch, "embedding": vec}],
            keys=[f"{key}:idx"],
        )

    async def get_tactical(self, match_id: str, team: str) -> TacticalSnapshot | None:
        """Read a cached tactical snapshot."""
        if not self.redis:
            return None
        key = TACTICAL_KEY_TPL.format(match_id=match_id, team=team.replace(" ", "_"))
        raw = await self.redis.hget(key, "data")
        if raw is None:
            return None
        return TacticalSnapshot(**json.loads(raw))

    # ── Admin ──

    async def clear(self) -> None:
        """Drop all VarView keys (development helper)."""
        if not self.redis:
            return
        cursor = 0
        while True:
            cursor, keys = await self.redis.scan(cursor, match=f"{NS}:*")
            if keys:
                await self.redis.delete(*keys)
            if cursor == 0:
                break
