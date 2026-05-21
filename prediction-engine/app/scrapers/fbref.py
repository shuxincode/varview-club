"""
FBref depth scraper — now powered by AI web search.

Replaces the CSS-selector / regex-based HTML parsing with Gemini 1.5 Flash
web search. The AI adapts to layout changes automatically instead of
relying on brittle CSS selectors.

Extracts last N match results for a given team.
"""

from app.state import state
from app.config import settings
from app.scrapers.ai_search import search_team_form


async def get_team_matches(team_name: str, max_matches: int = 10) -> list[dict]:
    """Fetch last N matches for a team via AI web search.

    Uses Gemini 1.5 Flash to search the web and extract structured
    match data — no brittle CSS selectors, no Playwright browser needed.
    """
    # Check Redis cache first
    if state.redis:
        cache_key = f"fbref:matches:{team_name.lower().replace(' ', '-')}"
        cached = await state.redis.get(cache_key)
        if cached:
            import json
            return json.loads(cached)

    # Use AI search to find team form
    result = await search_team_form(team_name)
    matches = result.get("matches", [])

    if not matches:
        return []

    # Convert to the format expected by the inference engine
    formatted = []
    for m in matches:
        goals_for = m.get("goals_for")
        goals_against = m.get("goals_against")
        opponent = m.get("opponent", "")
        venue = m.get("venue", "home")
        result_str = m.get("result", "")

        # Normalise
        if goals_for is not None:
            try:
                goals_for = int(goals_for)
            except (ValueError, TypeError):
                goals_for = None
        if goals_against is not None:
            try:
                goals_against = int(goals_against)
            except (ValueError, TypeError):
                goals_against = None

        formatted.append({
            "date": m.get("date", ""),
            "competition": m.get("competition", ""),
            "venue": venue,
            "opponent": opponent,
            "goals_for": goals_for,
            "goals_against": goals_against,
            "result": result_str,
        })

        if len(formatted) >= max_matches:
            break

    # Cache in Redis
    if state.redis and formatted:
        import json
        cache_key = f"fbref:matches:{team_name.lower().replace(' ', '-')}"
        await state.redis.setex(cache_key, settings.redis_cache_ttl, json.dumps(formatted))

    return formatted
