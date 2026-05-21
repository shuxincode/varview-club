"""
Discovery worker — runs Playwright Flashscore scraper on a schedule.

Runs as a standalone process in Docker (discovery-worker service).
"""

import asyncio
import time

from app.config import settings
from app.scrapers.flashscore import discover_today


async def run_discovery_loop():
    """Run discovery every N seconds."""
    print(f"[worker] discovery worker started (interval={settings.discovery_interval_seconds}s)")

    # Force Redis connection at worker level
    from redis.asyncio import from_url
    r = from_url(settings.redis_url, decode_responses=True)
    try:
        await r.ping()
        print(f"[worker] Redis connected: {settings.redis_url}")
    except Exception as e:
        print(f"[worker] Redis unavailable ({e}) — discovery will fail")
    await r.aclose()

    while True:
        try:
            start = time.monotonic()
            count = await discover_today()
            elapsed = time.monotonic() - start
            print(f"[worker] discovery cycle: {count} matches in {elapsed:.1f}s")
        except Exception as e:
            print(f"[worker] discovery cycle error: {e}")

        await asyncio.sleep(settings.discovery_interval_seconds)


if __name__ == "__main__":
    asyncio.run(run_discovery_loop())
