import { NextResponse } from 'next/server';
import { synthesizeOutlierReport } from '@/lib/chairman-protocol';

export async function POST(request: Request) {
  try {
    const { homeTeam, awayTeam, leagueName } = await request.json();

    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'homeTeam and awayTeam are required' },
        { status: 400 },
      );
    }

    const report = await synthesizeOutlierReport(
      homeTeam,
      awayTeam,
      leagueName || 'Unknown League',
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error('[chairman/outliers]', error);
    return NextResponse.json(
      { error: 'Failed to generate chairman outlier report' },
      { status: 500 },
    );
  }
}
