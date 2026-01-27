import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  AlertCircle
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO } from "date-fns";
import axios from "axios";

interface AlarmsTableProps {
  searchTerm: string;
  filterType: string;
  wellId: string;
  dateRange?: DateRange;
}

interface Alarm {
  id: string | number;
  dateTime: string;
  type: string;
  description: string;
  acknowledgedBy?: string;
  status: 'active' | 'resolved' | 'acknowledged';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Fetch real alarms from ThresholdBreach API
const fetchAlarmsFromDatabase = async (_wellId: string, _dateRange?: DateRange): Promise<Alarm[]> => {
  try {
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

    const res = await api.get("/breaches/");
    // Handle both paginated and array responses
    const breaches = Array.isArray(res.data) ? res.data : ((res.data as any)?.results || []);

    // Filter by station if needed and convert to Alarm format
    return breaches.map((breach: any) => ({
      id: breach.id,
      dateTime: new Date(breach.timestamp).toLocaleString(),
      type: `${breach.level || breach.breach_type} Breach`,
      description: `Node: ${breach.node_tag_name || breach.node_name || `Node ${breach.node}`} - Value: ${breach.value || breach.breach_value}`,
      acknowledgedBy: breach.acknowledged_by || undefined,
      status: breach.acknowledged ? 'acknowledged' : 'active',
      severity: (breach.level === 'Critical' || breach.breach_type === 'HIGH') ? 'critical' : 'high',
    }));
  } catch (error) {
    console.error("Error fetching alarms from database:", error);
    return [];
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-status-warning" />;
    case 'medium':
      return <Clock className="h-4 w-4 text-primary" />;
    default:
      return <CheckCircle className="h-4 w-4 text-status-connected" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge variant="destructive">Active</Badge>;
    case 'acknowledged':
      return <Badge variant="secondary" className="bg-status-warning-bg text-status-warning">Acknowledged</Badge>;
    case 'resolved':
      return <Badge variant="secondary" className="bg-status-connected-bg text-status-connected">Resolved</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const AlarmsTable = ({ searchTerm, filterType, wellId, dateRange }: AlarmsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedAlarmId, setExpandedAlarmId] = useState<string | number | null>(null);
  const [allAlarms, setAllAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;
  
  // Fetch alarms from database when component mounts or props change
  useEffect(() => {
    const loadAlarms = async () => {
      setLoading(true);
      const fetchedAlarms = await fetchAlarmsFromDatabase(wellId, dateRange);
      setAllAlarms(fetchedAlarms);
      setLoading(false);
    };
    
    loadAlarms();
  }, [wellId, dateRange]);
  
  // Filter alarms based on search term, filter type, and date range
  const filteredAlarms = allAlarms.filter(alarm => {
    const matchesSearch = searchTerm === '' || 
      alarm.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alarm.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
      alarm.type.toLowerCase().includes(filterType.replace('-', ' ')) ||
      alarm.status.toLowerCase().includes(filterType.replace('-', ' '));
    
    // Date range filtering
    let matchesDateRange = true;
    if (dateRange?.from && dateRange?.to) {
      try {
        const alarmDate = parseISO(alarm.dateTime.replace(' ', 'T'));
        matchesDateRange = isWithinInterval(alarmDate, {
          start: dateRange.from,
          end: dateRange.to
        });
      } catch (error) {
        // If date parsing fails, include the alarm
        matchesDateRange = true;
      }
    }
    
    return matchesSearch && matchesFilter && matchesDateRange;
  });

  // Paginate alarms
  const totalPages = Math.ceil(filteredAlarms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAlarms = filteredAlarms.slice(startIndex, startIndex + itemsPerPage);

  const handleExportCSV = () => {
    const csvContent = [
      ['Date/Time', 'Type', 'Description', 'Acknowledged By', 'Status', 'Severity'],
      ...filteredAlarms.map(alarm => [
        alarm.dateTime,
        alarm.type,
        alarm.description,
        alarm.acknowledgedBy || 'N/A',
        alarm.status,
        alarm.severity
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alarms-${wellId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-sm text-muted-foreground">Loading alarms...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Empty state */}
      {filteredAlarms.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No alarms found for the selected filters</p>
        </div>
      )}

      {filteredAlarms.length > 0 && (
        <>
          {/* Table Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs md:text-sm text-muted-foreground">
              Showing <span className="font-medium">{startIndex + 1}</span>-<span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredAlarms.length)}</span> of <span className="font-medium">{filteredAlarms.length}</span> alarms
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="w-full sm:w-auto text-xs md:text-sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Mobile: Card Layout (visible on small screens) */}
          <div className="block md:hidden space-y-3">
        {paginatedAlarms.map((alarm) => (
          <Card key={alarm.id} className="overflow-hidden border-l-4 border-l-gray-300">
            <CardHeader className={`pb-2 ${
              alarm.severity === 'critical' ? 'bg-red-50 border-l-red-500' :
              alarm.severity === 'high' ? 'bg-orange-50 border-l-orange-500' :
              alarm.severity === 'medium' ? 'bg-yellow-50 border-l-yellow-500' :
              'bg-green-50 border-l-green-500'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  {getSeverityIcon(alarm.severity)}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm break-words pr-2">{alarm.type}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{alarm.dateTime}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {getStatusBadge(alarm.status)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-3 space-y-3">
              {/* Description Section */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Description</p>
                <p className="text-xs text-gray-600 leading-relaxed break-words">
                  {alarm.description}
                </p>
              </div>

              {/* Metadata Section */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Severity</p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {alarm.severity}
                  </Badge>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Acked By</p>
                  <p className="text-gray-600 break-words">{alarm.acknowledgedBy || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: Table Layout (visible on medium+ screens) */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 text-center"></TableHead>
              <TableHead className="w-32 text-xs md:text-sm">Date/Time</TableHead>
              <TableHead className="w-28 text-xs md:text-sm">Type</TableHead>
              <TableHead className="text-xs md:text-sm">Description</TableHead>
              <TableHead className="w-28 text-xs md:text-sm">Acked By</TableHead>
              <TableHead className="w-20 text-xs md:text-sm text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAlarms.map((alarm) => (
              <TableRow 
                key={alarm.id}
                className={`hover:bg-muted/50 transition-colors cursor-pointer ${
                  alarm.severity === 'critical' ? 'bg-red-50/30' :
                  alarm.severity === 'high' ? 'bg-orange-50/30' :
                  alarm.severity === 'medium' ? 'bg-yellow-50/30' :
                  ''
                }`}
                onClick={() => setExpandedAlarmId(expandedAlarmId === alarm.id ? null : alarm.id)}
              >
                {/* Severity Icon */}
                <TableCell className="text-center py-2">
                  {getSeverityIcon(alarm.severity)}
                </TableCell>

                {/* Date/Time - Mono font for consistency */}
                <TableCell className="font-mono text-xs md:text-sm py-2 whitespace-nowrap">
                  {alarm.dateTime}
                </TableCell>

                {/* Type - Badge */}
                <TableCell className="py-2">
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {alarm.type}
                  </Badge>
                </TableCell>

                {/* Description - Truncated with expand option */}
                <TableCell className="max-w-md py-2">
                  <div className="text-xs md:text-sm">
                    <p className="break-words line-clamp-2">
                      {alarm.description}
                    </p>
                    {expandedAlarmId === alarm.id && (
                      <div className="mt-2 pt-2 border-t text-xs text-gray-600 break-words whitespace-pre-wrap">
                        {alarm.description}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Acknowledged By */}
                <TableCell className="text-xs md:text-sm py-2 whitespace-nowrap">
                  {alarm.acknowledgedBy ? (
                    <span className="text-gray-600 truncate">{alarm.acknowledgedBy}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Status - Badge with alignment */}
                <TableCell className="py-2 text-center">
                  {getStatusBadge(alarm.status)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Empty State */}
      {paginatedAlarms.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No alarms found matching your criteria</p>
        </div>
      )}

      {/* Pagination - Responsive */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
        <div className="text-xs md:text-sm text-muted-foreground">
          Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages || 1}</span>
        </div>
        
        <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="text-xs md:text-sm h-8 md:h-9"
          >
            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline ml-1">Prev</span>
          </Button>
          
          {/* Page Numbers - Responsive */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-7 h-7 md:w-8 md:h-8 p-0 text-xs"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="text-xs md:text-sm h-8 md:h-9"
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>
        </>
      )}
    </div>
  );
};