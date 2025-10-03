import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Droplets, Gauge, Battery, Zap } from "lucide-react";
import type { DateRange } from "react-day-picker";

interface TelemetryChartsProps {
  wellId: string;
  dateRange?: DateRange;
}

// Mock data for different parameters
const generateMockData = (parameter: string, dateRange?: DateRange) => {
  const data = [];
  
  // Determine date range - default to last 7 days if no range provided
  const endDate = dateRange?.to || new Date();
  const startDate = dateRange?.from || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Calculate the time difference and determine appropriate intervals
  const timeDiff = endDate.getTime() - startDate.getTime();
  const daysDiff = timeDiff / (24 * 60 * 60 * 1000);
  
  // Determine data points and intervals based on range
  let dataPoints: number;
  let intervalMs: number;
  let timeFormat: Intl.DateTimeFormatOptions;
  
  if (daysDiff <= 1) {
    // For single day or less: hourly data (24 points)
    dataPoints = 24;
    intervalMs = 60 * 60 * 1000; // 1 hour
    timeFormat = { hour: '2-digit', minute: '2-digit' };
  } else if (daysDiff <= 7) {
    // For up to a week: 4-hour intervals
    dataPoints = Math.ceil(daysDiff * 6);
    intervalMs = 4 * 60 * 60 * 1000; // 4 hours
    timeFormat = { month: 'short', day: 'numeric', hour: '2-digit' };
  } else if (daysDiff <= 30) {
    // For up to a month: daily data
    dataPoints = Math.ceil(daysDiff);
    intervalMs = 24 * 60 * 60 * 1000; // 1 day
    timeFormat = { month: 'short', day: 'numeric' };
  } else {
    // For longer periods: weekly data
    dataPoints = Math.ceil(daysDiff / 7);
    intervalMs = 7 * 24 * 60 * 60 * 1000; // 1 week
    timeFormat = { month: 'short', day: 'numeric' };
  }
  
  for (let i = 0; i < dataPoints; i++) {
    const time = new Date(startDate.getTime() + i * intervalMs);
    const hour = time.getHours();
    const dayOfWeek = time.getDay();
    
    let value;
    switch (parameter) {
      case 'flow':
        value = 15 + Math.sin(hour * 0.5) * 3 + Math.sin(dayOfWeek * 0.8) * 2 + Math.random() * 2;
        break;
      case 'pressure':
        value = 8.5 + Math.cos(hour * 0.3) * 1.5 + Math.cos(dayOfWeek * 0.5) * 0.8 + Math.random() * 0.5;
        break;
      case 'level':
        value = Math.max(20, 85 - (hour > 12 ? hour - 12 : 12 - hour) * 2 + Math.sin(dayOfWeek) * 5 + Math.random() * 5);
        break;
      case 'power':
        value = hour > 6 && hour < 22 ? 25 + Math.random() * 10 : 5 + Math.random() * 3;
        // Add weekly variation
        value += dayOfWeek < 5 ? 5 : -3; // Higher on weekdays
        break;
      default:
        value = Math.random() * 100;
    }
    
    data.push({
      time: time.toLocaleString('en-US', timeFormat),
      value: Math.round(Math.max(0, value) * 10) / 10,
      timestamp: time.getTime()
    });
  }
  
  return data;
};

const parameters = [
  { id: 'flow', name: 'FlowRate', unit: 'm³/h', color: '#2563eb', icon: Droplets },
  { id: 'pressure', name: 'Pressure', unit: 'bar', color: '#dc2626', icon: Gauge },
  { id: 'level', name: 'waterLevel', unit: '%', color: '#16a34a', icon: TrendingUp },
  { id: 'power', name: 'PowerUsage', unit: 'kW', color: '#ea580c', icon: Battery },
];

export const TelemetryCharts = ({ wellId, dateRange }: TelemetryChartsProps) => {
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [selectedParameters, setSelectedParameters] = useState(['flow', 'pressure']);

  const handleParameterToggle = (parameterId: string) => {
    setSelectedParameters(prev => 
      prev.includes(parameterId) 
        ? prev.filter(id => id !== parameterId)
        : [...prev, parameterId]
    );
  };

  const renderChart = (parameter: any, data: any[]) => {
    const ChartComponent = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart;
    const DataComponent = chartType === 'line' ? Line : chartType === 'area' ? Area : Bar;
    
    return (
      <div key={parameter.id} className="h-64">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <parameter.icon className="h-5 w-5" style={{ color: parameter.color }} />
            <h3 className="font-semibold">{parameter.name}</h3>
            <Badge variant="outline">{parameter.unit}</Badge>
          </div>
          <div className="text-2xl font-bold text-primary">
            {data[data.length - 1]?.value} {parameter.unit}
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            {chartType === 'line' && (
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={parameter.color}
                strokeWidth={2}
                dot={false}
              />
            )}
            {chartType === 'area' && (
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={parameter.color}
                fill={parameter.color}
                fillOpacity={0.2}
              />
            )}
            {chartType === 'bar' && (
              <Bar 
                dataKey="value" 
                fill={parameter.color}
                opacity={0.8}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
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
            <Select value={chartType} onValueChange={(value) => setChartType(value as any)}>
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
            <div className="flex space-x-2">
              {parameters.map((param) => (
                <Button
                  key={param.id}
                  variant={selectedParameters.includes(param.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleParameterToggle(param.id)}
                  className="flex items-center gap-1"
                >
                  <param.icon className="h-3 w-3" />
                  {param.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-status-connected-bg text-status-connected">
            <Zap className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
          <span className="text-sm text-muted-foreground">
            Station: {wellId.replace('-', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedParameters.map((paramId) => {
          const parameter = parameters.find(p => p.id === paramId);
          if (!parameter) return null;
          
          const data = generateMockData(paramId, dateRange);
          return renderChart(parameter, data);
        })}
      </div>

      {selectedParameters.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Select parameters above to view telemetry charts
        </div>
      )}
    </div>
  );
};