import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusIndicator } from "@/components/StatusIndicator";
import { CheckCircle } from "lucide-react";

interface NetworkConfig {
  apiTimeout: number;
  requestRetries: number;
  healthCheckInterval: number;
  reconnectionMaxDelay: number;
  logLevel: "debug" | "info" | "warn" | "error";
  features: {
    enableAdvancedMonitoring: boolean;
    enableAutoRefresh: boolean;
    enableOfflineMode: boolean;
  };
}

export function NetworkTab() {
  const [config, setConfig] = useState<NetworkConfig>({
    apiTimeout: Number(localStorage.getItem("roams_api_timeout")) || 30000,
    requestRetries: Number(localStorage.getItem("roams_request_retries")) || 3,
    healthCheckInterval: Number(localStorage.getItem("roams_health_check")) || 35,
    reconnectionMaxDelay: Number(localStorage.getItem("roams_reconnect_delay")) || 60,
    logLevel: (localStorage.getItem("roams_log_level") as any) || "info",
    features: {
      enableAdvancedMonitoring: localStorage.getItem("roams_adv_monitoring") === "true",
      enableAutoRefresh: localStorage.getItem("roams_auto_refresh") !== "false",
      enableOfflineMode: localStorage.getItem("roams_offline_mode") === "true",
    },
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [apiStatus, setApiStatus] = useState<"connected" | "disconnected" | "testing">("disconnected");

  const handleSaveAll = () => {
    // Save all configuration to localStorage
    localStorage.setItem("roams_api_timeout", config.apiTimeout.toString());
    localStorage.setItem("roams_request_retries", config.requestRetries.toString());
    localStorage.setItem("roams_health_check", config.healthCheckInterval.toString());
    localStorage.setItem("roams_reconnect_delay", config.reconnectionMaxDelay.toString());
    localStorage.setItem("roams_log_level", config.logLevel);
    localStorage.setItem("roams_adv_monitoring", config.features.enableAdvancedMonitoring.toString());
    localStorage.setItem("roams_auto_refresh", config.features.enableAutoRefresh.toString());
    localStorage.setItem("roams_offline_mode", config.features.enableOfflineMode.toString());

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      {saveSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-md flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-700 dark:text-green-400">
            ✓ Configuration saved. Refresh page to apply changes.
          </p>
        </div>
      )}

      {/* Connection Status - Horizontal Table Layout */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Interface</th>
                  <th className="text-center py-2 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/5">
                  <td className="py-3 px-2 font-medium text-sm">Ethernet</td>
                  <td className="py-3 px-2 flex justify-center">
                    <StatusIndicator status="connected" label="" className="" />
                  </td>
                  <td className="py-3 px-2 text-sm text-muted-foreground hidden sm:table-cell">Primary Interface</td>
                </tr>
                <tr className="border-b hover:bg-muted/5">
                  <td className="py-3 px-2 font-medium text-sm">Internet</td>
                  <td className="py-3 px-2 flex justify-center">
                    <StatusIndicator status="connected" label="" className="" />
                  </td>
                  <td className="py-3 px-2 text-sm text-muted-foreground hidden sm:table-cell">External Access</td>
                </tr>
                <tr className="border-b hover:bg-muted/5">
                  <td className="py-3 px-2 font-medium text-sm">API Server</td>
                  <td className="py-3 px-2 flex justify-center">
                    <StatusIndicator 
                      status={apiStatus === "connected" ? "connected" : apiStatus === "testing" ? "warning" : "disconnected"} 
                      label="" 
                      className="" 
                    />
                  </td>
                  <td className="py-3 px-2 text-sm text-muted-foreground hidden sm:table-cell">Backend Connection</td>
                </tr>
                <tr className="hover:bg-muted/5">
                  <td className="py-3 px-2 font-medium text-sm">OPC UA</td>
                  <td className="py-3 px-2 flex justify-center">
                    <StatusIndicator status="connected" label="" className="" />
                  </td>
                  <td className="py-3 px-2 text-sm text-muted-foreground hidden sm:table-cell">Industrial Network</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">API Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="api-timeout">API Request Timeout: {config.apiTimeout}ms</Label>
            <input
              id="api-timeout"
              type="range"
              min="5000"
              max="60000"
              step="1000"
              value={config.apiTimeout}
              onChange={(e) =>
                setConfig(prev => ({ ...prev, apiTimeout: Number(e.target.value) }))
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How long to wait for API responses before timing out (5s - 60s)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="retries">Request Retries: {config.requestRetries}</Label>
            <input
              id="retries"
              type="range"
              min="1"
              max="5"
              value={config.requestRetries}
              onChange={(e) =>
                setConfig(prev => ({ ...prev, requestRetries: Number(e.target.value) }))
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Number of times to retry failed API requests
            </p>
          </div>
        </CardContent>
      </Card>

      {/* OPC UA Configuration */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">OPC UA Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="health-check">
              Health Check Interval: {config.healthCheckInterval}s
            </Label>
            <input
              id="health-check"
              type="range"
              min="10"
              max="120"
              step="5"
              value={config.healthCheckInterval}
              onChange={(e) =>
                setConfig(prev => ({ ...prev, healthCheckInterval: Number(e.target.value) }))
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How often to verify OPC UA connection is healthy (10s - 120s)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reconnect-delay">
              Max Reconnection Delay: {config.reconnectionMaxDelay}s
            </Label>
            <input
              id="reconnect-delay"
              type="range"
              min="30"
              max="300"
              step="30"
              value={config.reconnectionMaxDelay}
              onChange={(e) =>
                setConfig(prev => ({ ...prev, reconnectionMaxDelay: Number(e.target.value) }))
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Max wait time between reconnection attempts (uses exponential backoff)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logging Configuration */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Logging & Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="log-level">Logging Level</Label>
          <select
            id="log-level"
            value={config.logLevel}
            onChange={(e) =>
              setConfig(prev => ({ ...prev, logLevel: e.target.value as any }))
            }
            className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
          >
            <option value="debug">🔍 Debug (Verbose - Development)</option>
            <option value="info">ℹ️ Info (Normal - Staging)</option>
            <option value="warn">⚠️ Warn (Warnings Only)</option>
            <option value="error">❌ Error (Errors Only - Production)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Controls console and browser log verbosity level
          </p>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Feature Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
            <div>
              <Label className="font-medium">Advanced Monitoring</Label>
              <p className="text-xs text-muted-foreground">
                Enable detailed monitoring and diagnostics
              </p>
            </div>
            <Switch
              checked={config.features.enableAdvancedMonitoring}
              onCheckedChange={(checked) =>
                setConfig(prev => ({
                  ...prev,
                  features: { ...prev.features, enableAdvancedMonitoring: checked },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
            <div>
              <Label className="font-medium">Auto-Refresh</Label>
              <p className="text-xs text-muted-foreground">
                Automatically refresh data at intervals
              </p>
            </div>
            <Switch
              checked={config.features.enableAutoRefresh}
              onCheckedChange={(checked) =>
                setConfig(prev => ({
                  ...prev,
                  features: { ...prev.features, enableAutoRefresh: checked },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
            <div>
              <Label className="font-medium">Offline Mode</Label>
              <p className="text-xs text-muted-foreground">
                Allow using app without backend connection
              </p>
            </div>
            <Switch
              checked={config.features.enableOfflineMode}
              onCheckedChange={(checked) =>
                setConfig(prev => ({
                  ...prev,
                  features: { ...prev.features, enableOfflineMode: checked },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card className="shadow-card bg-slate-50 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base font-medium">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Timeout:</span>
              <code className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded">
                {config.apiTimeout}ms
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Health Check:</span>
              <code className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded">
                {config.healthCheckInterval}s
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Log Level:</span>
              <code className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded">
                {config.logLevel}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save All Button */}
      <div className="flex gap-2">
        <Button
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-1"
          onClick={handleSaveAll}
        >
          💾 Save All Configuration
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
        >
          🔄 Reset All
        </Button>
      </div>
    </div>
  );
}