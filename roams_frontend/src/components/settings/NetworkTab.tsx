import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusIndicator } from "@/components/StatusIndicator";
import { CheckCircle, AlertCircle, Copy } from "lucide-react";

interface NetworkConfig {
  serverUrl: string;
  environment: "development" | "staging" | "production";
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

const ENVIRONMENT_PRESETS = {
  development: {
    serverUrl: "http://localhost:8000",
    apiTimeout: 30000,
    requestRetries: 3,
    healthCheckInterval: 35,
    reconnectionMaxDelay: 60,
    logLevel: "debug" as const,
    features: {
      enableAdvancedMonitoring: true,
      enableAutoRefresh: true,
      enableOfflineMode: true,
    },
  },
  staging: {
    serverUrl: "https://api-staging.example.com",
    apiTimeout: 20000,
    requestRetries: 3,
    healthCheckInterval: 30,
    reconnectionMaxDelay: 60,
    logLevel: "info" as const,
    features: {
      enableAdvancedMonitoring: true,
      enableAutoRefresh: true,
      enableOfflineMode: false,
    },
  },
  production: {
    serverUrl: "https://api.example.com",
    apiTimeout: 15000,
    requestRetries: 2,
    healthCheckInterval: 40,
    reconnectionMaxDelay: 120,
    logLevel: "warn" as const,
    features: {
      enableAdvancedMonitoring: false,
      enableAutoRefresh: true,
      enableOfflineMode: false,
    },
  },
};

export function NetworkTab() {
  const [config, setConfig] = useState<NetworkConfig>({
    serverUrl: localStorage.getItem("roams_server_url") || "http://localhost:8000",
    environment: (localStorage.getItem("roams_environment") as any) || "development",
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

  const [serverError, setServerError] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiStatus, setApiStatus] = useState<"connected" | "disconnected" | "testing">("disconnected");

  const validateServerUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveServer = async () => {
    if (!config.serverUrl.trim()) {
      setServerError("Server URL cannot be empty");
      return;
    }

    if (!validateServerUrl(config.serverUrl)) {
      setServerError("Invalid URL format. Example: http://localhost:8000");
      return;
    }

    // Test connection to the server
    setApiStatus("testing");
    try {
      const response = await fetch(`${config.serverUrl}/api/health/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        setServerError(`Server returned status ${response.status}`);
        setApiStatus("disconnected");
        return;
      }

      // Save to localStorage
      localStorage.setItem("roams_server_url", config.serverUrl);
      setServerError("");
      setSaveSuccess(true);
      setApiStatus("connected");

      setTimeout(() => setSaveSuccess(false), 3000);
      console.log("Server URL updated. Page refresh may be required.");
    } catch (error) {
      setServerError("Unable to connect to server. Please check the URL and try again.");
      setApiStatus("disconnected");
      console.error(error);
    }
  };

  const handleLoadPreset = (env: "development" | "staging" | "production") => {
    const preset = ENVIRONMENT_PRESETS[env];
    setConfig(prev => ({
      ...preset,
      environment: env,
    }));
    setSaveSuccess(false);
  };

  const handleSaveAll = () => {
    // Save all configuration to localStorage
    localStorage.setItem("roams_server_url", config.serverUrl);
    localStorage.setItem("roams_environment", config.environment);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      {serverError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-400">{serverError}</p>
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

      {/* Environment Presets */}
      <Card className="shadow-card border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center">
            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
            Environment Presets
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Quick-load optimized settings for your deployment environment
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {["development", "staging", "production"].map((env) => (
              <Button
                key={env}
                size="sm"
                variant={config.environment === env ? "default" : "outline"}
                onClick={() => handleLoadPreset(env as any)}
                className={
                  config.environment === env
                    ? "bg-purple-600 hover:bg-purple-700"
                    : ""
                }
              >
                {env === "development" ? "🔧" : env === "staging" ? "🧪" : "🚀"}{" "}
                {env.charAt(0).toUpperCase() + env.slice(1)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Current: <span className="font-semibold">{config.environment.toUpperCase()}</span>
          </p>
        </CardContent>
      </Card>

      {/* Backend Server Configuration */}
      <Card className="shadow-card border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Backend Server Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Configure the address of the backend API server. Changes require a page refresh to take effect.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="server-url">Server URL</Label>
            <div className="flex gap-2">
              <Input
                id="server-url"
                value={config.serverUrl}
                onChange={(e) => {
                  setConfig(prev => ({ ...prev, serverUrl: e.target.value }));
                  setServerError("");
                }}
                placeholder="http://localhost:8000"
                className={serverError ? "border-red-500" : ""}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(config.serverUrl)}
                title="Copy URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Format: http://hostname:port or https://hostname:port
            </p>
          </div>

          {/* URL Examples by Environment */}
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">URL Examples:</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Local Dev:</span>
                <code className="bg-white dark:bg-slate-800 px-2 py-1 rounded font-mono">
                  http://localhost:8000
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team Dev:</span>
                <code className="bg-white dark:bg-slate-800 px-2 py-1 rounded font-mono">
                  http://192.168.1.50:8000
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AWS Cape Town:</span>
                <code className="bg-white dark:bg-slate-800 px-2 py-1 rounded font-mono">
                  http://54.xyz.abc:8000
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Domain:</span>
                <code className="bg-white dark:bg-slate-800 px-2 py-1 rounded font-mono">
                  https://api.example.com
                </code>
              </div>
            </div>
          </div>

          {saveSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Server URL saved successfully. Refresh page to apply changes.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveServer}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save & Test
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setConfig(prev => ({ ...prev, serverUrl: "http://localhost:8000" }));
                setServerError("");
              }}
            >
              Reset to Default
            </Button>
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
              <span className="text-muted-foreground">Environment:</span>
              <code className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded">
                {config.environment}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Server URL:</span>
              <code className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded">
                {config.serverUrl}
              </code>
            </div>
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