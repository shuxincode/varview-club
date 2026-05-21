'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalysisDisplay } from '@/components/fixture/analysis-display';
import { LivePredictionPanel } from '@/components/live/live-prediction-panel';
import { ChairmanGoalsBandCard } from '@/components/fixture/chairman-goals-band-card';
import { computeGoalsBandFromLambdas } from '@/lib/agents';
import { MatchTime } from '@/components/match-time';
import { createClient } from '@/lib/supabase/client';
import {
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
  Zap,
} from 'lucide-react';
import type { Fixture, AIAnalysis, RevealedAnalysis } from '@/types';
import type { GoalsBandPrediction } from '@/lib/agents';
import { useMemo } from 'react';

export default function FixturePage() {
  const params = useParams();
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [revealed, setRevealed] = useState<RevealedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFixture = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('fixtures')
          .select('*')
          .eq('id', params.id)
          .single();
        setFixture(data as Fixture);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load fixture');
      } finally {
        setLoading(false);
      }
    };
    loadFixture();
  }, [params.id]);

  const handleReveal = async () => {
    setRevealing(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: analysisData } = await supabase
        .rpc('get_analysis_for_fixture', { p_fixture_id: params.id });
      const { data: fixtureData } = await supabase
        .from('fixtures')
        .select('*')
        .eq('id', params.id)
        .single();

      if (!analysisData) throw new Error('Analysis not available for this fixture');
      setRevealed({
        analysis: analysisData as unknown as AIAnalysis,
        fixture: fixtureData as Fixture,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal analysis');
    } finally {
      setRevealing(false);
    }
  };

  // Compute Chairman's Goals Band prediction when analysis has lambda values
  const goalsBandPrediction: GoalsBandPrediction | undefined = useMemo(() => {
    if (analysis?.lambda_home != null && analysis?.lambda_away != null) {
      return computeGoalsBandFromLambdas(analysis.lambda_home, analysis.lambda_away);
    }
    return undefined;
  }, [analysis?.lambda_home, analysis?.lambda_away]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-800 rounded w-1/3" />
          <div className="h-32 bg-gray-800 rounded-xl" />
          <div className="h-64 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !fixture) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-red-800 bg-red-900/20">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)] mb-2">Error Loading Fixture</h2>
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Fixture not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Fixture Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="default">{fixture.league_name}</Badge>
          <Badge
            variant={
              fixture.status === 'finished'
                ? 'success'
                : fixture.status === 'in_play'
                ? 'warning'
                : 'default'
            }
          >
            {fixture.status}
          </Badge>
        </div>

        <Card variant="glassy">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-3 mb-2 justify-center sm:justify-start">
                  {fixture.home_logo && (
                    <img src={fixture.home_logo} alt="" className="h-10 w-10 object-contain" />
                  )}
                  <h2 className="text-xl sm:text-2xl font-bold text-[oklch(0.22_0.025_260)]">{fixture.home_team}</h2>
                </div>
                {fixture.home_goals !== null && (
                  <p className="text-3xl font-bold text-[oklch(0.22_0.025_260)] text-center sm:text-left mt-2">
                    {fixture.home_goals}
                  </p>
                )}
              </div>

              <div className="px-6 text-center">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">VS</span>
              </div>

              <div className="flex-1 text-center sm:text-right">
                <div className="flex items-center gap-3 mb-2 justify-center sm:justify-end">
                  <h2 className="text-xl sm:text-2xl font-bold text-[oklch(0.22_0.025_260)]">{fixture.away_team}</h2>
                  {fixture.away_logo && (
                    <img src={fixture.away_logo} alt="" className="h-10 w-10 object-contain" />
                  )}
                </div>
                {fixture.away_goals !== null && (
                  <p className="text-3xl font-bold text-[oklch(0.22_0.025_260)] text-center sm:text-right mt-2">
                    {fixture.away_goals}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <MatchTime date={fixture.scheduled_date} />
              </span>
              {fixture.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {fixture.venue}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Prediction Panel — only renders for in-play fixtures */}
      <LivePredictionPanel
        fixtureId={Number(params.id)}
        initialFixture={fixture}
      />

      {/* Chairman's Goals Band Card — only when analysis lambda values are available */}
      {goalsBandPrediction && (
        <div className="mb-6">
          <ChairmanGoalsBandCard
            homeTeam={fixture.home_team}
            awayTeam={fixture.away_team}
            league={fixture.league_name}
            prediction={goalsBandPrediction}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-800 bg-red-900/20 mb-6">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Section */}
      {revealed ? (
        <AnalysisDisplay
          analysis={revealed.analysis}
          fixture={fixture}
        />
      ) : (
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="rounded-full bg-gray-800 p-4 w-fit mx-auto mb-6">
              <Zap className="h-8 w-8 text-[#0052FF]" />
            </div>
            <h2 className="text-xl font-semibold text-[oklch(0.22_0.025_260)] mb-3">Analysis Ready</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              View the full AI-powered analysis for this fixture. Includes all 4 prediction pillars,
              Bayesian confidence intervals, and Chairman-verified reports.
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Badge variant="default">4 Pillars</Badge>
              <Badge variant="premium">Chairman Signed</Badge>
              <Badge variant="info">90% CI</Badge>
            </div>

            <Button size="lg" onClick={handleReveal} disabled={revealing}>
              {revealing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revealing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Reveal Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
