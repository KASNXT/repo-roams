// roams_frontend/src/pages/Index.tsx
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GaugeCard } from "@/components/GaugeCard";
import { ThemeToggle } from "@/components/analysis/ThemeToggle";
import { UserDisplay } from "@/components/UserDisplay";
import { normalizeKey } from "@/utils/lowercase";



import {
  Building,
  Wifi,
  Clock,
  AlertTriangle,
  TrendingUp,
  Zap,
} from "lucide-react";

import { fetchSummary, type Summary, fetchNodes, type Node } from "@/services/api";
import { parameterIcons } from "@/utils/iconMap";


const Index: React.FC = () => {
  // --- API-backed summary for the top cards ---
  const [summary, setSummary] = useState<Summary>();
  const [lastUpdated, setLastUpdated] = useState<string>("--");
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // --- Stations + Nodes ---
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ---- Fetch summary ----
  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      setLoadingSummary(true);
      setSummaryError(null);
      try {
        const s = await fetchSummary();
        if (!mounted) return;
        setSummary(s);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err: any) {
        console.error("Failed to fetch summary:", err);
        if (!mounted) return;
        setSummaryError(String(err?.message ?? err));
      } finally {
        if (mounted) setLoadingSummary(false);
      }
    };

    loadSummary();
    const interval = setInterval(loadSummary, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // ---- Fetch nodes & group by station ----
  useEffect(() => {
    const loadNodes = async () => {
      setLoading(true);
      try {
        const nodes: Node[] = await fetchNodes();
        const grouped: Record<string, any> = {};

        nodes.forEach((n) => {
          if (!grouped[n.station_name]) {
            grouped[n.station_name] = {
              id: n.station_name,
              name: n.station_name,
              parameters: {},
            };
          }
          const key = n.add_new_tag_name?.trim() || n.tag_name || `tag_${n.id}`;
          grouped[n.station_name].parameters[key] = {
            value: n.last_value ? parseFloat(n.last_value) : null,
            min: n.min_value ?? 0,
            max: n.max_value ?? 100,
            unit: n.tag_units,
          };
        });

        setStations(Object.values(grouped));
      } catch (err) {
        console.error("Failed to fetch nodes", err);
      } finally {
        setLoading(false);
      }
    };

    loadNodes();
    const interval = setInterval(loadNodes, 10000);
    return () => clearInterval(interval);
  }, []);

  // ---- Status helper ----
  const getGaugeStatus = (value: number, min: number, max: number) => {
    const percentage = ((value - min) / (max - min)) * 100;
    if (percentage > 85) return "critical";
    if (percentage > 70) return "warning";
    return "normal";
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Top Bar */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-gradient-surface px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">ROAMS</h1>
                <p className="text-xs text-muted-foreground">
                  Remote Operation & Monitoring System For Aquifer
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <ThemeToggle />
              <UserDisplay />
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="shadow-card hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building className="h-5 w-5 text-primary" />
                    Active Stations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {loadingSummary ? "…" : summary?.total_active_stations ?? "--"}
                  </div>
                  <p className="text-sm text-muted-foreground">Currently Monitoring</p>
                </CardContent>
              </Card>

              <Card className="shadow-card hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wifi className="h-5 w-5 text-status-connected animate-pulse" />
                    Online Stations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-status-connected">
                    {loadingSummary ? "…" : summary?.total_connected_stations ?? "--"}
                  </div>
                  <p className="text-sm text-muted-foreground">Connected & Operational</p>
                </CardContent>
              </Card>

              <Card className="shadow-card hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-5 w-5 text-muted-foreground animate-spin" />
                    Last Updated
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{lastUpdated}</div>
                  <p className="text-sm text-muted-foreground">Data Refresh</p>
                </CardContent>
              </Card>

              <Card className="shadow-card hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-status-warning" />
                    Alarms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-status-warning">3</div>
                  <p className="text-sm text-muted-foreground">Active Warnings</p>
                </CardContent>
              </Card>
            </div>

            {summaryError && (
              <div className="mb-4 text-sm text-warning">
                Failed to load summary: {summaryError}
              </div>
            )}

            {/* Dynamic Stations */}
            {loading && <p>Loading stations...</p>}
            {stations.map((station) => (
              <div key={station.id} className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-foreground">{station.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {Object.entries(station.parameters).map(([paramName, param]) => {
                    const p = param as {
                      value: number | null;
                      min: number;
                      max: number;
                      unit?: string;
                    };
                      // ✅ Normalize param name
                      const key = normalizeKey(paramName);
                      const Icon = parameterIcons[key] || parameterIcons.default; Zap
                      return (
                      <GaugeCard
                        key={paramName}
                        title={paramName}
                        value={p.value ?? 0}
                        unit={p.unit ?? ""}
                        min={p.min ?? 0}
                        max={p.max ?? 100}
                        icon={Icon}
                        status={getGaugeStatus(p.value ?? 0, p.min ?? 0, p.max ?? 100)}
                        stationName={station.name}
                      />
                    );
                  })}

                </div>
              </div>
            ))}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
