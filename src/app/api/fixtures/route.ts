export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp, buildRateLimitHeaders } from '@/lib/rate-limiter';

const PREDICTION_ENGINE_URL = process.env.PREDICTION_ENGINE_URL || 'http://localhost:8000';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ fixtures: [] });
  }

  try {
    // Rate limiting (IP-based, no auth required for search)
    const ip = getClientIp(request);
    const { allowed, ...rateLimitInfo } = await checkRateLimit(null, ip, '/api/fixtures');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.', fixtures: [] },
        { status: 429, headers: buildRateLimitHeaders(rateLimitInfo) }
      );
    }

    // Try fetching from Supabase first (cached data)
    const supabase = await createServerSupabaseClient();
    const { data: cachedFixtures } = await supabase
      .from('fixtures')
      .select('*')
      .or(`home_team.ilike.%${query}%,away_team.ilike.%${query}%,league_name.ilike.%${query}%`)
      .limit(20);

    if (cachedFixtures && cachedFixtures.length > 0) {
      return NextResponse.json({ fixtures: cachedFixtures, source: 'cache' });
    }

    // If not in cache, use AI search via the prediction engine
    // The hard researcher (Gemini 1.5 Flash) searches the web for fixture data
    let fixtures: any[] = [];
    let source = 'ai_search';

    try {
      const aiUrl = `${PREDICTION_ENGINE_URL}/search/fixtures?q=${encodeURIComponent(query)}`;
      const aiRes = await fetch(aiUrl, { signal: AbortSignal.timeout(15000) });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        fixtures = aiData.fixtures || [];
      } else {
        console.warn('[fixtures] AI search returned', aiRes.status, '- trying Supabase filter');
      }
    } catch (err) {
      console.warn('[fixtures] AI search unreachable:', err);
    }

    if (fixtures.length === 0) {
      // Fallback: try a broader Supabase query without ILIKE
      const { data: fallbackFixtures } = await supabase
        .from('fixtures')
        .select('*')
        .limit(10);

      if (fallbackFixtures && fallbackFixtures.length > 0) {
        // Basic client-side filter
        const ql = query.toLowerCase();
        const filtered = fallbackFixtures.filter(
          (f) =>
            f.home_team?.toLowerCase().includes(ql) ||
            f.away_team?.toLowerCase().includes(ql) ||
            f.league_name?.toLowerCase().includes(ql)
        );
        if (filtered.length > 0) {
          return NextResponse.json({ fixtures: filtered, source: 'cache_fallback' });
        }
      }
    }

    // Map AI results to our fixture format
    const mappedFixtures = fixtures.map((f: any, idx: number) => ({
      id: `ai_${idx}_${Date.now()}`,
      api_fixture_id: 0,
      league_name: f.league || 'Unknown League',
      home_team: f.home_team,
      away_team: f.away_team,
      home_logo: null,
      away_logo: null,
      venue: f.venue || null,
      status: 'scheduled',
      scheduled_date: f.date || null,
    }));

    return NextResponse.json({ fixtures: mappedFixtures, source });
  } catch (error) {
    console.error('Fixture search error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixtures', fixtures: [] },
      { status: 500 }
    );
  }
}
