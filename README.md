# varview-club

**Soccer prediction engine using Dixon-Coles bivariate Poisson modeling and the Chairman's Protocol — an outlier detection system for high-scoring matches.**

Built on statistical modeling (Dixon & Coles, 1997) with a layered qualitative filter for identifying matches with elevated probability of exceeding 4.5 total goals.

Zero external dependencies required. No API keys, no database, no signup — clone and run.

## Table of Contents

- [Architecture](#architecture)
- [The Chairman's Protocol](#the-chairmans-protocol)
- [Pipeline Flow](#pipeline-flow)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [License](#license)

---

## Architecture

```
Team Ratings          Dixon-Coles             4 Pillars
┌──────────┐         ┌──────────────┐        ┌──────────────┐
│ Attack/   │  ──►   │  Bivariate   │  ──►   │ Over 2.5     │
│ Defense   │        │  Poisson     │        │ BTTS         │
│ Strength  │        │  λ_home      │        │ Winner       │
│ Ratings   │        │  λ_away      │        │ FHG Over 0.5 │
└──────────┘         │  ρ (rho)     │        └──────────────┘
                     └──────────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │  Chairman's Protocol│
                  │  (over-4.5 outlier  │
                  │   detection)        │
                  └─────────────────────┘
```

The engine computes match outcome probabilities from team strength ratings using the Dixon-Coles bivariate Poisson distribution. The Chairman's Protocol adds a qualitative layer that evaluates 10 signature conditions and 8 veto criteria against each match to flag high-confidence over-4.5 goal outliers.

---

## The Chairman's Protocol

The Chairman's Protocol screens matches for over-4.5 goal outlier potential. It runs alongside the core 4-pillar model as an independent analytical layer.

### 3 Analyst Archetypes

| Analyst | Role | Data Source |
|---------|------|-------------|
| **Statistician** | Quantitative form analysis (xG, H2H averages, goal rates) | Synthetic from built-in team ratings |
| **Scout** | Tactical profile, player quality, morale, absences | Synthetic default profiles |
| **Observer** | Environment (weather, venue, travel, referee, competition context) | Synthetic defaults |

### Pipeline Stages

```
Fixture Input
  │
  ├─► 3 Parallel Analysts ──────────────► Statistician, Scout, Observer
  │
  ├─► estimateLambdas() ────────────────► Attack/defense strength → λ estimates
  │
  ├─► computeModifiers() ────────────────► Rest, availability, weather, referee
  │
  ├─► Dixon-Coles ──────────────────────► calculateProbabilities() → P(over4.5)
  │
  ├─► Signature Stack ─────────────────► 10 qualitative conditions
  │
  ├─► Veto List ───────────────────────► 8 disqualification checks
  │
  ├─► Composite Confidence ────────────► Weighted formula (35/30/25/10)
  │
  └─► Priority Ranking ────────────────► urgencyScore × convictionScore / 10
       │
       ▼
  FLAGGED (≥0.75) / WATCH (0.60–0.74) / PASS (<0.60)
```

### Signature Stack — 10 Conditions

| ID | Condition | Threshold |
|----|-----------|-----------|
| SIG_01 | Twin attack signal | Both teams adjusted lambda_attack ≥ 1.6 |
| SIG_02 | Twin defensive vulnerability | Both teams xGA ≥ 1.3 |
| SIG_03 | Goalkeeper weakness | PSxG − goals ≤ −0.10 |
| SIG_04 | Historical H2H signature | Avg ≥ 3.2 goals, n ≥ 4 matches |
| SIG_05 | Stakes alignment | Both teams need result, GD relevant |
| SIG_06 | Tactical mismatch | Press vs build / transition vs line |
| SIG_07 | Set-piece asymmetry | Threat ≥ 7 vs vulnerability ≥ 7 |
| SIG_08 | Environment permits | Good pitch, wind ≤ 25kph, precip ≤ 40% |
| SIG_09 | Defensive absences | Combined xG lost ≥ 0.40 |
| SIG_10 | Referee tendency | Penalties ≥ 0.30/match, lenient cards |

### Veto List — 8 Disqualifications

| ID | Condition | Type | Effect |
|----|-----------|------|--------|
| VETO_01 | Dead rubber mismatch | Hard | confidence = 0 |
| VETO_02 | Adverse conditions | Hard | confidence = 0 |
| VETO_03 | Both teams defensive | Hard | confidence = 0 |
| VETO_04 | Multiple key absences | Hard | confidence = 0 |
| VETO_05 | Post-tournament friendly | Hard | confidence = 0 |
| VETO_06 | High-friction referee | Soft | −10% per soft veto |
| VETO_07 | Thin market + contradictory movement | Soft | −10% per soft veto |
| VETO_08 | Extreme altitude | Soft | −10% per soft veto |

### Composite Confidence Formula

```
confidence = (gate1Score × 0.35) + (gate2Score × 0.30) + (gate3Score × 0.25) + (gate4Score × 0.10)
```

| Gate | Weight | Component | Scoring |
|------|--------|-----------|---------|
| Gate 1 | 35% | Poisson P(over4.5) | min(1.0, prob / 0.42) |
| Gate 2 | 30% | Signature stack | passRate (halved if < 7 passed) |
| Gate 3 | 25% | Market edge | min(1.0, edge / 12pp) |
| Gate 4 | 10% | Veto multiplier | 0 if vetoed, else multiplier |

### Priority Ranking

```
priorityScore = urgencyScore × convictionScore / 10
tier: ELITE (≥7) | HIGH (≥5) | MEDIUM (≥3) | LOW
```

Urgency score depends on time to kickoff (2–10 scale). Conviction score is composite confidence × 10.

---

## Getting Started

### Prerequisites

- Node.js 18+

### Install

```bash
git clone https://github.com/shuxincode/varview-club.git
cd varview-club
npm install
```

### Run

```bash
npm run dev        # Start development server at http://localhost:3000
npm run build      # Production build
npm run lint       # Run ESLint
npx tsc --noEmit   # Type check
```

---

## API Reference

### POST /api/chairman/outliers

Returns a full ChairmanOutlierReport with signature stack results, veto status, composite confidence, priority ranking, and detailed reasoning.

```bash
curl -X POST http://localhost:3000/api/chairman/outliers \
  -H "Content-Type: application/json" \
  -d '{"homeTeam":"Manchester City","awayTeam":"Luton Town","leagueName":"Premier League"}'
```

**Response:**

```json
{
  "fixture": { "homeTeam": "Manchester City", "awayTeam": "Luton Town", "league": "Premier League" },
  "status": "FLAGGED",
  "statusReason": "High-confidence outlier: all gates passed with strong conviction",
  "lambdaHome": 2.45,
  "lambdaAway": 1.32,
  "totalLambda": 3.77,
  "probOver4_5": 0.42,
  "signatures": {
    "conditions": [...],
    "totalPassed": 7,
    "totalConditions": 10
  },
  "vetos": { "vetos": [...], "hardVetoCount": 0, "softVetoCount": 1 },
  "confidence": {
    "compositeConfidence": 0.78,
    "confidenceLabel": "FLAGGED",
    "gate1Score": 0.91,
    "gate2Score": 0.70,
    "gate3Score": 0.50,
    "gate4Score": 0.90
  },
  "priority": { "priorityScore": 7.1, "tier": "HIGH" },
  "primaryDrivers": [...],
  "primaryRisks": [...],
  "reasoningSummary": "..."
}
```

---

## Project Structure

```
src/
├── lib/
│   ├── dixon-coles.ts                 # Bivariate Poisson solver
│   ├── chairman-protocol/             # Chairman's Protocol
│   │   ├── index.ts                   # Barrel export
│   │   ├── constants.ts               # Thresholds, weights, definitions
│   │   ├── signature-stack.ts         # 10-condition qualitative filter
│   │   ├── veto-list.ts               # 8 disqualification checks
│   │   ├── composite-confidence.ts    # Weighted confidence formula
│   │   ├── priority-ranking.ts        # Urgency × conviction scoring
│   │   ├── analyst-data.ts            # 3 synthetic analysts
│   │   └── chairman-synthesis.ts      # Pipeline orchestrator
│   └── agents/
│       ├── team-ratings.ts            # 100+ team strength ratings
│       └── chairman-goals-band.ts     # 2–3 goal band prediction
├── types/
│   └── chairman-protocol.ts           # TypeScript interfaces
├── app/
│   └── api/chairman/outliers/         # POST endpoint
└── components/
    └── fixture/
        ├── chairman-outlier-card.tsx   # FLAGGED/WATCH/PASS UI card
        └── chairman-goals-band-card.tsx
```

---

## Configuration

Thresholds and weights are defined in [src/lib/chairman-protocol/constants.ts](src/lib/chairman-protocol/constants.ts). Key defaults:

| Constant | Value | Description |
|----------|-------|-------------|
| `FLAGGED_THRESHOLD` | 0.75 | Composite confidence for FLAGGED status |
| `WATCH_THRESHOLD` | 0.60 | Composite confidence for WATCH status |
| `POISSON_P_OVER_45_THRESHOLD` | 0.42 | Gate 1 scoring reference point |
| `MARKET_EDGE_THRESHOLD` | 0.12 | Gate 3 reference (+12pp) |
| `GATE1_WEIGHT` | 0.35 | Poisson score weight |
| `GATE2_WEIGHT` | 0.30 | Signature weight |
| `GATE3_WEIGHT` | 0.25 | Market edge weight |
| `GATE4_WEIGHT` | 0.10 | Veto multiplier weight |
| `SIG_MIN_SCORE` | 7 | Minimum signatures for full gate 2 score |

Team strength ratings are in [src/lib/agents/team-ratings.ts](src/lib/agents/team-ratings.ts) covering 100+ teams across 20+ leagues.

---

## License

MIT — see [LICENSE](LICENSE).

---

*Reference: Dixon, M.J. and Coles, S.G. (1997), "Modelling Association Football Scores and Inefficiencies in the Football Betting Market". Journal of the Royal Statistical Society, Series C.*
