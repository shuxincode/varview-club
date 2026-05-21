"""
AI Search Agent — multi-model AI web search for football data.

Hard scraper (fixtures, form, H2H): poolside/laguna-xs.2:free
Soft scraper (conditions, news):    google/gemma-4-31b-it:free → fallback chain
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

import httpx

from app.config import settings
from app.state import state

CACHE_PREFIX = "aisearch:"
CACHE_TTL = 1800  # 30 min for search results

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# ── Model routing ──
# Hard scraper: structured fixture/form/H2H extraction
HARD_MODEL = "poolside/laguna-xs.2:free"
# Soft scraper: team conditions, morale, injuries, qualitative intel
SOFT_MODELS = [
    "google/gemma-4-31b-it:free",
    "openai/gpt-oss-120b:free",
    "minimax/minimax-m2.5:free",
    "tencent/hy3-preview:free",
]


# ── Web search (DuckDuckGo lite, no API key) ──


async def _web_search(query: str, max_results: int = 5) -> list[dict[str, str]]:
    """Search the web via DuckDuckGo lite, return list of {title, url, snippet}."""
    results: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.post(
                "https://lite.duckduckgo.com/lite/",
                data={"q": query},
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/131.0.0.0 Safari/537.36"
                    ),
                },
            )
            if resp.status_code == 200:
                # Parse result links from the HTML table
                for match in re.finditer(
                    r'<a[^>]*href="(https?://[^"]+)"[^>]*>(.*?)</a>',
                    resp.text,
                    re.DOTALL,
                ):
                    url = match.group(1)
                    title = re.sub(r"<[^>]+>", "", match.group(2)).strip()
                    if url not in seen_urls and title and len(title) > 5:
                        seen_urls.add(url)
                        results.append({"title": title, "url": url, "snippet": title})
                        if len(results) >= max_results:
                            break
    except Exception:
        pass

    return results


# ── LLM extraction (OpenRouter) ──


async def _call_model(system_prompt: str, user_prompt: str, model: str) -> str:
    """Call a model via OpenRouter and return raw text response."""
    api_key = settings.openrouter_api_key
    if not api_key:
        raise RuntimeError("PREDICTION_OPENROUTER_API_KEY not set — cannot run AI search")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://varview.club",
        "X-Title": "VARview Prediction Engine",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            OPENROUTER_URL,
            headers=headers,
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 4096,
            },
        )
        if resp.status_code != 200:
            raise RuntimeError(f"OpenRouter API error ({model}): {resp.status_code} {resp.text[:200]}")

        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return content.strip()


async def _call_with_fallback(
    system_prompt: str, user_prompt: str, model_list: list[str]
) -> str:
    """Try each model in sequence until one succeeds."""
    last_error: Exception | None = None
    for model in model_list:
        try:
            return await _call_model(system_prompt, user_prompt, model)
        except Exception as e:
            last_error = e
            continue
    raise RuntimeError(f"All models failed — last error: {last_error}")


def _cache_key(query: str, schema: str) -> str:
    raw = f"{query}|{schema}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


async def _get_cached(key: str) -> dict[str, Any] | None:
    if not state.redis:
        return None
    raw = await state.redis.get(f"{CACHE_PREFIX}{key}")
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    return None


async def _set_cache(key: str, data: dict[str, Any]) -> None:
    if not state.redis:
        return
    await state.redis.setex(f"{CACHE_PREFIX}{key}", CACHE_TTL, json.dumps(data))


# ── Public API ──

SEARCH_SYSTEM_PROMPT = """You are a football data extraction AI. Your job is to search the web and extract structured football data.

Given web search results about a football query, extract the requested information as valid JSON only — no markdown, no code fences, no explanation.

Rules:
1. Extract ONLY facts from the search results — never invent scores, teams, or dates.
2. If you cannot find the information, return {"error": "not found", "details": "what was missing"}.
3. Always include a `sources` array with URLs used."""


async def search_fixtures(team_query: str) -> dict[str, Any]:
    """Search for upcoming fixtures by team name.

    Returns structured fixture data: teams, date, league, venue.
    """
    cache_key_str = _cache_key(f"fixtures:{team_query}", "fixtures")
    cached = await _get_cached(cache_key_str)
    if cached:
        return cached

    search_queries = [
        f"{team_query} upcoming football fixtures 2026",
        f"{team_query} next match schedule {team_query}",
    ]

    all_results: list[dict[str, str]] = []
    for q in search_queries:
        results = await _web_search(q)
        all_results.extend(results)

    if not all_results:
        return {"fixtures": [], "error": "No web search results found"}

    user_prompt = f"""Search query: upcoming fixtures for "{team_query}"

Web search results:
{json.dumps(all_results, indent=2)}

Extract ALL upcoming fixtures as a JSON array:
[
  {{
    "home_team": "...",
    "away_team": "...",
    "date": "YYYY-MM-DD",
    "time": "HH:MM" or null,
    "league": "competition name",
    "venue": "stadium name" or null
  }}
]

If no fixtures found, return: {{"fixtures": [], "note": "explanation"}}"""

    try:
        raw = await _call_model(SEARCH_SYSTEM_PROMPT, user_prompt, HARD_MODEL)
        # Strip markdown fences if present
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        result = json.loads(raw)
        if "fixtures" not in result:
            result = {"fixtures": result if isinstance(result, list) else []}
        result["_source"] = "ai_search"
        await _set_cache(cache_key_str, result)
        return result
    except (json.JSONDecodeError, RuntimeError) as e:
        return {"fixtures": [], "error": str(e)}


async def search_team_form(team_name: str) -> dict[str, Any]:
    """Search for recent match results for a team.

    Returns structured form data: last 5-10 results with scores, opponents.
    """
    cache_key_str = _cache_key(f"form:{team_name}", "team_form")
    cached = await _get_cached(cache_key_str)
    if cached:
        return cached

    queries = [
        f"{team_name} last 5 matches results 2026",
        f"{team_name} recent scores fixtures {team_name}",
    ]

    all_results: list[dict[str, str]] = []
    for q in queries:
        results = await _web_search(q)
        all_results.extend(results)

    if not all_results:
        return {"matches": [], "error": "No web search results found"}

    user_prompt = f"""Search query: recent match results for "{team_name}"

