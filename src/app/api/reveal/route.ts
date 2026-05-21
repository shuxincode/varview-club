import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp, buildRateLimitHeaders } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  try {
    const { fixtureId } = await request.json();
    if (!fixtureId) {
      return NextResponse.json({ error: 'fixtureId required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Rate limiting (IP-based)
    const ip = getClientIp(request);
    const { allowed, ...rateLimitInfo } = await checkRateLimit(null, ip, '/api/reveal');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: buildRateLimitHeaders(rateLimitInfo) }
      );
    }

    // Return analysis directly — no credit check needed
    const { data: analysis } = await supabase
      .rpc('get_analysis_for_fixture', { p_fixture_id: fixtureId });

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not available' }, { status: 404 });
    }

    const { data: fixture } = await supabase
      .from('fixtures')
      .select('*')
      .eq('id', fixtureId)
      .single();

    return NextResponse.json({ analysis, fixture });
  } catch (error) {
    console.error('Reveal error:', error);
    return NextResponse.json({ error: 'Failed to reveal analysis' }, { status: 500 });
  }
}
