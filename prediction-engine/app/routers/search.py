"""
Search router — AI-powered web search for football data.

Replaces the Football Pro API entirely. Uses Gemini 1.5 Flash
via OpenRouter to search the web and extract structured data.
"""

from fastapi import APIRouter, Query

from app.scrapers.ai_search import (
    search_fixtures,
    search_team_form,
    search_h2h,
    search_team_conditions,
    general_search,
)

router = APIRouter()


@router.get("/search/fixtures")
async def search_fixtures_endpoint(
    q: str = Query(..., description="Team or league name to find fixtures for"),
):
    """Search for upcoming fixtures by team name or league."""
    result = await search_fixtures(q)
    return result


@router.get("/search/team-form")
async def search_team_form_endpoint(
    team: str = Query(..., description="Team name to find form for"),
):
    """Search for recent match results for a team."""
    result = await search_team_form(team)
    return result


@router.get("/search/h2h")
async def search_h2h_endpoint(
    home: str = Query(..., description="Home team name"),
    away: str = Query(..., description="Away team name"),
):
    """Search for head-to-head results between two teams."""
    result = await search_h2h(home, away)
    return result


@router.get("/search/team-conditions")
async def search_team_conditions_endpoint(
    team: str = Query(..., description="Team name to find condition info for"),
):
    """Search for team condition info: injuries, morale, fatigue, pressure."""
    result = await search_team_conditions(team)
    return result


@router.get("/search/general")
async def search_general_endpoint(
    q: str = Query(..., description="Any football-related search query"),
):
    """General-purpose AI web search for any football query."""
    result = await general_search(q)
    return result