Web search results:
{json.dumps(all_results, indent=2)}

Extract the MOST RECENT matches as a JSON array (max 10):
[
  {{
    "date": "YYYY-MM-DD",
    "competition": "...",
    "opponent": "...",
    "venue": "home" or "away" or "neutral",
    "goals_for": number or null,
    "goals_against": number or null,
    "result": "W", "D", "L" or null
  }}
]

Sort by date descending (most recent first).
If no results found, return: {{"matches": []}}"""

    try:
        raw = await _call_model(SEARCH_SYSTEM_PROMPT, user_prompt, HARD_MODEL)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        result = json.loads(raw)
        if "matches" not in result:
            result = {"matches": result if isinstance(result, list) else []}
        result["_source"] = "ai_search"
        await _set_cache(cache_key_str, result)
        return result
    except (json.JSONDecodeError, RuntimeError) as e:
        return {"matches": [], "error": str(e)}


async def search_h2h(home_team: str, away_team: str) -> dict[str, Any]:
    """Search for head-to-head results between two teams."""
    cache_key_str = _cache_key(f"h2h:{home_team}:{away_team}", "h2h")
    cached = await _get_cached(cache_key_str)
    if cached:
        return cached

    query = f"{home_team} vs {away_team} head to head results history"
    all_results = await _web_search(query)

    if not all_results:
        return {"matches": [], "error": "No web search results found"}

    user_prompt = f"""Search query: head-to-head history for "{home_team} vs {away_team}"

Web search results:
{json.dumps(all_results, indent=2)}

Extract ALL head-to-head matches as a JSON array (max 10):
[
  {{
    "date": "YYYY-MM-DD",
    "competition": "...",
    "home_team": "...",
    "away_team": "...",
    "home_goals": number or null,
    "away_goals": number or null
  }}
]

Sort by date descending (most recent first).
If no results found, return: {{"matches": []}}"""

    try:
        raw = await _call_model(SEARCH_SYSTEM_PROMPT, user_prompt, HARD_MODEL)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        result = json.loads(raw)
        if "matches" not in result:
            result = {"matches": result if isinstance(result, list) else []}
        result["_source"] = "ai_search"
        await _set_cache(cache_key_str, result)
        return result
    except (json.JSONDecodeError, RuntimeError) as e:
        return {"matches": [], "error": str(e)}


async def search_team_conditions(team_name: str) -> dict[str, Any]:
    """Search for team condition info: injuries, morale, fatigue, pressure.

    This is the "soft researcher" — finds qualitative intel about a team.
    """
    cache_key_str = _cache_key(f"conditions:{team_name}", "conditions")
    cached = await _get_cached(cache_key_str)
    if cached:
        return cached

    queries = [
        f"{team_name} team news injuries suspension latest",
        f"{team_name} form morale squad news",
        f"{team_name} manager pressure latest news",
    ]

    all_results: list[dict[str, str]] = []
    for q in queries:
        results = await _web_search(q)
        all_results.extend(results)

    if not all_results:
        return {"conditions": {}, "error": "No web search results found"}

    user_prompt = f"""Search query: team conditions for "{team_name}"

Web search results:
{json.dumps(all_results, indent=2)}

Extract team condition information as JSON:
{{
  "injuries": [
    {{"player": "...", "issue": "...", "status": "out/doubtful/fit", "source": "..."}}
  ],
  "morale": "low/medium/high" with brief explanation,
  "fatigue": "low/medium/high" with brief explanation,
  "manager_pressure": "low/medium/high" with brief explanation,
  "suspensions": ["player names"],
  "travel_concerns": "..." or null,
  "summary": "one paragraph of the key condition factors"
}}

If no team news found, return: {{"conditions": {{"note": "No recent team news found"}}}}"""

    try:
        raw = await _call_with_fallback(SEARCH_SYSTEM_PROMPT, user_prompt, SOFT_MODELS)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        result = json.loads(raw)
        if "conditions" not in result:
            result = {"conditions": result}
        result["_source"] = "ai_search"
        await _set_cache(cache_key_str, result)
        return result
    except (json.JSONDecodeError, RuntimeError) as e:
        return {"conditions": {}, "error": str(e)}


async def general_search(query: str) -> dict[str, Any]:
    """General-purpose AI web search for any football query.

    Returns the raw extracted text and sources.
    """
    cache_key_str = _cache_key(f"general:{query}", "general")
    cached = await _get_cached(cache_key_str)
    if cached:
        return cached

    all_results = await _web_search(query)

    if not all_results:
        return {"results": [], "error": "No web search results found"}

    user_prompt = f"""Search query: "{query}"

Web search results:
{json.dumps(all_results, indent=2)}

Extract the key information from these results and return as JSON:
{{
  "summary": "concise summary of findings",
  "key_points": ["point1", "point2", ...],
  "sources": [{{"title": "...", "url": "..."}}]
}}"""

    try:
        raw = await _call_with_fallback(SEARCH_SYSTEM_PROMPT, user_prompt, SOFT_MODELS)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        result = json.loads(raw)
        result["_source"] = "ai_search"
        await _set_cache(cache_key_str, result)
        return result
    except (json.JSONDecodeError, RuntimeError) as e:
        return {"results": [], "error": str(e)}
