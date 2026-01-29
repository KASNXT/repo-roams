import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Server, MapPin, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

interface SystemStatusData {
  activeStations: number;
  systemUptime: number;
  systemAlarms: number;
  serverStatus: string;
  primaryStation?: string;
  lastUpdated: Date;
}

export const SystemStatusCards = () => {
  const [statusData, setStatusData] = useState<SystemStatusData>({
    activeStations: 0,
    systemUptime: 0,
    systemAlarms: 0,
    serverStatus: 'Checking...',
    primaryStation: '',
    lastUpdated: new Date(),
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all system status data
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        // Create axios instance with token
        const api = axios.create({
          baseURL: "http://localhost:8000/api",
          headers: {
            "Content-Type": "application/json",
          },
        });

        api.interceptors.request.use((config) => {
          const token = localStorage.getItem("token");
          if (token) {
            config.headers = config.headers ?? {};
            (config.headers as Record<string, string>).Authorization = `Token ${token}`;
          }
          return config;
        });

        // Fetch all required data
        const [uptimeRes, stationsRes, breachesRes, configsRes] = await Promise.allSettled([
          api.get("/system-uptime/"),
          api.get("/active-stations/"),
          api.get("/breaches/"),
          api.get("/opcua_clientconfig/"),
        ]);

        // Extract data from responses
        let activeStations = 0;
        let systemUptime = 0;
        let systemAlarms = 0;
        let serverStatus = 'Unknown';
        let primaryStation = '';

        // Process uptime data
        if (uptimeRes.status === 'fulfilled' && uptimeRes.value?.data) {
          systemUptime = (uptimeRes.value.data as any).overall_uptime || 0;
        }

        // Process active stations
        if (stationsRes.status === 'fulfilled' && stationsRes.value?.data) {
          activeStations = (stationsRes.value.data as any).total_connected_stations || 0;
          serverStatus = activeStations > 0 ? 'Online' : 'Offline';
          
          // Get primary station name from configs
          if (configsRes.status === 'fulfilled' && configsRes.value?.data) {
            const configsData = configsRes.value.data as any;
            const configs = Array.isArray(configsData)
              ? configsData
              : (configsData.results || []);
            if (configs.length > 0) {
              primaryStation = configs[0].station_name || 'Primary Station';
            }
          }
        }

        // Process alarms (count unacknowledged breaches)
        if (breachesRes.status === 'fulfilled' && breachesRes.value?.data) {
          const breachesData = breachesRes.value.data as any;
          const breaches = Array.isArray(breachesData) 
            ? breachesData 
            : (breachesData.results || []);
          systemAlarms = breaches.filter((b: any) => !b.acknowledged).length;
        }

        setStatusData({
          activeStations,
          systemUptime,
          systemAlarms,
          serverStatus,
          primaryStation,
          lastUpdated: new Date(),
        });

      } catch (err) {
        console.error('Error fetching system status:', err);
        setError('Failed to load system status');
        toast.error('Failed to fetch system status data');
      } finally {
        setLoading(false);
      }
    };

    fetchSystemStatus();

    // Set up polling every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Helper function to get status color and icon
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'text-green-600';
      case 'offline':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  // Helper function to get alarm severity color
  const getAlarmColor = (count: number) => {
    if (count === 0) return 'text-green-600';
    if (count <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2 grid-cols-1">
      {/* Card 1: Active Stations */}
      <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Active Stations
          </CardTitle>
          <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg hover:scale-110 transition-transform duration-200">
            <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-300" />
          </div>
        </CardHeader>
        <CardContent>
          {loading && !statusData.activeStations ? (
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          ) : (
            <>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {statusData.activeStations}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Connected to server
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card 2: System Uptime */}
      <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
            System Uptime
          </CardTitle>
          <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg hover:scale-110 transition-transform duration-200">
            <Activity className="h-4 w-4 text-green-600 dark:text-green-300" />
          </div>
        </CardHeader>
        <CardContent>
          {loading && !statusData.systemUptime ? (
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          ) : (
            <>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {statusData.systemUptime}%
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Last 30 days average
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card 3: System Alarms */}
      <Card className={`hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
            System Alarms
          </CardTitle>
          <div className={`p-2 bg-orange-200 dark:bg-orange-800 rounded-lg hover:scale-110 transition-transform duration-200`}>
            <AlertTriangle className={`h-4 w-4 ${getAlarmColor(statusData.systemAlarms)}`} />
          </div>
        </CardHeader>
        <CardContent>
          {loading && !statusData.systemAlarms ? (
            <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
          ) : (
            <>
              <div className={`text-2xl font-bold ${getAlarmColor(statusData.systemAlarms)}`}>
                {statusData.systemAlarms}
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Active unacknowledged
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card 4: Server Status & Primary Station */}
      <Card className={`hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
            BROMS Server
          </CardTitle>
          <div className={`p-2 bg-purple-200 dark:bg-purple-800 rounded-lg hover:scale-110 transition-transform duration-200`}>
            <Server className={`h-4 w-4 ${getStatusColor(statusData.serverStatus)}`} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          ) : (
            <>
              <div className={`text-2xl font-bold ${getStatusColor(statusData.serverStatus)}`}>
                {statusData.serverStatus}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {statusData.primaryStation ? (
                  <span className="truncate block">
                    📍 {statusData.primaryStation}
                  </span>
                ) : (
                  'Primary station'
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="col-span-full bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600 dark:text-red-400">
              ⚠️ {error}. Last updated: {statusData.lastUpdated.toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Last Updated Info */}
      <Card className="col-span-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardContent className="pt-6">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            ℹ️ Last updated: {statusData.lastUpdated.toLocaleTimeString()} | 
            Auto-refreshes every 30 seconds
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemStatusCards;
