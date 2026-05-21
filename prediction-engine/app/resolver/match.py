import json
import hashlib

from rapidfuzz import process, utils

from app.state import state


MATCH_KEY_PREFIX = "match:"


def _normalize(name: str) -> str:
    return utils.default_process(name)


def _match_key(home: str, away: str) -> str:
    raw = f"{_normalize(home)}-{_normalize(away)}"
    return f"{MATCH_KEY_PREFIX}{hashlib.md5(raw.encode()).hexdigest()}"


async def store_match(home_team: str, away_team: str, kickoff_utc: str | None = None, flashscore_id: str | None = None):
    """Store a discovered match in Redis with 15min TTL."""
    if not state.redis:
        return
    key = _match_key(home_team, away_team)
    data = {
        "home_team": home_team,
        "away_team": away_team,
        "kickoff_utc": kickoff_utc or "",
        "flashscore_id": flashscore_id or "",
    }
    from app.config import settings
    await state.redis.setex(key, settings.redis_match_ttl, json.dumps(data))


async def resolve(query: str) -> dict | None:
    """Fuzzy-match a query like 'Elfsborg vs Brommapojkarna' against Redis match registry."""
    if not state.redis:
        return None

    keys = await state.redis.keys(f"{MATCH_KEY_PREFIX}*")
    if not keys:
        return None

    match_map: dict[str, str] = {}
    for k in keys:
        raw = await state.redis.get(k)
        if not raw:
            continue
        data = json.loads(raw)
        label = f"{data['home_team']} vs {data['away_team']}"
        match_map[label] = k

    if not match_map:
        return None

    best, score, _ = process.extractOne(
        _normalize(query),
        {_normalize(k): k for k in match_map},
        processor=None,
    )
    if score < 70:
        return None

    raw = await state.redis.get(match_map[best])
    return json.loads(raw) if raw else None


async def get_all_matches() -> list[dict]:
    """Return every match currently in the registry."""
    if not state.redis:
        return []
    keys = await state.redis.keys(f"{MATCH_KEY_PREFIX}*")
    results = []
    for k in keys:
        raw = await state.redis.get(k)
        if raw:
            results.append(json.loads(raw))
    return results
