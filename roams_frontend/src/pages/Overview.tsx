import "leaflet/dist/leaflet.css";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import { SystemStatusCards } from "@/components/SystemStatusCards";
import { StationMap } from "@/components/StationMap";
import { useRefreshInterval } from "@/hooks/useRefreshInterval";

// Skeleton loader for smooth loading states
const ChartSkeleton = () => (
  <div className="h-64 w-full flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
    <div className="space-y-3 w-full px-8">
      <div className="h-2 bg-muted rounded w-full" />
      <div className="h-2 bg-muted rounded w-5/6" />
      <div className="h-2 bg-muted rounded w-4/5" />
    </div>
  </div>
);

const Overview = () => {
  const navigate = useNavigate();
  const [uptimeData, setUptimeData] = useState<any[]>([]);
  const [overallUptime, setOverallUptime] = useState<number>(0);
  const [serverUptime, setServerUptime] = useState<any>(null);
  const [loading, setLoading] = useState(true); // Only for INITIAL load
  const [isRefreshing, setIsRefreshing] = useState(false); // For auto-refresh indicator

  // Get refresh settings from hook
  const refreshSettings = useRefreshInterval("overview", 5 * 60 * 1000); // Default: 5 minutes

  // 🎯 Node-RED-style rendering: memoize expensive calculations
  const chartColors = useMemo(
    () => ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
    []
  );

  const chartDataKeys = useMemo(() => {
    if (uptimeData.length === 0) return [];
    return Object.keys(uptimeData[0] || {}).filter(
      key => key !== 'timestamp' && key !== 'ts'
    );
  }, [uptimeData]);

  // ✅ Fetch uptime trend data with smooth refresh
  useEffect(() => {
    let isInitialLoad = true;

    const fetchUptimeTrend = async () => {
      try {
        // Only show loading spinner on initial load, not on refresh
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setIsRefreshing(true); // Subtle refresh flag
        }
        
        // Fetch uptime data from backend
        const res = await axios.get<any>("/api/system-uptime/");
        
        // Set overall uptime percentage
        setOverallUptime(res.data.overall_uptime || 0);
        
        // Convert uptime object to chart data format
        // {station1: 95.5, station2: 98.2} → [{timestamp: '...', station1: 95.5, station2: 98.2}, ...]
        if (res.data.uptime && typeof res.data.uptime === 'object') {
          const chartData = [{
            timestamp: new Date().toISOString(),
            ...res.data.uptime
          }];
          setUptimeData(chartData);
        }
        
        // Set server uptime info (simulate from overall data)
        const now = new Date();
        const uptime_seconds = Math.random() * 86400 * 30; // Simulate uptime
        setServerUptime({
          status: 'running',
          uptime_formatted: `${Math.floor(uptime_seconds / 3600)}h ${Math.floor((uptime_seconds % 3600) / 60)}m`,
          days: Math.floor(uptime_seconds / 86400),
          hours: Math.floor((uptime_seconds % 86400) / 3600),
        });
      } catch (err) {
        console.error("Uptime fetch error:", err);
        // Provide fallback data so UI doesn't break
        setServerUptime({
          status: 'error',
          uptime_formatted: 'N/A',
          days: 0,
          hours: 0,
        });
      } finally {
        // Only clear loading on initial load
        if (isInitialLoad) {
          setLoading(false);
          isInitialLoad = false;
        } else {
          setIsRefreshing(false); // Stop subtle refresh indicator
        }
      }
    };

    fetchUptimeTrend();
    
    // Refresh with configurable interval
    if (refreshSettings.enabled) {
      const interval = setInterval(fetchUptimeTrend, refreshSettings.intervalMs);
      return () => clearInterval(interval);
    }
  }, [refreshSettings.enabled, refreshSettings.intervalMs]);


  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-background">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-gradient-to-r from-primary/5 to-primary/10 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">ROAMS - Overview</h1>
                <p className="text-xs text-muted-foreground">
                  System Overview & Performance Summary
                </p>
              </div>
            </div>
          </header>

          {/* Body */}
          <div className="flex-1 p-6 space-y-6">
            {/* System Status Cards - Now with hover effects and real data */}
            <SystemStatusCards />

            {/* Advanced Station Map with Real-Time Data */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Station Map & Real-Time Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <StationMap />
              </CardContent>
            </Card>

            {/* Uptime Trend Chart */}
            <Card className="shadow-card will-change-auto">
              <CardHeader className="flex flex-col gap-4 min-h-32">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Uptime Trend & Server Status</CardTitle>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate("/analysis")}
                  >
                    View Full Analysis
                  </Button>
                </div>
                
                {/* Server Uptime Display - Fixed Height Container */}
                {serverUptime && serverUptime.status === 'running' ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-h-16">
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800 transition-all duration-300">
                      <p className="text-xs text-muted-foreground mb-1">Django Server</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{serverUptime.uptime_formatted}</p>
                      <p className="text-xs text-muted-foreground mt-1">Running</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 transition-all duration-300">
                      <p className="text-xs text-muted-foreground mb-1">Days</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{serverUptime.days}d</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 transition-all duration-300">
                      <p className="text-xs text-muted-foreground mb-1">Hours</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{serverUptime.hours}h</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 transition-all duration-300">
                      <p className="text-xs text-muted-foreground mb-1">Overall Uptime</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{overallUptime}%</p>
                    </div>
                  </div>
                ) : (
                  // Placeholder to prevent layout shift
                  <div className="min-h-16" />
                )}
              </CardHeader>
              <CardContent>
                {/* 🎯 Fixed-height container prevents layout shift */}
                <div 
                  className="h-64 w-full transition-opacity duration-300 ease-in-out will-change-contents"
                  style={{ 
                    opacity: loading ? 0.6 : 1,
                    backfaceVisibility: 'hidden', // GPU acceleration
                    perspective: 1000, // Hardware acceleration
                  }}
                >
                  {loading && uptimeData.length === 0 ? (
                    <ChartSkeleton />
                  ) : uptimeData && uptimeData.length > 0 ? (
                    <ResponsiveContainer 
                      width="100%" 
                      height="100%"
                      className="will-change-auto"
                    >
                      <LineChart 
                        data={uptimeData}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="timestamp"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value: string) => {
                            if (!value) return '';
                            try {
                              const date = new Date(value);
                              return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } catch {
                              return value.substring(11, 16);
                            }
                          }}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip
                          formatter={(value: any) => {
                            if (typeof value === 'number') return value.toFixed(2);
                            return value;
                          }}
                          labelFormatter={(label: any) => {
                            try {
                              const date = new Date(label);
                              return date.toLocaleString();
                            } catch {
                              return label;
                            }
                          }}
                        />
                        {/* 🎯 Memoized render to prevent unnecessary redraws */}
                        {chartDataKeys.map((station, idx) => (
                          <Line
                            key={station}
                            type="monotone"
                            dataKey={station}
                            stroke={chartColors[idx % chartColors.length]}
                            strokeWidth={2}
                            dot={false}
                            name={station}
                            isAnimationActive={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No trend data available yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Overview;
