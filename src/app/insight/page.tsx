"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { HardResearchPillars } from "@/components/fixture/hard-research-pillars";
import { HardResearchAgents } from "@/components/fixture/hard-research-agents";
import { SoftResearchPulse } from "@/components/fixture/soft-research-pulse";
import { ChairmanGoalsBandCard } from "@/components/fixture/chairman-goals-band-card";
import { ChairmanOutlierCard } from "@/components/fixture/chairman-outlier-card";
import { computeGoalsBandFromLambdas } from "@/lib/agents";
import type { GoalsBandPrediction } from "@/lib/agents";
import type { ChairmanOutlierReport } from "@/types/chairman-protocol";
import { MatchTime } from "@/components/match-time";
import { LivePredictionPanel } from "@/components/live/live-prediction-panel";
import {
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
  Search,
  ArrowLeft,
} from "lucide-react";
import type { Fixture, AIAnalysis } from "@/types";
import { generateSoftSignals, type SoftSignalReport } from "@/types/insight";

function InsightContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fixtureId = searchParams.get("fixtureId");
  const homeParam = searchParams.get("home");
  const awayParam = searchParams.get("away");
  const leagueParam = searchParams.get("league");
  const dateParam = searchParams.get("date");

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [softSignals, setSoftSignals] = useState<SoftSignalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [outlierReport, setOutlierReport] = useState<ChairmanOutlierReport | null>(null);
  const [loadingOutlier, setLoadingOutlier] = useState(false);
  const [previewAnalysis, setPreviewAnalysis] = useState<{
    pillars: Array<{ label: string; prediction: string; confidence: number }>;
    lambdaHome: number;
    lambdaAway: number;
    ciLow: number;
    ciHigh: number;
    analystA: string | null;
    analystB: string | null;
    analystC: string | null;
    chairman: string | null;
    chairmanSigned: boolean;
    totalGoalsExplanation: string;
    softSignals?: {
      home: { conditions: { morale?: string; fatigue?: string; manager_pressure?: string; injuries?: Array<{player: string; issue: string; status: string}>; summary?: string } } | null;
      away: { conditions: { morale?: string; fatigue?: string; manager_pressure?: string; injuries?: Array<{player: string; issue: string; status: string}>; summary?: string } } | null;
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPopularPreview = !fixtureId && homeParam && awayParam;

  useEffect(() => {
    const load = async () => {
      try {
        // If fixtureId is provided, load from Supabase
        if (fixtureId) {
          const supabase = createClient();
          const { data, error: dbError } = await supabase
            .from("fixtures")
            .select("*")
            .eq("id", parseInt(fixtureId))
            .single();

          if (dbError) throw new Error("Fixture not found");
          const f = data as Fixture;
          setFixture(f);

          // Load existing analysis via RPC (bypasses RLS)
          const { data: analysisData } = await supabase
            .rpc("get_analysis_for_fixture", { p_fixture_id: f.id });

          if (analysisData) {
            // Format agent reports — they're stored as JSON strings, extract summary for display
            const raw = analysisData as Record<string, any>;
            const fmt = (r: string | null) => {
              if (!r) return null;
              try { const p = JSON.parse(r); return p.summary || JSON.stringify(p, null, 2); } catch { return r; }
            };
            if (raw.analyst_a_report) raw.analyst_a_report = fmt(raw.analyst_a_report);
            if (raw.analyst_b_report) raw.analyst_b_report = fmt(raw.analyst_b_report);
            if (raw.chairman_report) raw.chairman_report = fmt(raw.chairman_report);
            setAnalysis(raw as AIAnalysis);
          }

          // Generate soft signals
          setSoftSignals(generateSoftSignals(f.home_team, f.away_team));
        } else if (isPopularPreview) {
          // Popular fixture preview — generate hard research + soft signals on-demand
          const fallbackSignals = generateSoftSignals(homeParam!, awayParam!);
          setSoftSignals(fallbackSignals);

          // Call preview API to generate AI analysis + soft signals
          setGeneratingPreview(true);
          try {
            const res = await fetch("/api/insight/preview", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                homeTeam: homeParam,
                awayTeam: awayParam,
                leagueName: leagueParam || "Unknown League",
              }),
            });
            if (res.ok) {
              const data = await res.json();
              setPreviewAnalysis(data);

              // Use real soft signals from AI search if available
              if (data.softSignals) {
                const ss = data.softSignals;
                const hc = ss.home?.conditions || {};
                const ac = ss.away?.conditions || {};

                // Build anomalies from injury data
                const anomalies: Array<{ type: string; description: string; severity: "high" | "medium" | "low"; team?: "home" | "away" }> = [];
                for (const inj of hc.injuries || []) {
                  anomalies.push({ type: "injury", description: `${inj.player}: ${inj.issue}`, severity: inj.status === "out" ? "high" : "medium", team: "home" });
                }
                for (const inj of ac.injuries || []) {
                  anomalies.push({ type: "injury", description: `${inj.player}: ${inj.issue}`, severity: inj.status === "out" ? "high" : "medium", team: "away" });
                }

                setSoftSignals({
                  morale: {
                    home: hc.morale === "high" ? 0.75 : hc.morale === "medium" ? 0.5 : 0.25,
                    away: ac.morale === "high" ? 0.75 : ac.morale === "medium" ? 0.5 : 0.25,
                  },
                  fatigue: {
                    home: hc.fatigue === "high" ? 0.75 : hc.fatigue === "medium" ? 0.5 : 0.25,
                    away: ac.fatigue === "high" ? 0.75 : ac.fatigue === "medium" ? 0.5 : 0.25,
                  },
                  pressure: {
                    home: hc.manager_pressure === "high" ? 0.75 : hc.manager_pressure === "medium" ? 0.5 : 0.25,
                    away: ac.manager_pressure === "high" ? 0.75 : ac.manager_pressure === "medium" ? 0.5 : 0.25,
                  },
                  matchStakes: "Medium" as const,
                  anomalies,
                });
              }
            }
          } catch (err) {
            console.warn("Preview generation failed:", err);
          } finally {
            setGeneratingPreview(false);
          }
        }

        // Lazy-load chairman outlier report (non-blocking, after main analysis)
        const outlierHome = fixture?.home_team ?? homeParam ?? '';
        const outlierAway = fixture?.away_team ?? awayParam ?? '';
        const outlierLeague = fixture?.league_name ?? leagueParam ?? '';
        if (outlierHome && outlierAway) {
          setLoadingOutlier(true);
          fetch('/api/chairman/outliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              homeTeam: outlierHome,
              awayTeam: outlierAway,
              leagueName: outlierLeague || 'Unknown League',
            }),
          })
            .then((res) => res.ok ? res.json() : null)
            .then((data) => setOutlierReport(data))
            .catch(() => { /* silent fail */ })
            .finally(() => setLoadingOutlier(false));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load fixture"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [fixtureId, homeParam, awayParam, leagueParam, isPopularPreview]);

  // Compute real goals band prediction from available lambda values (must be before early returns)
  const goalsBandPrediction: GoalsBandPrediction | undefined = useMemo(() => {
    const lHome = previewAnalysis?.lambdaHome ?? analysis?.lambda_home;
    const lAway = previewAnalysis?.lambdaAway ?? analysis?.lambda_away;
    if (lHome != null && lAway != null) {
      return computeGoalsBandFromLambdas(lHome, lAway);
    }
    return undefined;
  }, [previewAnalysis, analysis]);

  // -- Loading state --
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-gray-800 rounded-2xl" />
          <div className="h-32 bg-gray-800 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-40 bg-gray-800 rounded-xl" />
            <div className="h-40 bg-gray-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // -- Error state --
  if (error && !fixture && !isPopularPreview) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <Card className="border-red-800 bg-red-900/20">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)] mb-2">
              Fixture Not Found
            </h2>
            <p className="text-sm text-red-400 mb-6">{error}</p>
            <Button
              variant="outline"
              onClick={() => router.push("/search")}
            >
              <Search className="h-4 w-4 mr-2" />
              Search Fixtures
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -- Resolve display values --
  const homeTeam = fixture?.home_team ?? homeParam ?? "Home Team";
  const awayTeam = fixture?.away_team ?? awayParam ?? "Away Team";
  const league = fixture?.league_name ?? leagueParam ?? "League";
  const date = fixture?.scheduled_date ?? dateParam ?? "";
  const venue = fixture?.venue ?? null;

  // Build pillar data from analysis or preview
  const pillars = analysis
    ? [
        {
          label: "Over 2.5 Goals",
          prediction:
            analysis.total_goals_prediction === "over_2.5"
              ? "Yes"
              : "No",
          confidence: analysis.total_goals_confidence,
        },
        {
          label: "Both Teams to Score",
          prediction: analysis.btts_prediction === "yes" ? "Yes" : "No",
          confidence: analysis.btts_confidence,
        },
        {
          label: "Winner",
          prediction:
            analysis.winner_prediction.charAt(0).toUpperCase() +
            analysis.winner_prediction.slice(1),
          confidence: analysis.winner_confidence,
        },
        {
          label: "FHG Over 0.5",
          prediction:
            analysis.first_half_goals_prediction === "over_0.5"
              ? "Yes"
              : "No",
          confidence: analysis.first_half_goals_confidence,
        },
      ]
    : previewAnalysis?.pillars ?? [];

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Fixture Header Card */}
        <Card variant="glassy">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default">{league}</Badge>
              {analysis && analysis.chairman_signed && (
                <Badge variant="premium">ANALYZED</Badge>
              )}
              {!analysis && !isPopularPreview && (
                <Badge variant="default">NO ANALYSIS</Badge>
              )}
              {isPopularPreview && (
                <Badge variant="info">PREVIEW</Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-[oklch(0.22_0.025_260)]">
                  {homeTeam}
                </h1>
              </div>
              <div className="px-6 text-center">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
                  VS
                </span>
              </div>
              <div className="flex-1 text-center sm:text-right">
                <h1 className="text-2xl sm:text-3xl font-bold text-[oklch(0.22_0.025_260)]">
                  {awayTeam}
                </h1>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500 flex-wrap">
              {date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <MatchTime date={date} />
                </span>
              )}
              {venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {venue}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Prediction Panel — only for in-play fixtures loaded from Supabase */}
        {fixture && fixture.status === 'in_play' && (
          <LivePredictionPanel
            fixtureId={fixture.id}
            initialFixture={fixture}
          />
        )}

        {/* Hard Research: 4 Pillars + Bayesian CI */}
        {isPopularPreview && previewAnalysis ? (
          <HardResearchPillars
            pillars={previewAnalysis.pillars}
            lambdaHome={previewAnalysis.lambdaHome}
            lambdaAway={previewAnalysis.lambdaAway}
            ciLow={previewAnalysis.ciLow}
            ciHigh={previewAnalysis.ciHigh}
          />
        ) : analysis ? (
          <HardResearchPillars
            pillars={pillars}
            lambdaHome={analysis.lambda_home}
            lambdaAway={analysis.lambda_away}
            ciLow={analysis.confidence_interval_low}
            ciHigh={analysis.confidence_interval_high}
          />
        ) : generatingPreview ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Loader2 className="h-8 w-8 text-gray-700 mx-auto mb-3 animate-spin" />
              <h3 className="text-base font-semibold text-[oklch(0.22_0.025_260)] mb-1">
                Generating Analysis
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Running AI agent analysis for this fixture...
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-10 text-center">
              <Loader2 className="h-8 w-8 text-gray-700 mx-auto mb-3 animate-spin" />
              <h3 className="text-base font-semibold text-[oklch(0.22_0.025_260)] mb-1">
                Analysis Pending
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Analysis is being prepared for this fixture. Check back shortly.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge variant="default">4 Pillars</Badge>
                <Badge variant="info">90% CI</Badge>
                <Badge variant="premium">&lambda; Parameters</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hard Research: Agent Reports */}
        <HardResearchAgents
          analystA={analysis?.analyst_a_report ?? previewAnalysis?.analystA ?? null}
          analystB={analysis?.analyst_b_report ?? previewAnalysis?.analystB ?? null}
          analystC={analysis?.analyst_c_report ?? previewAnalysis?.analystC ?? null}
          chairman={analysis?.chairman_report ?? previewAnalysis?.chairman ?? null}
          chairmanSigned={analysis?.chairman_signed ?? previewAnalysis?.chairmanSigned ?? false}
          totalGoalsExplanation={previewAnalysis?.totalGoalsExplanation ?? null}
        />

        {/* Soft Research: Team Pulse */}
        {softSignals && (
          <SoftResearchPulse
            signals={softSignals}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        )}

        {/* Chairman — 2/3 Goal Band */}
        <ChairmanGoalsBandCard
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          league={league}
          prediction={goalsBandPrediction}
        />

        {/* Chairman — Outlier Detection (over 4.5 goals) */}
        <ChairmanOutlierCard
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          league={league}
          report={outlierReport}
          loading={loadingOutlier}
        />

        {/* Bottom CTA */}
        <div className="text-center py-8 border-t border-gray-800">
          <Button variant="outline" size="lg" onClick={() => router.push("/search")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Browse All Fixtures
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function InsightPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-gray-800 rounded-2xl" />
            <div className="h-32 bg-gray-800 rounded-xl" />
          </div>
        </div>
      }
    >
      <InsightContent />
    </Suspense>
  );
}
