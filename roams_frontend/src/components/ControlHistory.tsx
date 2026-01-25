import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { AlertCircle, CheckCircle, Clock, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

export interface ControlHistoryEntry {
  id: number;
  control_state: number;
  control_state_name: string;
  change_type: 'requested' | 'confirmed' | 'executed' | 'failed' | 'synced' | 'timeout' | 'cancelled';
  change_type_display: string;
  requested_by: number | null;
  requested_by_username: string | null;
  confirmed_by: number | null;
  confirmed_by_username: string | null;
  previous_value: boolean;
  requested_value: boolean;
  final_value: boolean | null;
  reason: string;
  error_message: string;
  ip_address: string | null;
  timestamp: string;
}

interface ControlHistoryProps {
  controlId: number;
  limit?: number;
}

const changeTypeIcons: Record<string, React.ReactNode> = {
  requested: <Clock className="w-4 h-4" />,
  confirmed: <CheckCircle className="w-4 h-4 text-blue-600" />,
  executed: <CheckCircle className="w-4 h-4 text-green-600" />,
  failed: <XCircle className="w-4 h-4 text-red-600" />,
  synced: <Info className="w-4 h-4 text-purple-600" />,
  timeout: <AlertCircle className="w-4 h-4 text-yellow-600" />,
  cancelled: <XCircle className="w-4 h-4 text-gray-600" />,
};

const changeTypeColors: Record<string, string> = {
  requested: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-purple-100 text-purple-800 border-purple-200',
  executed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  synced: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  timeout: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function ControlHistory({ controlId, limit = 10 }: ControlHistoryProps) {
  const { api } = useApi();
  const [history, setHistory] = useState<ControlHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [controlId]);

  const fetchHistory = async () => {
    try {
      const response = await api.get(`/control-state-history/?control_state=${controlId}&limit=${limit}`);
      const respData = response.data as any;
      const data = Array.isArray(respData) ? respData : (respData?.results || []);
      setHistory(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch control history:', err);
      setError('Failed to load history');
      toast.error('Failed to load control history');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Change History</CardTitle>
            <CardDescription>Last {history.length} changes</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHistory}>
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No history available</div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{changeTypeIcons[entry.change_type]}</span>
                    <Badge
                      variant="outline"
                      className={`${changeTypeColors[entry.change_type]} border`}
                    >
                      {entry.change_type_display}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1">
                  {/* Value Change */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Value:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        entry.previous_value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {entry.previous_value ? 'ON' : 'OFF'}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        entry.requested_value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {entry.requested_value ? 'ON' : 'OFF'}
                    </span>
                    {entry.final_value !== null && (
                      <>
                        <span className="text-gray-400">(Final:</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            entry.final_value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {entry.final_value ? 'ON' : 'OFF'}
                        </span>
                        <span className="text-gray-400">)</span>
                      </>
                    )}
                  </div>

                  {/* User Information */}
                  <div className="flex items-center gap-2 text-sm">
                    {entry.requested_by_username && (
                      <>
                        <span className="text-gray-600">Requested by:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {entry.requested_by_username}
                        </code>
                      </>
                    )}
                    {entry.confirmed_by_username && (
                      <>
                        <span className="text-gray-600">Confirmed by:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {entry.confirmed_by_username}
                        </code>
                      </>
                    )}
                  </div>

                  {/* Reason */}
                  {entry.reason && (
                    <div className="text-sm">
                      <span className="text-gray-600">Reason:</span>
                      <p className="text-gray-700 mt-1 italic">{entry.reason}</p>
                    </div>
                  )}

                  {/* Error Message */}
                  {entry.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                      <p className="text-xs text-red-800">
                        <strong>Error:</strong> {entry.error_message}
                      </p>
                    </div>
                  )}

                  {/* IP Address */}
                  {entry.ip_address && (
                    <div className="text-xs text-gray-500">
                      IP: <code className="bg-gray-100 px-1 rounded">{entry.ip_address}</code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
