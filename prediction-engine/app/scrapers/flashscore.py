"""
Flashscore discovery scraper — now powered by AI web search.

Replaces the Playwright stealth browser approach with Gemini 1.5 Flash
web search. Discovers today's football matches by searching the web.
"""

from app.scrapers.ai_search import search_fixtures
from app.resolver.match import store_match


async def discover_today() -> int:
    """
    Discover today's football fixtures via AI web search.
    Returns the count of matches stored.
    """
    count = 0

    # Search for multiple leagues to get broad coverage
    queries = [
        "today's football fixtures schedule",
        "football matches today all leagues",
        "today premier league fixtures",
    ]

    seen = set()
    for query in queries:
        result = await search_fixtures(query)
        fixtures = result.get("fixtures", [])
        for fixture in fixtures:
            home = fixture.get("home_team", "").strip()
            away = fixture.get("away_team", "").strip()
            if home and away:
                key = f"{home.lower()}-{away.lower()}"
                if key not in seen:
                    seen.add(key)
                    await store_match(
                        home_team=home,
                        away_team=away,
                        kickoff_utc=fixture.get("date", ""),
                        flashscore_id="",
                    )
                    count += 1

    return count
