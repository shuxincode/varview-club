// Supabase Edge Function: Threads Social Push
// Pushes daily success metrics to Threads after Chairman sign-off

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const threadsToken = Deno.env.get('THREADS_ACCESS_TOKEN');
    if (!threadsToken) {
      console.log('THREADS_ACCESS_TOKEN not configured, skipping push');
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get today's signed analyses with finished fixtures
    const { data: analyses } = await supabase
      .from('ai_analyses')
      .select(`
        *,
        fixtures!inner (
          status,
          home_team,
          away_team,
          home_goals,
          away_goals,
          league_name
        )
      `)
      .eq('chairman_signed', true)
      .eq('fixtures.status', 'finished');

    if (!analyses || analyses.length === 0) {
      console.log('No completed analyses to push');
      return new Response(JSON.stringify({ pushed: false, reason: 'no_data' }), { status: 200 });
    }

    // Calculate daily stats
    let totalCorrect = 0;
    let totalPicks = 0;
    const pickLines: string[] = [];

    for (const analysis of analyses) {
      const fixture = analysis.fixtures as Record<string, unknown>;
      const homeGoals = fixture.home_goals as number;
      const awayGoals = fixture.away_goals as number;

      if (homeGoals === null || awayGoals === null) continue;

      const totalGoals = homeGoals + awayGoals;
      const btts = homeGoals > 0 && awayGoals > 0;
      const homeWin = homeGoals > awayGoals;
      const firstHalfGoals = (fixture.home_ht_goals as number || 0) + (fixture.away_ht_goals as number || 0);

      let correct = 0;

      if (totalGoals > 2 && analysis.total_goals_prediction === 'over_2.5') correct++;
      else if (totalGoals <= 2 && analysis.total_goals_prediction === 'under_2.5') correct++;

      if (btts && analysis.btts_prediction === 'yes') correct++;
      else if (!btts && analysis.btts_prediction === 'no') correct++;

      if (homeWin && analysis.winner_prediction === 'home') correct++;
      else if (!homeWin && analysis.winner_prediction !== 'home') correct++;

      if (firstHalfGoals >= 1 && analysis.first_half_goals_prediction === 'over_0.5') correct++;
      else if (firstHalfGoals === 0 && analysis.first_half_goals_prediction === 'under_0.5') correct++;

      totalCorrect += correct;
      totalPicks += 4;

      const matchCorrect = correct >= 3 ? '✅' : correct >= 2 ? '⚠️' : '❌';
      pickLines.push(
        `${fixture.home_team} vs ${fixture.away_team}: ${correct}/4 ${matchCorrect}`
      );
    }

    const successRate = totalPicks > 0 ? Math.round((totalCorrect / totalPicks) * 100) : 0;

    // Build Threads post
    const post = `📊 VARview.club Daily Report — ${today}

🎯 Success Rate: ${successRate}% (${totalCorrect}/${totalPicks})

${pickLines.slice(0, 5).join('\n')}

Powered by Dixon-Coles + Bayesian CI + AI Agents
#FootballAnalytics #VARview`;

    // Post to Threads API
    const threadsRes = await fetch(
      `https://graph.threads.net/v1.0/me/threads?access_token=${threadsToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'TEXT',
          text: post,
        }),
      }
    );

    if (!threadsRes.ok) {
      const error = await threadsRes.text();
      console.error('Threads API error:', error);
      throw new Error(`Threads API error: ${error}`);
    }

    const result = await threadsRes.json();

    // Publish the container
    if (result.id) {
      await fetch(
        `https://graph.threads.net/v1.0/me/threads_publish?access_token=${threadsToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: result.id }),
        }
      );
    }

    console.log('Threads post published:', result.id);

    return new Response(
      JSON.stringify({
        pushed: true,
        successRate,
        correct: totalCorrect,
        total: totalPicks,
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Threads push error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
