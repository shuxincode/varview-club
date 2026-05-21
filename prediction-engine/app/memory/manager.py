"""
MemoryManager — Unified orchestrator for L1/L2/L3.

Initialises all three layers, wires them together, and exposes a
single ``memory`` object that the rest of the app imports.
"""

from __future__ import annotations

from redis.asyncio import Redis as AsyncRedis

from app.config import settings
from app.memory.archive import DuckDBArchive
from app.memory.cache import RedisVLManager
from app.memory.logic import TacticalMemory


class MemoryManager:
    """Tiered memory orchestrator for VarView."""

    def __init__(self, redis: AsyncRedis | None = None):
        self.redis = redis
        self.l1: RedisVLManager = RedisVLManager(redis)
        self.l2: TacticalMemory = TacticalMemory(
            openrouter_api_key=settings.openrouter_api_key or None,
            mem0_enabled=settings.mem0_enabled,
        )
        self.l3: DuckDBArchive = DuckDBArchive(
            db_path=settings.duckdb_db_path,
        )

    async def initialize(self) -> None:
        """Bring all layers online."""
        await self.l1.initialize()
        try:
            await self.l3.initialize()
        except Exception as exc:
            print(f"[memory] L3 (DuckDB) unavailable: {exc}")
        print("[memory] Tiered memory layer initialised")

    async def close(self) -> None:
        """Shut down all layers."""
        await self.l3.close()

    @property
    def healthy(self) -> bool:
        return self.redis is not None

    async def clear_all(self) -> None:
        """Development helper — wipe all layers."""
        await self.l1.clear()
        await self.l2.clear()
        await self.l3.clear()


# Singleton
manager: MemoryManager = MemoryManager()
