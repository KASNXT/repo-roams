import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ControlStats {
  total_operations: number;
  total_runtime: number;
  average_runtime: number;
  last_operation: string;
  uptime_percentage: number;
}

export function BooleanControlStats({ tagName }: { tagName: string }) {
  const { api } = useApi();
  const [stats, setStats] = useState<ControlStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get<ControlStats>(`/tags/${tagName}/stats/`);
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [tagName, api]);

  if (loading || !stats)
    return <div className="text-muted-foreground">Loading stats...</div>;

  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.total_operations}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Runtime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-bold">{formatSeconds(stats.total_runtime)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg. Runtime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-bold">{formatSeconds(stats.average_runtime)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Uptime %
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-2xl font-bold ${
              stats.uptime_percentage > 95
                ? 'text-green-600'
                : stats.uptime_percentage > 80
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {stats.uptime_percentage.toFixed(1)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
