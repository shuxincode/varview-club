"""
Invoke OpenRouter owl-alpha for autonomous soft-signal browsing.
Uses the collected seed data as grounding, then lets owl-alpha
enrich and format the final structured JSON payload.
"""
import asyncio
import json
import os
import sys

# Read API key from .env.local
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
api_key = None
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("OPENROUTER_API_KEY="):
                api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

if not api_key:
    print("ERROR: OPENROUTER_API_KEY not found in .env.local")
    sys.exit(1)

# First, seed our collected data
from app.scrapers.seed_data import data as seed_data
from app.scrapers.web_search import seed_static_data
seed_static_data(seed_data)

# Now run the soft signal collector
from app.scrapers.soft_signals import collect_soft_signals

async def main():
    print("=" * 60)
    print("SOFT SIGNAL SCRAPER - El Clasico: Barcelona vs Real Madrid")
    print("Engine: openrouter/owl-alpha (autonomous web reasoning)")
    print("=" * 60)

    # Step 1: Collect via heuristic signals first
    print("\n[1/3] Collecting soft signals via heuristic extraction...")
    report = await collect_soft_signals(
        home_team="Barcelona",
        away_team="Real Madrid",
        competition="La Liga",
        fixture_date="2026-05-10",
        venue="Estadi Olimpic Lluis Companys (Montjuïc)",
    )
    print(f"  -> Collected {sum(len(v) for v in report.raw_signals.values())} raw signals")
    print(f"  -> Qualitative scores: {json.dumps(report.qualitative_scores, indent=4)}")
    print(f"  -> Anomalies: {len(report.contextual_anomalies)}")

    # Step 2: Enrich via OpenRouter owl-alpha
    print("\n[2/3] Enriching analysis via OpenRouter owl-alpha...")
    enriched = await enrich_via_owl_alpha(report.to_json(), api_key)

    # Step 3: Output final structured payload
    print("\n[3/3] Final structured output:")
    print("=" * 60)

    output = enriched if enriched else report.to_json()
    print(output)

    # Save to file
    out_path = os.path.join(os.path.dirname(__file__), "soft_signal_report.json")
    with open(out_path, "w") as f:
        f.write(output)
    print(f"\nReport saved to: {out_path}")


async def enrich_via_owl_alpha(report_json: str, key: str) -> str | None:
    """Send the heuristic report to owl-alpha for enrichment and validation."""
    import httpx

    system_prompt = """You are an autonomous football intelligence analyst (Owl Alpha).
Your task is to enrich a soft signal report for El Clásico (Barcelona vs Real Madrid).

Review the collected signals and:
1. VERIFY or correct the qualitative_scores (morale, fatigue, pressure on 0.0-1.0)
2. CLASSIFY match stakes correctly (High-Stakes: title decider El Clásico)
3. ADD any missing contextual anomalies you infer from the data
4. FORMAT as clean JSON with these top-level fields:
   - fixture_metadata
   - raw_signals (grouped by category)
   - qualitative_scores (with match_stakes classification)
   - contextual_anomalies (with type, description, severity)
   - verifier_notes (optimist/pessimist slices if conflicting signals)

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting
- If morale signals conflict, provide BOTH optimist and pessimist slices
- Prioritize local Spanish and Catalan news perspectives"""

    payload = {
        "model": "openrouter/owl-alpha",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here is the collected soft signal data for El Clásico. Enrich and validate it:\n\n{report_json}"},
        ],
        "max_tokens": 4096,
        "temperature": 0.3,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "VARview Soft Signal Scraper",
                },
                json=payload,
            )
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"]
                # Strip markdown code fences if present
                if content.startswith("```"):
                    content = content.split("\n", 1)[1]
                    content = content.rsplit("```", 1)[0]
                return content.strip()
            else:
                print(f"  OpenRouter API error: {resp.status_code}")
                print(f"  Response: {resp.text[:500]}")
                return None
    except Exception as e:
        print(f"  OpenRouter request failed: {e}")
        return None


if __name__ == "__main__":
    asyncio.run(main())
