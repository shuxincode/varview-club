import logging

from fastapi import APIRouter, HTTPException, Query

from app.resolver.match import resolve
from app.scrapers.fbref import get_team_matches
from app.scrapers.ai_search import search_fixtures, search_h2h
from app.engine.inference import compute_lambda_adj

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/predict")
async def predict(
    q: str = Query(..., description="Match query, e.g. 'Elfsborg vs Brommapojkarna'"),
    skip_registry: bool = Query(False, description="Skip Redis registry and use AI search directly"),
):
    """
    Resolve a match query, scrape team form data via AI web search,
    and compute λ_adj (adjusted goal expectancy).

    Falls back to on-the-fly AI web search if the match is not in the Redis registry.
    The hard researcher (Gemini 1.5 Flash) searches the web to find match data.
    """
    home_team: str | None = None
    away_team: str | None = None
    match_data = None

    # 1. Try to resolve from Redis registry (fast path)
    if not skip_registry:
        match = await resolve(q)
        if match:
            home_team = match["home_team"]
            away_team = match["away_team"]
            match_data = match

    # 2. If not in registry, use AI search to find the match
    if not home_team or not away_team:
        logger.info(f"[predict] Match not in registry, using AI search for: {q}")
        ai_result = await search_fixtures(q)
        fixtures = ai_result.get("fixtures", [])

        if fixtures:
            # Try to parse the query to find the right fixture
            # First fixture is usually the best match
            best = fixtures[0]
            home_team = best.get("home_team", "")
            away_team = best.get("away_team", "")

        if not home_team or not away_team:
            raise HTTPException(
                status_code=404,
                detail=f"Could not find match for query: {q}. "
                       "AI search was unable to discover this fixture.",
            )

    # 3. Fetch team form from AI web search
    home_matches = await get_team_matches(home_team)
    away_matches = await get_team_matches(away_team)

    if not home_matches:
        logger.warning(f"No form data found for home team: {home_team}")
    if not away_matches:
        logger.warning(f"No form data found for away team: {away_team}")

    # 4. H2H: use AI search if available
    h2h = _find_h2h(home_matches, away_team, away_matches, home_team)
    if not h2h:
        # Try AI search for H2H
        try:
            h2h_result = await search_h2h(home_team, away_team)
            h2h = _convert_h2h_result(h2h_result, home_team, away_team)
        except Exception as e:
            logger.warning(f"H2H search failed: {e}")

    # 5. Compute λ_adj
    result = compute_lambda_adj(home_matches, away_matches, h2h)

    return {
        "match": {
            "home_team": home_team,
            "away_team": away_team,
            "flashscore_id": match_data.get("flashscore_id", "") if match_data else "",
            "kickoff_utc": match_data.get("kickoff_utc", "") if match_data else "",
        },
        "lambda_adj": result["lambda_adj"],
        "confidence": result["confidence"],
        "breakdown": {
            "form_home_expected": result["form_home_expected"],
            "form_away_expected": result["form_away_expected"],
            "h2h_total_avg": result["h2h_total_avg"],
            "h2h_samples": result["h2h_samples"],
            "form_weight": result["form_weight"],
            "h2h_weight": result["h2h_weight"],
        },
        "data_quality": {
            "home_matches_used": result["home_matches_used"],
            "away_matches_used": result["away_matches_used"],
        },
        "_source": match_data.get("flashscore_id", "") if match_data else "ai_search",
    }


@router.post("/predict/batch")
async def predict_batch(queries: list[str]):
    """Batch prediction for multiple match queries."""
    results = []
    for q in queries:
        try:
            res = await predict(q=q)
            results.append({"query": q, "status": "ok", "data": res})
        except HTTPException as e:
            results.append({"query": q, "status": "not_found", "detail": e.detail})
        except Exception as e:
            results.append({"query": q, "status": "error", "detail": str(e)})
    return {"results": results}


def _find_h2h(
    home_matches: list[dict],
    away_team: str,
    away_matches: list[dict],
    home_team: str,
) -> list[dict]:
    """Cross-reference matches between two teams from their respective match lists."""
    from rapidfuzz import utils, fuzz

    h2h: list[dict] = []
    seen: set[str] = set()

    def norm(n: str) -> str:
        return utils.default_process(n)

    away_norm = norm(away_team)
    home_norm = norm(home_team)

    for m in home_matches:
        opp = norm(m.get("opponent", ""))
        if opp and (opp == away_norm or fuzz.ratio(opp, away_norm) > 85):
            key = f"{m['date']}-{home_team}-{away_team}"
            if key not in seen:
                seen.add(key)
                h2h.append(m)

    for m in away_matches:
        opp = norm(m.get("opponent", ""))
        if opp and (opp == home_norm or fuzz.ratio(opp, home_norm) > 85):
            key = f"{m['date']}-{away_team}-{home_team}"
            if key not in seen:
                seen.add(key)
                # Flip perspective so goals_for = total goals in match
                h2h.append({
                    "date": m["date"],
                    "goals_for": m.get("goals_against"),
                    "goals_against": m.get("goals_for"),
                    "opponent": m.get("opponent"),
                    "result": m.get("result"),
                    "competition": m.get("competition"),
                })

    return h2h


def _convert_h2h_result(h2h_result: dict, home_team: str, away_team: str) -> list[dict]:
    """Convert AI search H2H result format to internal format."""
    matches = h2h_result.get("matches", [])
    converted = []
    for m in matches:
        converted.append({
            "date": m.get("date", ""),
            "goals_for": m.get("home_goals"),
            "goals_against": m.get("away_goals"),
            "opponent": away_team if m.get("home_team", "").lower() == home_team.lower() else home_team,
            "result": "",
            "competition": m.get("competition", ""),
        })
    return converted
