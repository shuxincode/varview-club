'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, User, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile, UserPrediction } from '@/types';

interface UserStats {
  profile: Profile;
  totalPredictions: number;
  correctPredictions: number;
  successRate: number;
}

export function UserLeaderboard() {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profiles) {
        setLoading(false);
        return;
      }

      const userStats: UserStats[] = [];

      for (const profile of profiles as Profile[]) {
        const { data: predictions } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', profile.id);

        const preds = (predictions || []) as UserPrediction[];
        const total = preds.length;
        const correct = preds.filter((p) => p.is_correct === true).length;

        userStats.push({
          profile,
          totalPredictions: total,
          correctPredictions: correct,
          successRate: total > 0 ? Math.round((correct / total) * 100) : 0,
        });
      }

      userStats.sort((a, b) => b.successRate - a.successRate || b.totalPredictions - a.totalPredictions);
      setUsers(userStats);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-[oklch(0.22_0.025_260)]">User vs AI Leaderboard</h2>
          </div>
          <Badge variant="info">{users.length} participants</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-800">
          {users.map((user, index) => (
            <div
              key={user.profile.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-900/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`text-lg font-bold ${
                    index === 0
                      ? 'text-yellow-500'
                      : index === 1
                      ? 'text-gray-400'
                      : index === 2
                      ? 'text-amber-600'
                      : 'text-gray-600'
                  }`}
                >
                  #{index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-[oklch(0.22_0.025_260)]">
                    {user.profile.email?.split('@')[0] || 'Anonymous'}
                  </span>
                  {user.profile.is_admin && (
                    <Badge variant="premium">ADMIN</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <span className="text-xs text-gray-500">Predictions</span>
                  <p className="text-sm font-semibold text-[oklch(0.22_0.025_260)]">{user.totalPredictions}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">Correct</span>
                  <p className="text-sm font-semibold text-green-400">{user.correctPredictions}</p>
                </div>
                <div className="w-24">
                  <div className="flex items-center gap-2">
                    <TrendingUp
                      className={`h-4 w-4 ${
                        user.successRate >= 50 ? 'text-green-500' : 'text-yellow-500'
                      }`}
                    />
                    <span
                      className={`text-lg font-bold ${
                        user.successRate >= 50 ? 'text-green-400' : 'text-yellow-400'
                      }`}
                    >
                      {user.successRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No predictions yet. Users will appear here once they start predicting.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
