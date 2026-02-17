// src/pages/Analysis.tsx
import { useEffect, useState, useCallback } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TelemetryCharts } from "@/components/analysis/TelemetryCharts";
import { AlarmsTable } from "@/components/analysis/AlarmsTable";
import { DatePickerWithRange } from "@/components/analysis/DatePickerWithRange";
import { ThemeToggle } from "@/components/analysis/ThemeToggle";
import { RatedVsActualComparison } from "@/components/analysis/RatedVsActualComparison";
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
  // Default to 30 days of data to show all available historical records
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [alarmFilter, setAlarmFilter] = useState("all");
  const [dataLimit, setDataLimit] = useState(1000); // Default to 1000 to avoid memory issues

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
          page_size: dataLimit, // Use selected data limit
        },
        timeout: 30000, // 30 second timeout for large datasets
      });
      
      // ✅ FIX: Handle paginated response structure {count, next, previous, results}
      const data = (res.data as any)?.results || res.data || [];
      console.log("📊 Fetched telemetry:", data.length, "records for", station);
      return data;
    } catch (error: any) {
      console.error("Error fetching history:", error);
      
      // Show user-friendly error messages
      if (error.response?.status === 500) {
        toast.error("Server overloaded. Try reducing data points or date range.");
      } else if (error.code === 'ECONNABORTED') {
        toast.error("Request timeout. Try reducing data points.");
      } else if (error.response?.status === 503) {
        toast.error("Database connection limit reached. Please retry in a moment.");
      } else {
        toast.error("Failed to load telemetry data. Please try again.");
      }
      
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
      if (!canceled) {
        setHistoryData(Array.isArray(logs) ? logs : []);
        // Show feedback when data is loaded
        if (Array.isArray(logs) && logs.length > 0) {
          toast.success(`Loaded ${logs.length.toLocaleString()} data points`);
        }
      }
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
  }, [selectedWell, dateRange, autoRefresh, dataLimit]); // Add dataLimit as dependency

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

  // Extract latest telemetry values for current readings (comparison component)
  const getCurrentReadings = () => {
    const latest: any = {
      current_in_amps: undefined,
      flow_m3_h: undefined,
      pressure_bar: undefined,
      head_m: undefined,
      power_kw: undefined,
    };

    // First try to get from most recent history data
    if (Array.isArray(historyData) && historyData.length > 0) {
      const recent = historyData[historyData.length - 1];
      const normalizedRecent = Object.keys(recent).reduce((acc, key) => {
        acc[normalizeKey(key)] = recent[key];
        return acc;
      }, {} as any);

      // Extract common telemetry parameter names
      latest.current_in_amps = normalizedRecent.current || normalizedRecent.current_in_amps || normalizedRecent.current_a;
      latest.flow_m3_h = normalizedRecent.flow || normalizedRecent.flow_m3_h || normalizedRecent.flowrate;
      latest.pressure_bar = normalizedRecent.pressure || normalizedRecent.pressure_bar;
      latest.head_m = normalizedRecent.head || normalizedRecent.head_m;
      latest.power_kw = normalizedRecent.power || normalizedRecent.power_kw;
    }

    // Fallback: extract from nodes' last_value if available
    if (!latest.current_in_amps && Array.isArray(nodes)) {
      const currentNode = nodes.find(n => normalizeKey(n.tag_name).includes('current'));
      if (currentNode?.last_value) latest.current_in_amps = parseFloat(currentNode.last_value);
    }
    if (!latest.flow_m3_h && Array.isArray(nodes)) {
      const flowNode = nodes.find(n => normalizeKey(n.tag_name).includes('flow'));
      if (flowNode?.last_value) latest.flow_m3_h = parseFloat(flowNode.last_value);
    }
    if (!latest.pressure_bar && Array.isArray(nodes)) {
      const pressureNode = nodes.find(n => normalizeKey(n.tag_name).includes('pressure'));
      if (pressureNode?.last_value) latest.pressure_bar = parseFloat(pressureNode.last_value);
    }
    if (!latest.head_m && Array.isArray(nodes)) {
      const headNode = nodes.find(n => normalizeKey(n.tag_name).includes('head'));
      if (headNode?.last_value) latest.head_m = parseFloat(headNode.last_value);
    }
    if (!latest.power_kw && Array.isArray(nodes)) {
      const powerNode = nodes.find(n => normalizeKey(n.tag_name).includes('power'));
      if (powerNode?.last_value) latest.power_kw = parseFloat(powerNode.last_value);
    }

    return latest;
  };

  // Get station ID from selected station
  const getSelectedStationId = () => {
    const station = stations.find(s => s.station_name === selectedWell);
    return station?.id;
  };



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
    const filename = `BROMS_REPORT_${selectedWell}_${dateRange?.from?.toISOString().split("T")[0] || "all"}_to_${dateRange?.to?.toISOString().split("T")[0] || "all"}.csv`;
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

              {/* Data Limit Selector */}
              <Select value={String(dataLimit)} onValueChange={(val) => setDataLimit(Number(val))}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="500">500 pts</SelectItem>
                  <SelectItem value="1000">1K pts</SelectItem>
                  <SelectItem value="2000">2K pts</SelectItem>
                  <SelectItem value="3000">3K pts</SelectItem>
                </SelectContent>
              </Select>

              <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="flex-1 md:flex-initial">
                <RefreshCw className={`h-4 w-4 md:mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
                <span className="hidden md:inline">Auto Refresh</span>
              </Button>

              <Button variant="outline" size="sm" onClick={handleExport} disabled={loadingStations || loadingNodes} className="flex-1 md:flex-initial">
                <Download className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Export</span>
              </Button>

              <ThemeToggle />
              <UserDisplay />
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
                {/* Device Specifications Comparison - Shows rated vs actual performance */}
                {getSelectedStationId() && (
                  <RatedVsActualComparison
                    stationId={getSelectedStationId()!}
                    currentCurrent={getCurrentReadings().current_in_amps}
                    currentFlowRate={getCurrentReadings().flow_m3_h}
                    currentPressureBar={getCurrentReadings().pressure_bar}
                    currentHead={getCurrentReadings().head_m}
                    currentPower={getCurrentReadings().power_kw}
                  />
                )}

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
