import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RotateCw, X } from "lucide-react";
import { toast } from "sonner";

interface PageRefreshSetting {
  pageId: string;
  pageName: string;
  defaultIntervalMs: number;
  description: string;
}

const PAGE_REFRESH_SETTINGS: PageRefreshSetting[] = [
  {
    pageId: "dashboard",
    pageName: "Dashboard",
    defaultIntervalMs: 10000,
    description: "Main dashboard with summary and alarms"
  },
  {
    pageId: "overview",
    pageName: "Overview",
    defaultIntervalMs: 5 * 60 * 1000,
    description: "System overview and uptime trends"
  },
  {
    pageId: "analysis",
    pageName: "Analysis",
    defaultIntervalMs: 15000,
    description: "Alarm and threshold analysis"
  },
  {
    pageId: "control",
    pageName: "Control",
    defaultIntervalMs: 5000,
    description: "Equipment control status"
  },
  {
    pageId: "notifications",
    pageName: "Notifications",
    defaultIntervalMs: 30000,
    description: "Notification and breach events"
  },
];

function msToSeconds(ms: number): number {
  return Math.round(ms / 1000);
}

function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

export function RefreshSettingsTab() {
  const [settings, setSettings] = useState<Record<string, { intervalSec: number; enabled: boolean }>>({});
  const [loading, setLoading] = useState(true);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const loaded: Record<string, { intervalSec: number; enabled: boolean }> = {};
      PAGE_REFRESH_SETTINGS.forEach(({ pageId, defaultIntervalMs }) => {
        const storageKey = `refresh_interval_${pageId}`;
        const enabledKey = `${storageKey}_enabled`;
        
        const interval = localStorage.getItem(storageKey);
        const enabled = localStorage.getItem(enabledKey);
        
        loaded[pageId] = {
          intervalSec: interval ? msToSeconds(parseInt(interval, 10)) : msToSeconds(defaultIntervalMs),
          enabled: enabled ? JSON.parse(enabled) : true,
        };
      });
      setSettings(loaded);
    } catch (error) {
      console.error("Failed to load refresh settings:", error);
      toast.error("Failed to load refresh settings");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleIntervalChange = (pageId: string, seconds: number) => {
    // Validate: 5 seconds to 1 hour (3600 seconds)
    const validSec = Math.max(5, Math.min(3600, seconds || 5));
    setSettings(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        intervalSec: validSec,
      }
    }));
  };

  const handleToggleEnabled = (pageId: string) => {
    setSettings(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        enabled: !prev[pageId].enabled,
      }
    }));
  };

  const handleSave = async () => {
    try {
      PAGE_REFRESH_SETTINGS.forEach(({ pageId }) => {
        const storageKey = `refresh_interval_${pageId}`;
        const enabledKey = `${storageKey}_enabled`;
        const setting = settings[pageId];
        
        localStorage.setItem(storageKey, secondsToMs(setting.intervalSec).toString());
        localStorage.setItem(enabledKey, JSON.stringify(setting.enabled));
      });
      toast.success("✓ Refresh settings saved");
    } catch (error) {
      console.error("Failed to save refresh settings:", error);
      toast.error("Failed to save refresh settings");
    }
  };

  const handleResetAll = async () => {
    if (!confirm("Reset all refresh intervals to defaults?")) return;
    
    try {
      PAGE_REFRESH_SETTINGS.forEach(({ pageId }) => {
        const storageKey = `refresh_interval_${pageId}`;
        const enabledKey = `${storageKey}_enabled`;
        localStorage.removeItem(storageKey);
        localStorage.removeItem(enabledKey);
      });
      
      // Reload settings
      const loaded: Record<string, { intervalSec: number; enabled: boolean }> = {};
      PAGE_REFRESH_SETTINGS.forEach(({ pageId, defaultIntervalMs }) => {
        loaded[pageId] = {
          intervalSec: msToSeconds(defaultIntervalMs),
          enabled: true,
        };
      });
      setSettings(loaded);
      toast.success("✓ Refresh settings reset to defaults");
    } catch (error) {
      console.error("Failed to reset refresh settings:", error);
      toast.error("Failed to reset refresh settings");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading refresh settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <RotateCw className="h-5 w-5 text-primary" />
            Auto-Refresh Settings
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure how frequently each page refreshes its data
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetAll}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Reset All
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4">
        {PAGE_REFRESH_SETTINGS.map(({ pageId, pageName, defaultIntervalMs, description }) => {
          const setting = settings[pageId];
          if (!setting) return null;

          return (
            <Card key={pageId} className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{pageName}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={setting.enabled ? "default" : "secondary"}>
                      {setting.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Enable/Disable Toggle */}
                  <div className="space-y-2">
                    <Label htmlFor={`${pageId}-enabled`} className="text-sm">
                      Auto-Refresh
                    </Label>
                    <div className="flex items-center gap-2 p-2 rounded-lg border">
                      <Switch
                        id={`${pageId}-enabled`}
                        checked={setting.enabled}
                        onCheckedChange={() => handleToggleEnabled(pageId)}
                      />
                      <span className="text-sm">
                        {setting.enabled ? "On" : "Off"}
                      </span>
                    </div>
                  </div>

                  {/* Interval Input */}
                  <div className="space-y-2">
                    <Label htmlFor={`${pageId}-interval`} className="text-sm">
                      Refresh Interval (seconds)
                    </Label>
                    <Input
                      id={`${pageId}-interval`}
                      type="number"
                      min="5"
                      max="3600"
                      step="5"
                      value={setting.intervalSec}
                      onChange={(e) => handleIntervalChange(pageId, parseInt(e.target.value, 10))}
                      disabled={!setting.enabled}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Range: 5 - 3600 seconds
                    </p>
                  </div>

                  {/* Current Default */}
                  <div className="space-y-2">
                    <Label className="text-sm">Default</Label>
                    <div className="p-2 rounded-lg bg-muted/30 border">
                      <p className="text-sm font-medium">
                        {msToSeconds(defaultIntervalMs)}s
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {msToSeconds(defaultIntervalMs) >= 60 
                          ? `${(msToSeconds(defaultIntervalMs) / 60).toFixed(1)}m`
                          : `${msToSeconds(defaultIntervalMs)}s`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Setting Display */}
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Current: {setting.enabled 
                      ? `${setting.intervalSec}s (${setting.intervalSec >= 60 
                          ? `${(setting.intervalSec / 60).toFixed(1)}m` 
                          : `${setting.intervalSec}s`})`
                      : "Auto-refresh disabled"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleResetAll}
        >
          Reset All to Defaults
        </Button>
        <Button
          onClick={handleSave}
          className="bg-gradient-primary"
        >
          Save Refresh Settings
        </Button>
      </div>

      {/* Info Section */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base text-blue-900 dark:text-blue-100">
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
          <p>
            • Settings are saved in your browser and persist across sessions
          </p>
          <p>
            • Disabling auto-refresh shows data but won't update automatically
          </p>
          <p>
            • Shorter intervals = more frequent updates but higher server load
          </p>
          <p>
            • Minimum: 5 seconds, Maximum: 1 hour (3600 seconds)
          </p>
          <p>
            • Each page can have different refresh rates
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
