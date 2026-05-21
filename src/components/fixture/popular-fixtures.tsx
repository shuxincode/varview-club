"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchTime } from "@/components/match-time";
import { Clock, TrendingUp } from "lucide-react";

interface PopularFixture {
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
}

const POPULAR_FIXTURES: PopularFixture[] = [
  {
    homeTeam: "Manchester City",
    awayTeam: "Arsenal",
    league: "Premier League",
    date: new Date(Date.now() + 3 * 86400000).toISOString(),
  },
  {
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    league: "La Liga",
    date: new Date(Date.now() + 5 * 86400000).toISOString(),
  },
  {
    homeTeam: "Bayern Munich",
    awayTeam: "Borussia Dortmund",
    league: "Bundesliga",
    date: new Date(Date.now() + 4 * 86400000).toISOString(),
  },
  {
    homeTeam: "AC Milan",
    awayTeam: "Inter Milan",
    league: "Serie A",
    date: new Date(Date.now() + 6 * 86400000).toISOString(),
  },
  {
    homeTeam: "Paris Saint-Germain",
    awayTeam: "Marseille",
    league: "Ligue 1",
    date: new Date(Date.now() + 2 * 86400000).toISOString(),
  },
  {
    homeTeam: "Liverpool",
    awayTeam: "Chelsea",
    league: "Premier League",
    date: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
];

export function PopularFixtures() {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-[#0052FF]" />
        <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)]">Popular Fixtures</h2>
        <Badge variant="premium" className="text-[10px]">
          TRENDING
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {POPULAR_FIXTURES.map((f, i) => (
          <Link
            key={i}
            href={`/insight?home=${encodeURIComponent(f.homeTeam)}&away=${encodeURIComponent(f.awayTeam)}&league=${encodeURIComponent(f.league)}&date=${encodeURIComponent(f.date)}`}
          >
            <Card className="group hover:border-gray-700 hover:bg-gray-900 transition-all cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="default" className="text-[10px]">
                    {f.league}
                  </Badge>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <MatchTime date={f.date} dateOnly />
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-500 font-semibold">
                      {f.homeTeam.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-[oklch(0.22_0.025_260)] truncate">
                      {f.homeTeam}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-8">
                    <span className="text-xs text-gray-600 uppercase font-semibold tracking-wider">
                      vs
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-500 font-semibold">
                      {f.awayTeam.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-[oklch(0.22_0.025_260)] truncate">
                      {f.awayTeam}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-800">
                  <span className="text-xs text-[#0052FF] group-hover:text-blue-400 transition-colors font-medium">
                    View Insight &rarr;
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
