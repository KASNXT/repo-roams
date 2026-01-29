// src/components/settings/AlarmRetentionTab.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { getServerUrl } from "@/services/api";

interface AlarmRetentionPolicy {
  id: number;
  alarm_log_retention_days: number;
  breach_retention_days: number;
  keep_unacknowledged: boolean;
  auto_cleanup_enabled: boolean;
  last_cleanup_at: string | null;
  created_at: string;
  updated_at: string;
}

export const AlarmRetentionTab = () => {
  const [policy, setPolicy] = useState<AlarmRetentionPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modified, setModified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = axios.create({
    baseURL: `${getServerUrl()}/api`,
    headers: { "Content-Type": "application/json" },
  });

  // Attach auth token
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Token ${token}`;
    }
    return config;
  });

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<AlarmRetentionPolicy>("/alarm-retention-policy/");
      setPolicy(res.data);
      setModified(false);
    } catch (err) {
      console.error("Error fetching policy:", err);
      setError("Failed to load alarm retention policy");
      toast.error("Failed to load policy settings");
    } finally {
      setLoading(false);
    }
  };

  const savePolicy = async () => {
    if (!policy) return;

    try {
      setSaving(true);
      setError(null);

      const res = await api.patch<AlarmRetentionPolicy>(`/alarm-retention-policy/1/`, policy);
      setPolicy(res.data);
      setModified(false);
      toast.success("Alarm retention policy updated successfully");
    } catch (err: any) {
      console.error("Error saving policy:", err);
      setError(err.response?.data?.detail || "Failed to save policy");
      toast.error("Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AlarmRetentionPolicy, value: any) => {
    setPolicy((prev) => (prev ? { ...prev, [field]: value } : null));
    setModified(true);
  };

  const triggerCleanup = async () => {
    try {
      setSaving(true);
      // Call management command endpoint (if available)
      await api.post("/alarms/cleanup/");
      toast.success("Cleanup triggered successfully");
      fetchPolicy();
    } catch (err) {
      console.error("Error triggering cleanup:", err);
      toast.error("Failed to trigger cleanup");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading policy settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!policy) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex gap-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error || "Failed to load alarm retention policy"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Alarm Retention Policy</CardTitle>
          <CardDescription>
            Configure how long alarm logs and threshold breaches are stored. Old records can be automatically deleted.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Retention Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alarm Log Retention */}
          <div className="space-y-2">
            <Label htmlFor="alarm-retention" className="text-base font-semibold">
              Alarm Log Retention Period
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              How many days to keep alarm logs before automatic deletion
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="alarm-retention"
                type="number"
                min="7"
                max="365"
                value={policy.alarm_log_retention_days}
                onChange={(e) =>
                  handleChange(
                    "alarm_log_retention_days",
                    Math.max(7, Math.min(365, parseInt(e.target.value) || 90))
                  )
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
              <span className="text-xs text-muted-foreground ml-4">
                (minimum: 7, maximum: 365)
              </span>
            </div>
          </div>

          {/* Breach Retention */}
          <div className="space-y-2">
            <Label htmlFor="breach-retention" className="text-base font-semibold">
              Threshold Breach Retention Period
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              How many days to keep threshold breach records before automatic deletion
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="breach-retention"
                type="number"
                min="7"
                max="365"
                value={policy.breach_retention_days}
                onChange={(e) =>
                  handleChange(
                    "breach_retention_days",
                    Math.max(7, Math.min(365, parseInt(e.target.value) || 90))
                  )
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
              <span className="text-xs text-muted-foreground ml-4">
                (minimum: 7, maximum: 365)
              </span>
            </div>
          </div>

          {/* Keep Unacknowledged */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <Label className="text-base font-semibold">
                Keep Unacknowledged Breaches
              </Label>
              <p className="text-sm text-muted-foreground">
                Never delete threshold breaches that haven't been acknowledged
              </p>
            </div>
            <Switch
              checked={policy.keep_unacknowledged}
              onCheckedChange={(value) =>
                handleChange("keep_unacknowledged", value)
              }
            />
          </div>

          {/* Auto Cleanup */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Automatic Cleanup</Label>
              <p className="text-sm text-muted-foreground">
                Enable automatic deletion of old records (runs daily at midnight)
              </p>
            </div>
            <Switch
              checked={policy.auto_cleanup_enabled}
              onCheckedChange={(value) =>
                handleChange("auto_cleanup_enabled", value)
              }
            />
          </div>

          {/* Last Cleanup Info */}
          {policy.last_cleanup_at && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Last cleanup run: {new Date(policy.last_cleanup_at).toLocaleString()}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={savePolicy}
          disabled={!modified || saving}
          className="gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>

        <Button
          variant="outline"
          onClick={fetchPolicy}
          disabled={loading || saving}
        >
          Cancel
        </Button>

        <Button
          variant="destructive"
          onClick={triggerCleanup}
          disabled={saving}
          className="ml-auto gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Run Cleanup Now
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Info Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base">How Cleanup Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-2">
          <p>
            • Alarm logs older than the configured retention period will be deleted
          </p>
          <p>
            • Threshold breaches older than their retention period are eligible for
            deletion
          </p>
          <p>
            • If "Keep Unacknowledged" is enabled, acknowledged breaches are deleted
            but unacknowledged ones are preserved for investigation
          </p>
          <p>
            • Cleanup can run automatically on a schedule or be triggered manually at
            any time
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
