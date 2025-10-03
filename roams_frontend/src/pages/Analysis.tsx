import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TelemetryCharts } from "@/components/analysis/TelemetryCharts";
import { AlarmsTable } from "@/components/analysis/AlarmsTable";
import { DatePickerWithRange } from "@/components/analysis/DatePickerWithRange";
import { ThemeToggle } from "@/components/analysis/ThemeToggle";
import { UserDisplay } from "@/components/UserDisplay";
import { TrendingUp, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import type  { DateRange } from "react-day-picker";
import { toast } from "sonner";

const Analysis = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedWell, setSelectedWell] = useState("station-alpha");
  const [searchTerm, setSearchTerm] = useState("");
  const [alarmFilter, setAlarmFilter] = useState("all");
  
  interface TelemetryRow {
  station: string;
  parameter: string;
  time: Date | string;
  value: number;
  unit: string;
}
  const handleExport = () => {
    const dateString = dateRange?.from && dateRange?.to 
      ? `${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`
      : 'all dates';
    
    // Generate telemetry data for export
    const parameters = ['flow', 'pressure', 'level', 'power'];
     const telemetryData: TelemetryRow[] = [];
    
    parameters.forEach(param => {
      const data = generateMockData(param, dateRange);
      data.forEach(point => {
        telemetryData.push({
          station: selectedWell,
          parameter: param,
          time: point.time,
          value: point.value,
          unit: getParameterUnit(param)
        });
      });
    });
    
    // Generate alarms data for export
    const allAlarms = generateMockAlarms(selectedWell);
    const filteredAlarms = allAlarms.filter(alarm => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const alarmDate = new Date(alarm.dateTime);
      return alarmDate >= dateRange.from && alarmDate <= dateRange.to;
    });
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add telemetry section
    csvContent += "BORE HOLES DATA\n";
    csvContent += "Station,Parameter,Time,Value,Unit\n";
    telemetryData.forEach(row => {
      csvContent += `${row.station},${row.parameter},${row.time},${row.value},${row.unit}\n`;
    });
    
    // Add separator
    csvContent += "\n\nALARMS DATA\n";
    csvContent += "Date/Time,Type,Description,Status,Severity,Acknowledged By\n";
    filteredAlarms.forEach(alarm => {
      const description = alarm.description.replace(/,/g, ';'); // Replace commas to avoid CSV issues
      csvContent += `${alarm.dateTime},${alarm.type},${description},${alarm.status},${alarm.severity},${alarm.acknowledgedBy || 'N/A'}\n`;
    });
    
    // Create and download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `ROAMS_REPORT_${selectedWell}_${dateRange?.from?.toISOString().split('T')[0] || 'all'}_to_${dateRange?.to?.toISOString().split('T')[0] || 'all'}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Analysis data exported for ${selectedWell} (${dateString})`);
  };

  // Helper functions for export
  const getParameterUnit = (param: string) => {
    const units = {
      flow: 'm³/h',
      pressure: 'bar', 
      level: '%',
      power: 'kW'
    };
    return units[param as keyof typeof units] || '';
  };

  // Mock data generator (same as in TelemetryCharts)
  const generateMockData = (parameter: string, dateRange?: DateRange) => {
    const data = [];
    const endDate = dateRange?.to || new Date();
    const startDate = dateRange?.from || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = timeDiff / (24 * 60 * 60 * 1000);
    
    let dataPoints: number;
    let intervalMs: number;
    let timeFormat: Intl.DateTimeFormatOptions;
    
    if (daysDiff <= 1) {
      dataPoints = 24;
      intervalMs = 60 * 60 * 1000;
      timeFormat = { hour: '2-digit', minute: '2-digit' };
    } else if (daysDiff <= 7) {
      dataPoints = Math.ceil(daysDiff * 6);
      intervalMs = 4 * 60 * 60 * 1000;
      timeFormat = { month: 'short', day: 'numeric', hour: '2-digit' };
    } else if (daysDiff <= 30) {
      dataPoints = Math.ceil(daysDiff);
      intervalMs = 24 * 60 * 60 * 1000;
      timeFormat = { month: 'short', day: 'numeric' };
    } else {
      dataPoints = Math.ceil(daysDiff / 7);
      intervalMs = 7 * 24 * 60 * 60 * 1000;
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
          value += dayOfWeek < 5 ? 5 : -3;
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

  // Mock alarms generator (same as in AlarmsTable)
  const generateMockAlarms = (wellId: string) => {
    const alarmTypes = ['High Pressure', 'Low Flow', 'Temperature Alert', 'Power Fluctuation', 'Communication Error', 'Maintenance Due'];
    const severities = ['Critical', 'High', 'Medium', 'Low'];
    const statuses = ['Active', 'Acknowledged', 'Resolved'];
    
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
        description: `${type} detected on ${wellId.replace('-', ' ')} - requires immediate attention`,
        status,
        severity,
        acknowledgedBy: status !== 'Active' ? `Operator ${Math.floor(Math.random() * 5) + 1}` : undefined
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
                <h1 className="text-xl font-bold text-foreground">ROAMS - Analysis</h1>
                <p className="text-xs text-muted-foreground">Telemetry Data & System Analysis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div>
                
                <Select value={selectedWell} onValueChange={setSelectedWell}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="station-alpha">Station Alpha</SelectItem>
                    <SelectItem value="station-beta">Station Beta</SelectItem>
                    <SelectItem value="station-gamma">Station Gamma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DatePickerWithRange 
                date={dateRange}
                onDateChange={setDateRange}
              />
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <ThemeToggle />
              <UserDisplay />
              
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 p-6 space-y-6">
            {/* Telemetry Charts Section */}
            <TelemetryCharts wellId={selectedWell} dateRange={dateRange} />
            
            {/* Alarms Table Section */}
            <AlarmsTable 
              searchTerm={searchTerm} 
              filterType={alarmFilter} 
              wellId={selectedWell}
              dateRange={dateRange}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Analysis;