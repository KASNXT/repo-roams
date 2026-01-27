import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApi } from '@/hooks/useApi';
import { AlertCircle, CheckCircle, Clock, XCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

export interface PendingRequest {
  id: number;
  control_state: number;
  control_state_name: string;
  requested_by: number | null;
  requested_by_username: string | null;
  requested_value: boolean;
  reason: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  status_display: string;
  confirmation_token: string;
  expires_at: string;
  confirmed_by: number | null;
  confirmed_by_username: string | null;
  confirmed_at: string | null;
  ip_address: string | null;
  created_at: string;
}

interface PendingRequestsProps {
  showPendingOnly?: boolean;
  refreshInterval?: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  expired: 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  confirmed: <CheckCircle className="w-4 h-4 text-blue-600" />,
  cancelled: <XCircle className="w-4 h-4 text-gray-600" />,
  expired: <AlertCircle className="w-4 h-4 text-red-600" />,
};

export function PendingRequests({
  showPendingOnly = true,
  refreshInterval = 5000,
}: PendingRequestsProps) {
  const { api } = useApi();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, refreshInterval);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const query = showPendingOnly ? '?status=pending' : '';
      const response = await api.get(`/control-state-requests/${query}`);
      const data = Array.isArray(response.data) ? response.data : ((response.data as any)?.results || []);
      setRequests(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
      setError('Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRequest = async (request: PendingRequest) => {
    setSelectedRequest(request);
    setShowConfirmDialog(true);
  };

  const confirmRequest = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      await api.post('/control-states/confirm_change/', {
        confirmation_token: selectedRequest.confirmation_token,
      });
      toast.success(`Control change confirmed for ${selectedRequest.control_state_name}`);
      setShowConfirmDialog(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to confirm request';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const secondsRemaining = Math.floor((expiry.getTime() - now.getTime()) / 1000);

    if (secondsRemaining < 0) return 'Expired';
    if (secondsRemaining < 60) return `${secondsRemaining}s`;
    const minutesRemaining = Math.floor(secondsRemaining / 60);
    return `${minutesRemaining}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading requests...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Control Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
              </CardTitle>
              <CardDescription>
                {showPendingOnly
                  ? 'Requests awaiting your confirmation'
                  : 'All control requests (pending, confirmed, cancelled)'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRequests}>
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {showPendingOnly ? 'No pending requests' : 'No requests'}
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`border rounded-lg p-4 space-y-3 transition ${
                    request.status === 'pending'
                      ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span>{statusIcons[request.status]}</span>
                      <Badge
                        variant="outline"
                        className={`${statusColors[request.status]} border`}
                      >
                        {request.status_display}
                      </Badge>
                      <span className="text-sm font-semibold">{request.control_state_name}</span>
                    </div>
                    {request.status === 'pending' && (
                      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                        {formatTimeRemaining(request.expires_at)} left
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Requested Change */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Change:</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          request.requested_value
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {request.requested_value ? 'ON' : 'OFF'}
                      </span>
                    </div>

                    {/* Requested By */}
                    {request.requested_by_username && (
                      <div className="text-sm">
                        <span className="text-gray-600">Requested by:</span>
                        <code className="ml-2 bg-white px-2 py-1 rounded text-xs border">
                          {request.requested_by_username}
                        </code>
                      </div>
                    )}

                    {/* Reason */}
                    {request.reason && (
                      <div className="text-sm bg-white rounded p-2 border border-gray-200">
                        <p className="text-xs text-gray-600 font-semibold mb-1">Reason:</p>
                        <p className="text-gray-700 text-sm">{request.reason}</p>
                      </div>
                    )}

                    {/* Confirmation Details */}
                    {request.confirmed_by_username && (
                      <div className="text-sm">
                        <span className="text-gray-600">Confirmed by:</span>
                        <code className="ml-2 bg-white px-2 py-1 rounded text-xs border">
                          {request.confirmed_by_username}
                        </code>
                        {request.confirmed_at && (
                          <span className="text-gray-500 text-xs ml-2">
                            at {new Date(request.confirmed_at).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* IP Address */}
                    {request.ip_address && (
                      <div className="text-xs text-gray-500">
                        Source IP:{' '}
                        <code className="bg-white px-1 rounded border">{request.ip_address}</code>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-xs text-gray-500">
                      Requested: {new Date(request.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Action Button */}
                  {request.status === 'pending' && (
                    <Button
                      onClick={() => handleConfirmRequest(request)}
                      className="w-full"
                      variant="default"
                      size="sm"
                    >
                      Confirm & Execute
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Control Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to confirm this control change? This action will be immediately
              executed on the control system.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedRequest && (
            <div className="space-y-3 my-4 p-4 bg-gray-50 rounded-lg border">
              <div>
                <p className="text-sm font-semibold text-gray-600">Control:</p>
                <p className="text-lg font-bold">{selectedRequest.control_state_name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Change:</p>
                <p className="text-base">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      selectedRequest.requested_value
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedRequest.requested_value ? 'Turn ON' : 'Turn OFF'}
                  </span>
                </p>
              </div>
              {selectedRequest.reason && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Reason:</p>
                  <p className="text-sm text-gray-700 italic">{selectedRequest.reason}</p>
                </div>
              )}
              {selectedRequest.requested_by_username && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Requested by:</p>
                  <p className="text-sm">{selectedRequest.requested_by_username}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRequest}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Processing...' : 'Confirm & Execute'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
