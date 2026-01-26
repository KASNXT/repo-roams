// src/pages/Analysis.tsx
import { useEffect, useState, useCallback } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TelemetryCharts } from "@/components/analysis/TelemetryCharts";
import { AlarmsTable } from "@/components/analysis/AlarmsTable";
import { DatePickerWithRange } from "@/components/analysis/DatePickerWithRange";
import { ThemeToggle } from "@/components/analysis/ThemeToggle";
import { UserDisplay } from "@/components/UserDisplay";
import { TrendingUp, RefreshCw, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { useTagUnits } from "@/hooks/useTagUnits";
import { normalizeKey } from "@/utils/lowercase";
import { fetchStations, fetchNodes, fetchBreaches, type Node, type Station, type ThresholdBreach } from "@/services/api";
import api from "@/services/api";

const Analysis = () => {
  // --- States ---
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [alarmFilter, setAlarmFilter] = useState("all");

  // --- Station handling ---
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedWell, setSelectedWell] = useState<string>("");
  const [loadingStations, setLoadingStations] = useState<boolean>(true);

  // --- Nodes handling (realtime / config) ---
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loadingNodes, setLoadingNodes] = useState<boolean>(false);

  // --- History Data (telemetry logs for selected range) ---
  const [historyData, setHistoryData] = useState<any[]>([]);

  // --- Alarms Data (real threshold breaches from backend) ---
  const [alarms, setAlarms] = useState<ThresholdBreach[]>([]);

  // --- Tag Units ---
  const { tagUnits } = useTagUnits();
  const getParameterUnit = (param: string) => {
    const key = normalizeKey(param);
    return tagUnits[key] || "";
  };

  // Helper: fetch history from backend using centralized api client (includes auth token)
  const fetchHistory = async (station: string, from: Date, to: Date) => {
    try {
      const fromStr = from.toISOString();
      const toStr = to.toISOString();

      const res = await api.get("/telemetry/", {
        params: {
          station,
          from: fromStr,
          to: toStr,
        },
      });
      return res.data || [];
    } catch (error) {
      console.error("Error fetching history:", error);
      return [];
    }
  };

  // --- Load stations once on mount ---
  useEffect(() => {
    const loadStations = async () => {
      try {
        const data = await fetchStations();
        setStations(data);
        
        // Try to restore selectedWell from localStorage
        const savedWell = localStorage.getItem("selectedWell");
        if (savedWell && data.some(s => s.station_name === savedWell)) {
          setSelectedWell(savedWell);
        } else if (data.length > 0 && !selectedWell) {
          // If no saved preference, select first station
          setSelectedWell(data[0].station_name);
        }
      } catch (error) {
        console.error("Failed to fetch stations:", error);
        toast.error("Unable to load stations from backend");
      } finally {
        setLoadingStations(false);
      }
    };
    loadStations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // --- Persist selectedWell to localStorage whenever it changes ---
  useEffect(() => {
    if (selectedWell) {
      localStorage.setItem("selectedWell", selectedWell);
    }
  }, [selectedWell]);

  // --- Load nodes whenever selectedWell changes (or when auto refresh triggers below) ---
  const loadNodes = useCallback(async () => {
    if (!selectedWell) return;
    setLoadingNodes(true);
    try {
      const data = await fetchNodes();
      const stationNodes = Array.isArray(data)
        ? data.filter((n) => n.station_name === selectedWell)
        : [];
      setNodes(stationNodes);
    } catch (error) {
      console.error("Failed to fetch nodes:", error);
      toast.error("Unable to load nodes from backend");
    } finally {
      setLoadingNodes(false);
    }
  }, [selectedWell]);

  useEffect(() => {
    if (!selectedWell) return;
    loadNodes();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadNodes();
        // Keep toast quiet in real auto-refresh to avoid spamming — use silent UI in prod
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [selectedWell, autoRefresh, loadNodes]);

  // --- Load history whenever station or dateRange changes ---
  useEffect(() => {
    if (!selectedWell || !dateRange?.from || !dateRange?.to) {
      setHistoryData([]); // clear if selection incomplete
      return;
    }

    let canceled = false;
    const loadHistory = async () => {
      const logs = await fetchHistory(selectedWell, dateRange.from!, dateRange.to!);
      if (!canceled) setHistoryData(Array.isArray(logs) ? logs : []);
    };

    loadHistory();

    if (autoRefresh) {
      const interval = setInterval(loadHistory, 15000);
      return () => {
        canceled = true;
        clearInterval(interval);
      };
    }

    return () => {
      canceled = true;
    };
  }, [selectedWell, dateRange, autoRefresh]);

  // --- Load alarms whenever station or dateRange changes ---
  useEffect(() => {
    if (!selectedWell || !dateRange?.from || !dateRange?.to) {
      setAlarms([]);
      return;
    }

    let canceled = false;
    const loadAlarms = async () => {
      const breaches = await fetchAlarms(dateRange.from, dateRange.to);
      if (!canceled) setAlarms(Array.isArray(breaches) ? breaches : []);
    };

    loadAlarms();

    if (autoRefresh) {
      const interval = setInterval(loadAlarms, 15000);
      return () => {
        canceled = true;
        clearInterval(interval);
      };
    }

    return () => {
      canceled = true;
    };
  }, [selectedWell, dateRange, autoRefresh]);

  useEffect(() => {
  console.log("📊 History data count:", historyData.length);
  console.log("📊 Sample:", historyData.slice(0, 5));
  }, [historyData]);



  // --- Export telemetry and alarms data to CSV ---
  const handleExport = () => {
    if (!selectedWell) {
      toast.error("Please select a station before exporting.");
      return;
    }

    const dateString =
      dateRange?.from && dateRange?.to
        ? `${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`
        : "all dates";

    // Combine historical logs and realtime nodes for exporting:
    // - prefer historyData for detailed timestamps
    // - fallback to nodes' last_value if history not present
    const telemetryRows: { station: string; parameter: string; date: string; time: string; value: number; unit: string }[] = [];

    // Add history rows (if any)
    if (Array.isArray(historyData) && historyData.length > 0) {
      historyData.forEach((h) => {
        // Expect history entry shape: { timestamp, node_tag_name or parameter, value, station_name }
        const ts = h.timestamp ? new Date(h.timestamp) : null;
        const date = ts ? ts.toLocaleDateString() : "--";
        const time = ts ? ts.toLocaleTimeString() : "--";
        const parameter = h.node_tag_name || h.parameter || h.tag_name || "Unnamed";
        const unit = getParameterUnit(parameter);
        telemetryRows.push({
          station: h.station_name || selectedWell,
          parameter,
          date,
          time,
          value: Number(h.value) || 0,
          unit,
        });
      });
    } else {
      // Fallback to nodes list (last_value)
      nodes.forEach((node) => {
        const ts = node.last_updated ? new Date(node.last_updated) : null;
        const date = ts ? ts.toLocaleDateString() : "--";
        const time = ts ? ts.toLocaleTimeString() : "--";
        const parameter = node.tag_name || node.add_new_tag_name || "Unnamed";
        const unit = node.tag_units || getParameterUnit(parameter);
        telemetryRows.push({
          station: node.station_name,
          parameter,
          date,
          time,
          value: Number(node.last_value) || 0,
          unit,
        });
      });
    }

    if (telemetryRows.length === 0) {
      toast.warning("No telemetry data found for the selected date range.");
      return;
    }

    // --- Build CSV content ---
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "BORE HOLES DATA\n";
    csvContent += "Station,Parameter,Date,Time,Value,Unit\n";
    telemetryRows.forEach((row) => {
      const safeParam = String(row.parameter).replace(/,/g, ";");
      const safeUnit = String(row.unit).replace(/,/g, ";");
      csvContent += `${row.station},${safeParam},${row.date},${row.time},${row.value},${safeUnit}\n`;
    });

    csvContent += "\n\nALARMS DATA\n";
    csvContent += "Date/Time,Node,Breach Type,Breach Value,Status\n";
    alarms.forEach((alarm) => {
      const nodeName = String(alarm.node_name || "Unknown").replace(/,/g, ";");
      csvContent += `${alarm.timestamp},${nodeName},${alarm.breach_type || "N/A"},${alarm.breach_value || "N/A"},${alarm.acknowledged ? "Acknowledged" : "Pending"}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const filename = `ROAMS_REPORT_${selectedWell}_${dateRange?.from?.toISOString().split("T")[0] || "all"}_to_${dateRange?.to?.toISOString().split("T")[0] || "all"}.csv`;
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported data for ${selectedWell} (${dateString})`);
  };

  // Helper: fetch alarms (threshold breaches) from backend
  const fetchAlarms = async (from?: Date, to?: Date) => {
    try {
      console.log("📡 Fetching alarms from backend...");
      
      const allBreaches = await fetchBreaches();
      console.log(`✅ Fetched ${allBreaches.length} total breaches`);

      // Filter by date range if provided
      let filtered = allBreaches;
      if (from && to) {
        filtered = allBreaches.filter((breach) => {
          const breachDate = new Date(breach.timestamp);
          return breachDate >= from && breachDate <= to;
        });
        console.log(`📊 Filtered to ${filtered.length} breaches in date range`);
      }

      setAlarms(filtered);
      return filtered;
    } catch (error) {
      console.error("❌ Error fetching alarms:", error);
      toast.error("Failed to load alarms from backend");
      setAlarms([]);
      return [];
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col max-h-screen overflow-y-auto">
          {/* Header - Sticky on ALL screens */}
          <header className="sticky top-0 z-50 flex flex-col md:flex-row h-auto md:h-16 shrink-0 gap-2 border-b bg-gradient-surface/95 backdrop-blur supports-[backdrop-filter]:bg-gradient-surface/80 px-4 py-2 md:py-0 shadow-sm">
            <div className="flex items-center gap-2 flex-1">
              <SidebarTrigger className="-ml-1" />
              <TrendingUp className="h-6 w-6 text-primary" />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-foreground truncate">Borehole Analysis</h1>
                <p className="text-xs text-muted-foreground hidden md:block">Telemetry Data & System Insights</p>
              </div>
              <div className="flex md:hidden items-center gap-2">
                <ThemeToggle />
                <UserDisplay />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* Station Selector */}
              <Select value={selectedWell} onValueChange={setSelectedWell} disabled={loadingStations || stations.length === 0}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder={loadingStations ? "Loading..." : "Select Station"} />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.station_name}>
                      {station.station_name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />

              <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="flex-1 md:flex-initial">
                <RefreshCw className={`h-4 w-4 md:mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
                <span className="hidden md:inline">Auto Refresh</span>
              </Button>

              <Button variant="outline" size="sm" onClick={handleExport} disabled={loadingStations || loadingNodes} className="flex-1 md:flex-initial">
                <Download className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Export</span>
              </Button>

              <div className="hidden md:flex items-center gap-3">
                <ThemeToggle />
                <UserDisplay />
              </div>
            </div>
          </header>

          {/* Search + Filter Bar - Also Sticky on ALL screens */}
          <div className="sticky top-[3.5rem] md:top-16 z-40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 p-4 border-b bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 shadow-sm">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search telemetry or alarms..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 md:w-64" />
            </div>

            <Select value={alarmFilter} onValueChange={setAlarmFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter Alarms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 p-2 md:p-6 space-y-4 md:space-y-6">
            {!selectedWell ? (
              <div className="text-center text-muted-foreground p-8">No station selected or available.</div>
            ) : (
              <>
                {/* Pass both real-time and historical data to TelemetryCharts */}
                <TelemetryCharts
                  wellId={selectedWell}
                  dateRange={dateRange}
                  autoRefresh={autoRefresh}
                  searchTerm={searchTerm}
                  nodes={nodes}           // realtime node defs + last_value
                  historyData={historyData} // historical telemetry logs
                />
                <AlarmsTable wellId={selectedWell} searchTerm={searchTerm} filterType={alarmFilter} dateRange={dateRange} />
              </>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Analysis;
