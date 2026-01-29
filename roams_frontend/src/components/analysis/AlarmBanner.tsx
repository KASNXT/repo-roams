// src/components/analysis/AlarmBanner.tsx
import { useEffect, useState } from "react";
import { AlertCircle, Bell, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { getServerUrl } from "@/services/api";

interface Alarm {
  id: number;
  node_tag_name: string;
  station_name: string;
  message: string;
  severity: "High" | "Normal";
  timestamp: string;
  acknowledged: boolean;
}

interface AlarmBannerProps {
  stationName?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const AlarmBanner = ({
  stationName,
  autoRefresh = true,
  refreshInterval = 30000,
}: AlarmBannerProps) => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlarms = async () => {
    try {
      setLoading(true);
      setError(null);

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

      const params: Record<string, any> = {
        ordering: "-timestamp",
        limit: 10,
      };

      if (stationName) {
        params.station_name = stationName;
      }

      // Fetch unacknowledged alarms
      const res = await api.get<{ results?: Alarm[] } | Alarm[]>("/alarms/", { params });
      const alarmsArray = Array.isArray(res.data) ? res.data : (res.data.results || []);
      const unacknowledgedAlarms = alarmsArray.filter(
        (alarm: Alarm) => !alarm.acknowledged
      );

      setAlarms(unacknowledgedAlarms.slice(0, 5)); // Show last 5
    } catch (err) {
      console.error("Error fetching alarms:", err);
      setError("Failed to load alarms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlarms();

    if (autoRefresh) {
      const interval = setInterval(fetchAlarms, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [stationName, autoRefresh, refreshInterval]);

  const criticalCount = alarms.filter((a) => a.severity === "High").length;
  const warningCount = alarms.filter((a) => a.severity === "Normal").length;

  if (!alarms.length && !loading) {
    return (
      <Card className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">No Active Alarms</h3>
            <p className="text-sm text-green-700">
              All systems operating normally
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-bold text-red-900">Active Alarms</h3>
              <p className="text-sm text-red-700">
                {alarms.length} unacknowledged alarm{alarms.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Critical: {criticalCount}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Warning: {warningCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Alarms List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {alarms.map((alarm) => (
            <div
              key={alarm.id}
              className={`p-4 rounded-lg border-l-4 ${
                alarm.severity === "High"
                  ? "bg-red-100 border-red-500 text-red-900"
                  : "bg-yellow-100 border-yellow-500 text-yellow-900"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold">
                    {alarm.node_tag_name}
                    {alarm.severity === "High" && (
                      <span className="ml-2 text-xs font-bold">🔴 CRITICAL</span>
                    )}
                  </div>
                  <p className="text-sm opacity-90">{alarm.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs opacity-75">
                    <Clock className="h-3 w-3" />
                    {new Date(alarm.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4 text-sm text-gray-600">
            Updating alarms...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-4 text-sm text-red-600">{error}</div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-orange-200 flex justify-between items-center text-xs text-gray-600">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <button
            onClick={fetchAlarms}
            className="text-orange-600 hover:text-orange-700 font-medium"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>
    </Card>
  );
};
