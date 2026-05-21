// Supabase Edge Function: Daily Tabulation
// Calculates success rate after Chairman-signed picks resolve post-match

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface DailyTabulationResult {
  date: string;
  total_picks: number;
  correct_picks: number;
  success_rate: number;
  total_revenue: number;
}

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today = new Date().toISOString().split('T')[0];

    // Get all finished fixtures from today with Chairman-signed analyses
    const { data: analyses, error: analysisError } = await supabase
      .from('ai_analyses')
      .select(`
        *,
        fixtures!inner (
          status,
          home_goals,
          away_goals,
          home_ht_goals,
          away_ht_goals,
          scheduled_date
        )
      `)
      .eq('chairman_signed', true)
      .gte('fixtures.scheduled_date', today)
      .lt('fixtures.scheduled_date', new Date(Date.now() + 86400000).toISOString().split('T')[0])
      .eq('fixtures.status', 'finished');

    if (analysisError) throw analysisError;

    let correctPicks = 0;
    let totalPicks = 0;

    for (const analysis of analyses || []) {
      const fixture = analysis.fixtures as Record<string, unknown>;
      const homeGoals = fixture.home_goals as number;
      const awayGoals = fixture.away_goals as number;

      if (homeGoals === null || awayGoals === null) continue;

      const totalGoals = homeGoals + awayGoals;
      const btts = homeGoals > 0 && awayGoals > 0;
      const homeWin = homeGoals > awayGoals;
      const awayWin = awayGoals > homeGoals;
      const firstHalfGoals = (fixture.home_ht_goals as number || 0) + (fixture.away_ht_goals as number || 0);

      let fixtureCorrect = 0;
      let fixtureTotal = 4;

      // Total Goals
      if (totalGoals > 2 && analysis.total_goals_prediction === 'over_2.5') fixtureCorrect++;
      else if (totalGoals <= 2 && analysis.total_goals_prediction === 'under_2.5') fixtureCorrect++;

      // BTTS
      if (btts && analysis.btts_prediction === 'yes') fixtureCorrect++;
      else if (!btts && analysis.btts_prediction === 'no') fixtureCorrect++;

      // Winner
      if (homeWin && analysis.winner_prediction === 'home') fixtureCorrect++;
      else if (awayWin && analysis.winner_prediction === 'away') fixtureCorrect++;
      else if (!homeWin && !awayWin && analysis.winner_prediction === 'draw') fixtureCorrect++;

      // First Half Goals
      if (firstHalfGoals >= 1 && analysis.first_half_goals_prediction === 'over_0.5') fixtureCorrect++;
      else if (firstHalfGoals === 0 && analysis.first_half_goals_prediction === 'under_0.5') fixtureCorrect++;

      // Store success rate
      const successRate = fixtureTotal > 0 ? fixtureCorrect / fixtureTotal : 0;
      await supabase
        .from('ai_analyses')
        .update({ success_rate: successRate })
        .eq('id', analysis.id);

      correctPicks += fixtureCorrect;
      totalPicks += fixtureTotal;
    }

    const result: DailyTabulationResult = {
      date: today,
      total_picks: totalPicks,
      correct_picks: correctPicks,
      success_rate: totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : 0,
      total_revenue: 0,
    };

    // Log tabulation
    console.log('Daily Tabulation:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Tabulation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
