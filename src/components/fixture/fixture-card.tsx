'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MatchTime } from '@/components/match-time';
import { Clock, MapPin } from 'lucide-react';

interface FixtureCardProps {
  fixture: {
    id: number | string;
    home_team: string;
    away_team: string;
    league_name: string;
    scheduled_date: string;
    home_logo?: string;
    away_logo?: string;
    status: string;
    venue?: string | null;
    home_score?: string;
    away_score?: string;
  };
  index?: number;
}

export function FixtureCard({ fixture, index = 0 }: FixtureCardProps) {
  const isLive = fixture.status === 'in_play';
  const isFinished = fixture.status === 'finished';
  const isScheduled = fixture.status === 'scheduled';

  const statusColors: Record<string, 'warning' | 'success' | 'info' | 'danger' | 'default'> = {
    scheduled: 'default',
    in_play: 'warning',
    finished: 'success',
    postponed: 'danger',
    cancelled: 'danger',
  };

  const statusLabel = isLive
    ? 'LIVE'
    : isFinished
      ? 'FT'
      : fixture.status.replace('_', ' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.025 }}
    >
      <Link
        href={
          typeof fixture.id === 'string' && (fixture.id.startsWith('today_') || fixture.id.startsWith('fs_'))
            ? `/insight?home=${encodeURIComponent(fixture.home_team)}&away=${encodeURIComponent(fixture.away_team)}&league=${encodeURIComponent(fixture.league_name)}`
            : `/insight?fixtureId=${fixture.id}`
        }
      >
        <Card
          variant="premium"
          className={`
            transition-all duration-200 cursor-pointer
            ${isLive
              ? 'border-[oklch(0.62_0.18_160/0.4)] bg-[oklch(0.62_0.18_160/0.05)]'
              : isFinished
                ? 'border-[oklch(0.85_0.012_75/0.6)]'
                : ''
            }
          `}
        >
          <div className="p-3">
            {/* Top row: league + status */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Badge variant="default" className="text-[10px] px-1.5 py-0.5 leading-normal font-medium">
                  {fixture.league_name}
                </Badge>
              </div>
              <Badge
                variant={statusColors[fixture.status] || 'default'}
                className={`
                  text-[10px] px-2 py-0.5 leading-normal font-semibold
                  ${isLive ? 'animate-pulse' : ''}
                `}
              >
                {isScheduled && <Clock className="h-2.5 w-2.5 mr-0.5 inline" />}
                {statusLabel}
              </Badge>
            </div>

            {/* Teams row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {fixture.home_logo && (
                  <img src={fixture.home_logo} alt="" className="h-5 w-5 object-contain shrink-0" />
                )}
                <span className="text-sm font-bold text-[oklch(0.22_0.025_260)] truncate">{fixture.home_team}</span>
              </div>

              {isFinished && fixture.home_score !== undefined ? (
                <span className="text-xs font-bold text-[oklch(0.22_0.025_260)] px-2.5 py-0.5 bg-[oklch(0.92_0.01_75)] rounded-lg shrink-0 tabular-nums">
                  {fixture.home_score}-{fixture.away_score}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-[oklch(0.55_0.018_70)] uppercase tracking-wider shrink-0 px-1">
                  vs
                </span>
              )}

              <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                <span className="text-sm font-bold text-[oklch(0.22_0.025_260)] truncate text-right">{fixture.away_team}</span>
                {fixture.away_logo && (
                  <img src={fixture.away_logo} alt="" className="h-5 w-5 object-contain shrink-0" />
                )}
              </div>
            </div>

            {/* Date/time row */}
            <div className="flex items-center gap-1.5 text-[10px] text-[oklch(0.55_0.018_70)] mt-2">
              <Clock className="h-2.5 w-2.5 text-[oklch(0.72_0.015_70)]" />
              <MatchTime date={fixture.scheduled_date} />
              {fixture.venue && (
                <>
                  <span className="text-[oklch(0.85_0.012_75)]">|</span>
                  <MapPin className="h-2.5 w-2.5 text-[oklch(0.72_0.015_70)]" />
                  <span className="truncate">{fixture.venue}</span>
                </>
              )}
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
