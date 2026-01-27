import { useState, useEffect, useRef } from 'react';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export interface ControlEvent {
  id: number;
  timestamp: string;
  previous_value: boolean;
  requested_value: boolean;
  final_value?: boolean;
  change_type: string;
  change_type_display: string;
  requested_by_username: string;
  confirmed_by_username?: string;
  reason?: string;
  error_message?: string;
  control_state_name: string;
}

export function BooleanControlHistory({
  tagName,
  limit = 30,
}: {
  tagName: string;
  limit?: number;
}) {
  const { api } = useApi();
  const [events, setEvents] = useState<ControlEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Skip fetch if tagName is empty or undefined
    if (!tagName || tagName.trim() === '') {
      setEvents([]);
      setLoading(false);
      return;
    }

    // Cancel previous request if still in flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Debounce the fetch by 500ms to prevent rapid successive requests
    const timeoutId = setTimeout(() => {
      const fetchHistory = async () => {
        try {
          setLoading(true);
          const response = await api.get<ControlEvent[] | { results: ControlEvent[] }>(
            `/control-state-history/`,
            {
              params: { 
                search: tagName,
                limit: Math.min(limit || 30, 10), // Cap at 10 to reduce response size
                ordering: '-timestamp'
              },
              signal: abortController.signal as any,
            }
          );
          const data = response.data;
          setEvents(
            Array.isArray(data)
              ? data
              : typeof data === 'object' && data !== null && 'results' in data
              ? data.results
              : []
          );
          setError(null);
        } catch (err: any) {
          // Ignore abort/cancel errors (both AbortError and axios CanceledError)
          if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
            return;
          }
          setError(err.message || 'Failed to load history');
          console.error('Error fetching history:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchHistory();
    }, 500);

    timeoutRef.current = timeoutId;

    // Cleanup function
    return () => {
      if (abortController) {
        abortController.abort();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [tagName, limit, api]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading history...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 text-red-700">Error: {error}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Control History: {tagName}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground">No control events recorded</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, idx) => (
              <div
                key={event.id || idx}
                className={`p-3 rounded-lg border-l-4 ${
                  event.requested_value
                    ? 'border-l-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        event.requested_value ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {event.previous_value ? '✓' : '✗'} → {event.requested_value ? '✓' : '✗'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    event.change_type === 'executed' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800'
                      : event.change_type === 'confirmed'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800'
                      : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800'
                  }`}>
                    {event.change_type_display}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>By: <span className="font-semibold">{event.requested_by_username}</span></p>
                  {event.confirmed_by_username && (
                    <p>Confirmed by: <span className="font-semibold">{event.confirmed_by_username}</span></p>
                  )}
                  {event.reason && <p>Reason: {event.reason}</p>}
                  {event.error_message && (
                    <p className="text-red-600">Error: {event.error_message}</p>
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
