// src/components/analysis/TelemetryCharts.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ScatterChart,
  Scatter,
} from "recharts";
import { Zap } from "lucide-react";
import { parameterIcons, normalizeKey } from "@/utils/iconMap";
import { useTagUnits } from "@/hooks/useTagUnits";

// --- Interfaces ---
export interface Node {
  id: number | string;
  tag_name: string | null;
  add_new_tag_name: string;
  tag_units: string | null;
  station_name: string;
  last_value?: string | number | null;
  last_updated?: string | null;
}

export interface TelemetryPoint {
  timestamp: string;
  parameter: string;
  value: number | string | null;
  station?: string;
}

interface TelemetryChartsProps {
  wellId: string;
  dateRange?: { from?: Date; to?: Date };
  autoRefresh?: boolean;
  searchTerm?: string;
  nodes: Node[]; // realtime config + last_value
  historyData: TelemetryPoint[]; // historical telemetry logs from backend
}

interface ChartDataPoint {
  time: string;
  ts: number;
  value: number;
}

export const TelemetryCharts = ({
  wellId,
  dateRange,
  autoRefresh = false,
  searchTerm = "",
  nodes = [],
  historyData = [],
}: TelemetryChartsProps) => {
  const [chartType, setChartType] = useState<"line" | "area" | "bar" | "scatter">("line");
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const { tagUnits } = useTagUnits();
  const [brushRanges, setBrushRanges] = useState<Record<string, { start?: number; end?: number }>>({});
  const [showBrushs, setShowBrushs] = useState<Record<string, boolean>>({});
  // Make the brush look like a transparent glass tube with rounded knobs,
  // matching the area chart color (#2563eb) with transparency.
  useEffect(() => {
    const styleBrush = () => {
      const groups = document.querySelectorAll('.recharts-brush');
      groups.forEach((g) => {
        // Style the brush background rect
        const bgRects = (g as Element).querySelectorAll('rect[y="0"]');
        bgRects.forEach((r) => {
          const height = parseFloat(r.getAttribute('height') || '12');
          const rx = height / 2;
          r.setAttribute('rx', String(rx));
          r.setAttribute('ry', String(rx));
          r.setAttribute('fill', 'rgba(37, 99, 235, 0.15)');
          r.setAttribute('stroke', 'rgba(37, 99, 235, 0.4)');
          r.setAttribute('stroke-width', '1.5');
        });

        // Style the traveller knobs (circles or paths)
        const travellers = (g as Element).querySelectorAll('circle');
        travellers.forEach((c) => {
          c.setAttribute('fill', 'rgba(37, 99, 235, 0.8)');
          c.setAttribute('stroke', 'rgba(37, 99, 235, 1)');
          c.setAttribute('stroke-width', '2');
          c.setAttribute('r', '6');
        });

        // Also style any path elements that might be travellers
        const paths = (g as Element).querySelectorAll('path');
        paths.forEach((p) => {
          if (p.getAttribute('d')) {
            p.setAttribute('fill', 'rgba(37, 99, 235, 0.8)');
            p.setAttribute('stroke', 'rgba(37, 99, 235, 1)');
            p.setAttribute('stroke-width', '1.5');
          }
        });
      });
    };

    // Run once now and also on animation frame to catch HMR updates
    styleBrush();
    const id = requestAnimationFrame(styleBrush);
    return () => cancelAnimationFrame(id);
  }, [showBrushs]);

  // Derive realtime telemetry points from nodes' last_value (if any)
  const realtimePoints: TelemetryPoint[] = useMemo(() => {
    return nodes
      .filter((n) => n.last_value !== undefined && n.last_value !== null)
      .map((n) => ({
        timestamp: n.last_updated || new Date().toISOString(),
        parameter: (n.tag_name || n.add_new_tag_name || "").toString(),
        value: Number(n.last_value) || 0,
        station: n.station_name,
      }));
  }, [nodes]);

  // Merge historyData + realtimePoints => telemetry array
  // historyData will typically include timestamps and parameter names
  const mergedTelemetry: TelemetryPoint[] = useMemo(() => {
    // Convert incoming items to consistent shape and filter by station & dateRange if provided
    const normalize = (t: any): TelemetryPoint => ({
      timestamp: t.timestamp || t.time || new Date().toISOString(),
      parameter: (t.node_tag_name || t.parameter || t.tag_name || "").toString(),
      value: t.value ?? t.last_value ?? 0,
      station: t.station_name || t.station || undefined,
    });

    const all = [
      ...(Array.isArray(historyData) ? historyData.map(normalize) : []),
      ...realtimePoints.map(normalize),
    ];

    // Filter by station (only include items for this well)
    const byStation = all.filter((t) => {
      if (!t.station) return true; // keep if station unknown (fallback)
      return normalizeKey(t.station) === normalizeKey(wellId);
    });

    // Filter by dateRange if provided
    const byDate = byStation.filter((t) => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const ts = new Date(t.timestamp).getTime();
      return ts >= dateRange.from.getTime() && ts <= dateRange.to.getTime();
    });

    // Sort ascending timestamp
    byDate.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return byDate;
  }, [historyData, realtimePoints, wellId, dateRange]);

  // Build list of available parameters (from nodes); default selects all on initial load
  useEffect(() => {
    const params = nodes.map((n) => (n.tag_name || n.add_new_tag_name || "").toString()).filter(Boolean);
    // Set default selected parameters only if none selected yet
    setSelectedParameters((prev) => (prev.length ? prev : Array.from(new Set(params))));
    // Only run when nodes change or initially
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // Apply searchTerm to parameter list (client-side)
  const visibleParameters = useMemo(() => {
    const lower = searchTerm?.trim().toLowerCase() || "";
    if (!lower) return selectedParameters;
    return selectedParameters.filter((p) => p.toLowerCase().includes(lower));
  }, [selectedParameters, searchTerm]);

  // Toggle parameter selection
  const handleParameterToggle = (parameter: string) => {
    setSelectedParameters((prev) =>
      prev.includes(parameter) ? prev.filter((p) => p !== parameter) : [...prev, parameter]
    );
  };

  // For a given parameter, build chart data points
  const buildChartData = (paramName: string): ChartDataPoint[] => {
    const key = normalizeKey(paramName);
    const arr = mergedTelemetry
      .filter((t) => normalizeKey(t.parameter) === key)
      .map((t) => ({
        time: new Date(t.timestamp).toLocaleString(),
        ts: new Date(t.timestamp).getTime(),
        value: Number(t.value) || 0,
      }));
    // Keep sorted by timestamp - mergedTelemetry already sorted
    return arr;
  };

  // Rendering a single chart block for provided node/parameter
  const renderChart = (node: Node) => {
    const paramName = (node.tag_name || node.add_new_tag_name || "").toString();
    const key = normalizeKey(paramName);
    const Icon = parameterIcons[key] || parameterIcons.default;
    const unit = node.tag_units ?? tagUnits[key] ?? "";

    const data = buildChartData(paramName);

    // Apply brush range (if user has zoomed) to the displayed data
    const range = brushRanges[paramName];
    const displayedData =
      range && typeof range.start === "number" && typeof range.end === "number"
        ? data.slice(range.start, range.end + 1)
        : data;

    if (!data.length) {
      return (
        <div key={String(node.id)} className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg">
          No data available for <strong className="ml-1">{paramName || "Unnamed Tag"}</strong>
        </div>
      );
    }

    const ChartComponent = data.length === 1 ? ScatterChart : chartType === "line" ? LineChart : chartType === "area" ? AreaChart : BarChart;
    const DataComponent = data.length === 1 ? Scatter : chartType === "line" ? Line : chartType === "area" ? Area : Bar;

    const isBrushVisible = !!showBrushs[paramName];

    return (
      <div key={String(node.id)} className={`h-64 ${isBrushVisible ? "mb-8" : "mb-2"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{paramName || "Unnamed Tag"}</h3>
            <Badge variant="outline">{unit}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-primary">{data[data.length - 1]?.value ?? "--"} {unit}</div>
            <Button size="xs" variant="outline" onClick={() => setShowBrushs((s) => ({ ...s, [paramName]: !s[paramName] }))}>
              {isBrushVisible ? "Hide" : "Timeline"}
            </Button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={displayedData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <DataComponent
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              fill="#2563eb"
              fillOpacity={0.2}
              name={paramName}
            />
            {data.length > 1 && isBrushVisible && (
              <Brush
                dataKey="ts"
                height={12}
                stroke="#2563eb"
                travellerWidth={12}
                onChange={(range: any) => {
                  if (!range) return;
                  const { startIndex, endIndex } = range as { startIndex: number; endIndex: number };
                  setBrushRanges((prev) => ({ ...prev, [paramName]: { start: startIndex, end: endIndex } }));
                }}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
        {data.length > 1 && isBrushVisible && (
          <div className="mt-2 flex gap-2">
            <Button
              size="xs"
              className="h-6 px-2 py-0 text-xs"
              onClick={() => setBrushRanges((prev) => {
                const copy = { ...prev };
                delete copy[paramName];
                return copy;
              })}
            >
              Reset
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Chart Type</label>
            <Select value={chartType} onValueChange={(v) => setChartType(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Parameters</label>
            <div className="flex space-x-2 flex-wrap">
              {nodes.map((n) => {
                const name = (n.tag_name || n.add_new_tag_name || "").toString();
                if (!name) return null;
                return (
                  <Button key={String(n.id)} variant={selectedParameters.includes(name) ? "default" : "outline"} size="sm" onClick={() => handleParameterToggle(name)}>
                    {name}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-status-connected-bg text-status-connected">
            <Zap className="h-3 w-3 mr-1" />
            {autoRefresh ? "Auto Refresh" : "Live Data"}
          </Badge>
          <span className="text-sm text-muted-foreground">Station: {wellId.replace("-", " ").toUpperCase()}</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {nodes
          .filter((node) => {
            const name = (node.tag_name || node.add_new_tag_name || "").toString();
            return visibleParameters.includes(name);
          })
          .map((node) => renderChart(node))}
      </div>

      {/* Empty states */}
      {!selectedParameters.length && (
        <div className="text-center py-12 text-muted-foreground">Select parameters above to view telemetry charts</div>
      )}

      {mergedTelemetry.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No telemetry data found for <b>{wellId}</b> in the selected time range.</div>
      )}
    </div>
  );
};

export default TelemetryCharts;
