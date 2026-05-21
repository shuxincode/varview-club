"""
Shared embedding model for the VarView Tiered Memory Layer.

Uses sentence-transformers all-MiniLM-L6-v2 (384-dim).
Single instance shared across L1, L2, and L3 to prevent vector drift.
"""

from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import Sequence

import numpy as np
from sentence_transformers import SentenceTransformer

from app.memory.schema import EMBEDDING_DIM

_MODEL_NAME = "all-MiniLM-L6-v2"
_model: SentenceTransformer | None = None
_lock = asyncio.Lock()


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(_MODEL_NAME)
    return _model


async def embed(text: str | Sequence[str]) -> list[float] | list[list[float]]:
    """Embed a string or list of strings into 384-dim vectors."""
    loop = asyncio.get_running_loop()
    model = await loop.run_in_executor(None, _get_model)
    single = isinstance(text, str)
    texts = [text] if single else list(text)

    vectors = await loop.run_in_executor(
        None,
        lambda: model.encode(texts, normalize_embeddings=True, show_progress_bar=False),
    )

    result = vectors.tolist() if isinstance(vectors, np.ndarray) else vectors
    if single:
        return result[0]
    return result


@lru_cache(maxsize=1)
def embedding_dim() -> int:
    return EMBEDDING_DIM
