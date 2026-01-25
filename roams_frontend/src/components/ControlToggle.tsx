import React, { useState, useCallback, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, AlertTriangle, ShieldAlert, Power, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';

export interface ControlState {
  id: number;
  node: number;
  node_tag_name: string;
  node_id: number;
  tag_type: string;
  tag_type_display: string;
  current_value: boolean;
  plc_value: boolean;
  is_synced_with_plc: boolean;
  last_changed_at: string;
  last_changed_by: number | null;
  last_changed_by_username: string | null;
  requires_confirmation: boolean;
  confirmation_timeout: number;
  rate_limit_seconds: number;
  sync_error_message: string;
  description: string;
  danger_level: number;
  danger_display: string;
  can_user_change: boolean;
  is_rate_limited: boolean;
  time_until_allowed: number;
  created_at: string;
  updated_at: string;
}

interface ControlToggleProps {
  control: ControlState;
  onStateChange?: (newState: boolean) => void;
}

interface ConfirmationRequest {
  request_id: number;
  confirmation_token: string;
  expires_in_seconds: number;
}

export function ControlToggle({ control, onStateChange }: ControlToggleProps) {
  const { api } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingRequest, setPendingRequest] = useState<ConfirmationRequest | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [localValue, setLocalValue] = useState(control.current_value);
  const [pendingAction, setPendingAction] = useState<boolean | null>(null);

  // Track local value changes
  useEffect(() => {
    setLocalValue(control.current_value);
  }, [control.current_value]);

  // Start countdown timer for confirmation expiry
  React.useEffect(() => {
    if (!pendingRequest) return;

    const startTime = Date.now();
    const expiryTime = startTime + pendingRequest.expires_in_seconds * 1000;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000));
      setCountdown(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        setPendingRequest(null);
        setShowConfirmationDialog(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [pendingRequest]);

  const handleStartClick = useCallback(() => {
    if (localValue) {
      toast.info('Already running');
      return;
    }
    handleToggleClick(true);
  }, [localValue]);

  const handleStopClick = useCallback(() => {
    if (!localValue) {
      toast.info('Already stopped');
      return;
    }
    handleToggleClick(false);
  }, [localValue]);

  const handleToggleClick = useCallback((newValue: boolean) => {
    if (!control.can_user_change) {
      toast.error('You do not have permission to control this device');
      return;
    }

    if (control.is_rate_limited) {
      toast.error(
        `Rate limited. Please wait ${control.time_until_allowed.toFixed(1)}s before next change.`
      );
      return;
    }

    if (control.requires_confirmation) {
      setPendingAction(newValue);
      setShowReasonDialog(true);
    } else {
      requestStateChange(newValue, '');
    }
  }, [control]);

  const requestStateChange = useCallback(
    async (newValue: boolean, changeReason: string) => {
      setIsLoading(true);
      setLocalValue(newValue);
      try {
        const response = await api.post(`/control-states/${control.id}/request_change/`, {
          requested_value: newValue,
          reason: changeReason,
        });

        const respData = response.data as any;
        if (respData.request_id) {
          // Requires confirmation
          setPendingRequest({
            request_id: respData.request_id,
            confirmation_token: respData.confirmation_token,
            expires_in_seconds: respData.expires_in_seconds,
          });
          setShowConfirmationDialog(true);
          setReason('');
          setShowReasonDialog(false);
          toast.info(
            `Confirmation required. Pending admin approval. (Expires in ${respData.expires_in_seconds}s)`
          );
        } else {
          // Immediate execution
          toast.success(`${newValue ? 'Started' : 'Stopped'} successfully!`);
          onStateChange?.(newValue);
          setShowReasonDialog(false);
        }
      } catch (error: any) {
        const message = error.response?.data?.detail || 'Failed to request control change';
        toast.error(message);
        setLocalValue(!newValue); // Revert on error
      } finally {
        setIsLoading(false);
        setPendingAction(null);
      }
    },
    [api, control.id, onStateChange]
  );

  const getDangerColor = (dangerLevel: number): string => {
    switch (dangerLevel) {
      case 0:
        return 'bg-green-100 text-green-800 border-green-200';
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 2:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDangerIcon = (dangerLevel: number): React.ReactNode => {
    switch (dangerLevel) {
      case 0:
        return <CheckCircle className="w-4 h-4" />;
      case 1:
        return <AlertTriangle className="w-4 h-4" />;
      case 2:
        return <AlertCircle className="w-4 h-4" />;
      case 3:
        return <ShieldAlert className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className={`w-full max-w-md transition-all ${
      localValue
        ? 'border-green-300 bg-green-50/50 dark:bg-green-950/30'
        : 'border-slate-300'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {localValue && <div className="animate-pulse w-2 h-2 rounded-full bg-green-500" />}
              {control.node_tag_name}
            </CardTitle>
            <CardDescription>{control.description || control.tag_type_display}</CardDescription>
          </div>
          <Badge variant="outline" className={getDangerColor(control.danger_level)}>
            <span className="mr-1">{getDangerIcon(control.danger_level)}</span>
            {control.danger_display}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sync Status */}
        {!control.is_synced_with_plc && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold">Out of Sync with PLC</p>
              {control.sync_error_message && <p className="text-xs mt-1">{control.sync_error_message}</p>}
            </div>
          </div>
        )}

        {/* Current State Display - Enhanced */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-gray-600">Current State</Label>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-16 h-16 rounded-lg flex items-center justify-center font-bold text-white text-sm transition-all shadow-md ${
                  localValue 
                    ? 'bg-gradient-to-br from-green-500 to-green-600' 
                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }`}
              >
                <Power className="w-6 h-6 mr-1" />
                {localValue ? 'ON' : 'OFF'}
              </div>
              <div className="text-sm">
                <p className="font-semibold text-lg">
                  {localValue ? '✓ RUNNING' : '✗ STOPPED'}
                </p>
                {control.last_changed_by_username && (
                  <p className="text-xs text-gray-600">
                    by {control.last_changed_by_username}
                  </p>
                )}
              </div>
            </div>
            {control.is_synced_with_plc && (
              <CheckCircle className="w-6 h-6 text-green-600 animate-pulse" />
            )}
          </div>
        </div>

        {/* Rate Limit Warning */}
        {control.is_rate_limited && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p>Rate limited for {control.time_until_allowed.toFixed(1)}s</p>
            </div>
          </div>
        )}

        {/* Control Buttons - START/STOP Pair (Improved) */}
        {control.can_user_change ? (
          <div className="space-y-3">
            {/* Start/Stop Button Pair */}
            <div className="flex gap-2">
              {/* START Button */}
              {!control.requires_confirmation ? (
                <Button
                  onClick={handleStartClick}
                  disabled={
                    isLoading || 
                    control.is_rate_limited || 
                    !control.is_synced_with_plc || 
                    localValue ||
                    pendingAction !== null
                  }
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {isLoading && pendingAction === true ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              ) : (
                <AlertDialog open={showReasonDialog && pendingAction === true} onOpenChange={(open) => {
                  if (!open) setPendingAction(null);
                  setShowReasonDialog(open);
                }}>
                  <AlertDialogTrigger asChild>
                    <Button
                      onClick={() => setPendingAction(true)}
                      disabled={
                        isLoading || 
                        control.is_rate_limited || 
                        !control.is_synced_with_plc || 
                        localValue
                      }
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      <Power className="w-4 h-4 mr-2" />
                      Start
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Start - {control.node_tag_name}</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are requesting to START <strong>{control.node_tag_name}</strong>.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 my-4">
                      <div>
                        <Label htmlFor="reason" className="text-sm font-semibold">
                          Reason for Change <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="reason"
                          placeholder="Please provide a reason (required for audit trail)"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="mt-2"
                          rows={3}
                        />
                      </div>

                      {control.danger_level >= 2 && (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-sm text-red-800 font-semibold">
                            ⚠️ This is a high-risk control. An administrator must confirm this change.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={!reason.trim() || isLoading}
                        onClick={() => requestStateChange(true, reason)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isLoading ? 'Submitting...' : 'Submit for Approval'}
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* STOP Button */}
              {!control.requires_confirmation ? (
                <Button
                  onClick={handleStopClick}
                  disabled={
                    isLoading || 
                    control.is_rate_limited || 
                    !control.is_synced_with_plc || 
                    !localValue ||
                    pendingAction !== null
                  }
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                  variant="destructive"
                >
                  {isLoading && pendingAction === false ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4 mr-2" />
                      Stop
                    </>
                  )}
                </Button>
              ) : (
                <AlertDialog open={showReasonDialog && pendingAction === false} onOpenChange={(open) => {
                  if (!open) setPendingAction(null);
                  setShowReasonDialog(open);
                }}>
                  <AlertDialogTrigger asChild>
                    <Button
                      onClick={() => setPendingAction(false)}
                      disabled={
                        isLoading || 
                        control.is_rate_limited || 
                        !control.is_synced_with_plc || 
                        !localValue
                      }
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      size="lg"
                      variant="destructive"
                    >
                      <Power className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Stop - {control.node_tag_name}</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are requesting to STOP <strong>{control.node_tag_name}</strong>.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 my-4">
                      <div>
                        <Label htmlFor="reason" className="text-sm font-semibold">
                          Reason for Change <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="reason"
                          placeholder="Please provide a reason (required for audit trail)"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="mt-2"
                          rows={3}
                        />
                      </div>

                      {control.danger_level >= 2 && (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-sm text-red-800 font-semibold">
                            ⚠️ This is a high-risk control. An administrator must confirm this change.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={!reason.trim() || isLoading}
                        onClick={() => requestStateChange(false, reason)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isLoading ? 'Submitting...' : 'Submit for Approval'}
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ) : (
          <Button disabled className="w-full">
            No Permission
          </Button>
        )}

        {/* Pending Confirmation Status */}
        {pendingRequest && (
          <AlertDialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Awaiting Confirmation
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Your change request for <strong>{control.node_tag_name}</strong> is pending admin approval.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4 my-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Request Status</span>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      Pending
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1 text-gray-700">
                    <p>Request ID: {pendingRequest.request_id}</p>
                    <p>
                      Time Remaining:{' '}
                      <span className="font-semibold text-orange-600">
                        {countdown || pendingRequest.expires_in_seconds}s
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-semibold mb-2">What happens next?</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>✓ An administrator will review your request</li>
                    <li>✓ They will confirm the control change</li>
                    <li>✓ The control will be updated when confirmed</li>
                    <li>✗ Request will expire if not confirmed in {pendingRequest.expires_in_seconds}s</li>
                  </ul>
                </div>
              </div>

              <AlertDialogAction onClick={() => setShowConfirmationDialog(false)}>
                Close
              </AlertDialogAction>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Info Footer */}
        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
          <p>Type: {control.tag_type_display}</p>
          {control.last_changed_at && (
            <p>
              Last changed: {new Date(control.last_changed_at).toLocaleDateString()} at{' '}
              {new Date(control.last_changed_at).toLocaleTimeString()}
            </p>
          )}
          {control.requires_confirmation && (
            <p>Confirmation timeout: {control.confirmation_timeout}s</p>
          )}
          {control.rate_limit_seconds > 0 && (
            <p>Rate limit: {control.rate_limit_seconds}s between changes</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
