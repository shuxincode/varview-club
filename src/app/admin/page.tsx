'use client';

import { useEffect, useState } from 'react';
import { UserLeaderboard } from '@/components/admin/user-leaderboard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, BarChart3, TrendingUp, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TabulationData {
  totalPicks: number;
  correctPicks: number;
  pendingPicks: number;
  successRate: number;
  date: string;
}

export default function AdminPage() {
  const [tabulation, setTabulation] = useState<TabulationData | null>(null);
  const [tabLoading, setTabLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch daily tabulation
  useEffect(() => {
    const fetchTabulation = async () => {
      try {
        const res = await fetch('/api/tabulation/daily');
        if (res.ok) {
          const data = await res.json();
          setTabulation(data);
        }
      } catch {
        // silently fail
      } finally {
        setTabLoading(false);
      }
    };
    fetchTabulation();
  }, []);

  const handlePublishToThreads = async () => {
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch('/api/threads/publish', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setPublishResult({ success: true, message: `Published successfully! Post ID: ${data.postId}` });
      } else {
        setPublishResult({ success: false, message: data.error || 'Failed to publish' });
      }
    } catch (err) {
      setPublishResult({ success: false, message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setPublishing(false);
    }
  };
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-[#0052FF]" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <Badge variant="premium">ADMIN</Badge>
          </div>
          <p className="text-sm text-gray-500">
            User vs AI prediction tracking and platform management
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: BarChart3, label: 'Total Predictions', value: '—' },
          { icon: TrendingUp, label: 'Avg Success Rate', value: '—' },
          { icon: TrendingUp, label: 'Active Users', value: '—' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-full bg-[#0052FF]/10 p-3">
                <stat.icon className="h-5 w-5 text-[#0052FF]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leaderboard */}
      <UserLeaderboard />

      {/* Platform Info */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#0052FF]" />
            <h2 className="text-lg font-semibold text-gray-900">Daily Tabulation</h2>
            <Badge variant="premium">CHAIRMAN</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            The Chairman signs off on Top 3 Picks daily. Success rate is calculated post-match
            after all Chairman-signed picks resolve.
          </p>

          {tabLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-center animate-pulse">
                  <div className="h-3 w-16 bg-gray-700 rounded mx-auto mb-2" />
                  <div className="h-6 w-12 bg-gray-700 rounded mx-auto" />
                </div>
              ))}
            </div>
          ) : tabulation && tabulation.totalPicks > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border border-gray-700 bg-gray-900/80 p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Total Picks</p>
                <p className="text-lg font-bold text-white">{tabulation.totalPicks}</p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-900/80 p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Correct</p>
                <p className="text-lg font-bold text-green-400">{tabulation.correctPicks}</p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-900/80 p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Success Rate</p>
                <p className="text-lg font-bold text-[#0052FF]">{tabulation.successRate}%</p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-900/80 p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Pending</p>
                <p className="text-lg font-bold text-yellow-400">{tabulation.pendingPicks}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-center mb-4">
              <p className="text-sm text-gray-300">No chairman-signed picks for today yet.</p>
            </div>
          )}

          {/* Publish to Threads */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-gray-900/30">
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-300">Push to Threads</p>
                <p className="text-xs text-gray-400">
                  {tabulation && tabulation.totalPicks > 0
                    ? `Publish ${tabulation.correctPicks}/${tabulation.totalPicks} picks (${tabulation.successRate}%)`
                    : 'Tabulate picks before publishing'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {publishResult && (
                <div className={`flex items-center gap-1 text-xs ${publishResult.success ? 'text-green-500' : 'text-red-400'}`}>
                  {publishResult.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  <span className="max-w-48 truncate">{publishResult.message}</span>
                </div>
              )}
              <Button
                onClick={handlePublishToThreads}
                disabled={publishing || !tabulation || tabulation.totalPicks === 0}
                size="sm"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Publish
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
