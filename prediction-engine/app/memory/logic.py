"""
L2 — Logic Layer (Mem0 + Qdrant).

Persists managerial tactics, team profiles, and reasoning context
across sessions using mem0ai graph-based memory backed by Qdrant.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from mem0 import Memory

from app.memory.embedder import embed
from app.memory.schema import ManagerProfile

# ── Namespace ──
NS = "VarView"


class TacticalMemory:
    """Graph-based tactical memory using Mem0.

    Stores and retrieves "Tactical Truths" about managers, teams,
    and playing styles that persist across analysis sessions.
    """

    def __init__(self, openrouter_api_key: str | None = None, mem0_enabled: bool = True):
        config: dict[str, Any] = {
            "graph_store": {"name": "neo4j", "url": "", "username": "", "password": ""},
            "version": "v2.0",
        }
        # If no graph DB is available, Mem0 falls back to Qdrant local mode.
        # The user can configure Neo4j later for full graph traversal.
        self._memory = None  # Default until mem0 is properly configured
        if openrouter_api_key and mem0_enabled:
            try:
                self._memory = Memory.from_config(config_dict=config)
            except Exception as exc:
                print(f"[memory] L2 (mem0) unavailable: {exc} — using local store")
        self._local_store: dict[str, ManagerProfile] = {}

    # ── Manager Profile ──

    async def update_manager_profile(
        self,
        manager_id: str,
        manager_name: str,
        tactical_notes: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Persist tactical observations about a manager across sessions.

        The 'QwenPaw' daemon can retrieve these facts during the Planning phase
        to inform match-up analysis.
        """
        text = (
            f"Manager {manager_name} ({manager_id}): {tactical_notes}"
        )
        mem_meta = {
            "manager_id": manager_id,
            "manager_name": manager_name,
            "namespace": f"{NS}:managers",
            **(metadata or {}),
        }

        if self._memory:
            # Use Mem0 graph store
            self._memory.add(text, user_id=manager_id, metadata=mem_meta)
        else:
            # Local fallback
            now = datetime.utcnow()
            if manager_id not in self._local_store:
                self._local_store[manager_id] = ManagerProfile(
                    manager_id=manager_id,
                    manager_name=manager_name,
                )
            profile = self._local_store[manager_id]
            profile.notes.append(f"[{now.isoformat()}] {tactical_notes}")
            profile.last_updated = now

    async def get_manager_profile(self, manager_id: str) -> ManagerProfile | None:
        """Retrieve the full manager profile including tactical history."""
        if self._memory:
            memories = self._memory.get_all(user_id=manager_id)
            notes = [m["memory"] for m in memories if "memory" in m]
            if notes:
                return ManagerProfile(
                    manager_id=manager_id,
                    manager_name="",
                    notes=notes,
                )
        return self._local_store.get(manager_id)

    async def search_tactical_facts(self, query: str, top_k: int = 5) -> list[str]:
        """Search all tactical facts by semantic similarity.

        Used by QwenPaw during planning: "what does this manager do in derbies?"
        """
        if self._memory:
            results = self._memory.search(
                query,
                namespace=f"{NS}:managers",
                limit=top_k,
            )
            return [r["memory"] for r in results if "memory" in r]
        return []

    # ─── Utilities ──

    async def add_tactical_note(self, note: str, metadata: dict[str, Any] | None = None) -> None:
        """Store a free-form tactical observation."""
        if self._memory:
            self._memory.add(note, metadata={"namespace": f"{NS}:tactical_notes", **(metadata or {})})

    async def clear(self) -> None:
        """Reset all Mem0 memories (development helper)."""
        if self._memory:
            self._memory.reset()
        self._local_store.clear()
