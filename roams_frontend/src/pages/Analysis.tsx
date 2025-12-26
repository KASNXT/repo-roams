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
import { fetchStations, fetchNodes, type Node, type Station } from "@/services/api";
import axios from "axios";

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

  // --- Tag Units ---
  const { tagUnits } = useTagUnits();
  const getParameterUnit = (param: string) => {
    const key = normalizeKey(param);
    return tagUnits[key] || "";
  };

  // Helper: fetch history from backend using axios (includes auth token)
  const fetchHistory = async (station: string, from: Date, to: Date) => {
    try {
      const fromStr = from.toISOString();
      const toStr = to.toISOString();

      const api = axios.create({
        baseURL: "http://localhost:8000/api",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Attach token automatically
      api.interceptors.request.use((config) => {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers = config.headers ?? {};
          (config.headers as Record<string, string>).Authorization = `Token ${token}`;
        }
        return config;
      });

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
        if (data.length > 0 && !selectedWell) setSelectedWell(data[0].station_name);
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

    // Alarms (mock for now)
    const allAlarms = generateMockAlarms(selectedWell);
    const filteredAlarms = allAlarms.filter((alarm) => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const alarmDate = new Date(alarm.dateTime);
      return alarmDate >= dateRange.from! && alarmDate <= dateRange.to!;
    });

    csvContent += "\n\nALARMS DATA\n";
    csvContent += "Date/Time,Type,Description,Status,Severity,Acknowledged By\n";
    filteredAlarms.forEach((alarm) => {
      const description = alarm.description.replace(/,/g, ";");
      csvContent += `${alarm.dateTime},${alarm.type},${description},${alarm.status},${alarm.severity},${alarm.acknowledgedBy || "N/A"}\n`;
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

  const generateMockAlarms = (wellId: string) => {
    const alarmTypes = ["High Pressure", "Low Flow", "Temperature Alert", "Power Fluctuation", "Communication Error", "Maintenance Due"];
    const severities = ["Critical", "High", "Medium", "Low"];
    const statuses = ["Active", "Acknowledged", "Resolved"];

    return Array.from({ length: 25 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      const type = alarmTypes[Math.floor(Math.random() * alarmTypes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      return {
        id: `alarm-${i + 1}`,
        dateTime: date.toLocaleString(),
        type,
        description: `${type} detected on ${wellId.replace("-", " ")} - requires attention`,
        status,
        severity,
        acknowledgedBy: status !== "Active" ? `Operator ${Math.floor(Math.random() * 5) + 1}` : undefined,
      };
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-gradient-surface px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 flex-1">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Borehole Performance Analysis</h1>
                <p className="text-xs text-muted-foreground">Telemetry Data & System Insights</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Station Selector */}
              <Select value={selectedWell} onValueChange={setSelectedWell} disabled={loadingStations || stations.length === 0}>
                <SelectTrigger className="w-48">
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

              <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
                Auto Refresh
              </Button>

              <Button variant="outline" size="sm" onClick={handleExport} disabled={loadingStations || loadingNodes}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              <ThemeToggle />
              <UserDisplay />
            </div>
          </header>

          {/* Search + Filter Bar */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search telemetry or alarms..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64" />
            </div>

            <Select value={alarmFilter} onValueChange={setAlarmFilter}>
              <SelectTrigger className="w-40">
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

          {/* Main Content */}
          <div className="flex-1 p-6 space-y-6">
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
