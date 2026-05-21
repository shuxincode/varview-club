"""
Web search batch helper for the Soft Signal Scraper.

Tries DuckDuckGo (no API key) first, falls back to a static data file
for environments where live search isn't available.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx

_SEARCH_CACHE: dict[str, list[dict[str, str]]] = {}
_STATIC_DATA_PATH = Path(__file__).parent / "_soft_signal_data.json"


async def web_search_batch(queries: list[str]) -> list[dict[str, str]]:
    """Run multiple search queries and return consolidated results."""
    results: list[dict[str, str]] = []

    for q in queries:
        if q in _SEARCH_CACHE:
            results.extend(_SEARCH_CACHE[q])
            continue

        try:
            # Try DuckDuckGo lite endpoint (no API key needed)
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.post(
                    "https://lite.duckduckgo.com/lite/",
                    data={"q": q},
                    headers={
                        "User-Agent": (
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/131.0.0.0 Safari/537.36"
                        ),
                    },
                )
                if resp.status_code == 200:
                    _SEARCH_CACHE[q] = _parse_duckduckgo_lite(resp.text, q)
                    results.extend(_SEARCH_CACHE[q])
                    continue
        except Exception:
            pass

        # Fallback: check static data file
        results.extend(_load_from_static(q))

    return results


def _parse_duckduckgo_lite(html: str, query: str) -> list[dict[str, str]]:
    """Parse DuckDuckGo lite HTML results into structured snippets."""
    results = []
    import re as _re

    # Simple extraction of result links and text
    for match in _re.finditer(
        r'<a[^>]*href="(https?://[^"]+)"[^>]*class="result-link"[^>]*>(.*?)</a>',
        html,
        re.DOTALL,
    ):
        url = match.group(1)
        title = _re.sub(r"<[^>]+>", "", match.group(2)).strip()
        results.append({"title": title, "url": url, "snippet": title, "query": query})

    if not results:
        # Fallback: broader regex
        for match in _re.finditer(
            r'<a[^>]*href="(https?://[^"]+)"[^>]*>(.*?)</a>',
            html,
            re.DOTALL,
        ):
            url = match.group(1)
            title = _re.sub(r"<[^>]+>", "", match.group(2)).strip()
            if title and len(title) > 5:
                results.append({"title": title, "url": url, "snippet": title, "query": query})
                if len(results) >= 3:
                    break

    return results


def _load_from_static(query: str) -> list[dict[str, str]]:
    """Load pre-seeded search results from static data file."""
    if not _STATIC_DATA_PATH.exists():
        return []
    try:
        data = json.loads(_STATIC_DATA_PATH.read_text())
        return data.get(query, [])
    except (json.JSONDecodeError, KeyError):
        return []


def seed_static_data(data: dict[str, list[dict[str, str]]]) -> None:
    """Pre-seed search results from externally collected data."""
    global _SEARCH_CACHE
    _SEARCH_CACHE.update(data)
    # Also persist to disk
    existing = {}
    if _STATIC_DATA_PATH.exists():
        try:
            existing = json.loads(_STATIC_DATA_PATH.read_text())
        except json.JSONDecodeError:
            pass
    existing.update(data)
    _STATIC_DATA_PATH.write_text(json.dumps(existing, indent=2))
