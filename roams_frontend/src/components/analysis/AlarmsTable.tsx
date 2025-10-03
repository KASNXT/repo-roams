import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

interface AlarmsTableProps {
  searchTerm: string;
  filterType: string;
  wellId: string;
  dateRange?: DateRange;
}

interface Alarm {
  id: string;
  dateTime: string;
  type: string;
  description: string;
  acknowledgedBy?: string;
  status: 'active' | 'resolved' | 'acknowledged';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Mock alarm data
const generateMockAlarms = (wellId: string): Alarm[] => {
  const baseAlarms = [
    {
      id: '1',
      dateTime: '2025-08-12 14:23:15',
      type: 'High Pressure',
      description: 'Pressure exceeded 10 bar threshold',
      acknowledgedBy: 'John Smith',
      status: 'resolved' as const,
      severity: 'high' as const
    },
    {
      id: '2',
      dateTime: '2025-08-12 13:45:32',
      type: 'Low Level',
      description: 'Tank level dropped below 20%',
      status: 'active' as const,
      severity: 'medium' as const
    },
    {
      id: '3',
      dateTime: '2025-08-12 12:15:08',
      type: 'Communication Error',
      description: 'Lost connection to pressure sensor',
      acknowledgedBy: 'Sarah Johnson',
      status: 'acknowledged' as const,
      severity: 'high' as const
    },
    {
      id: '4',
      dateTime: '2025-08-12 11:30:45',
      type: 'Overcurrent',
      description: 'Motor current exceeded 15A',
      acknowledgedBy: 'Mike Wilson',
      status: 'resolved' as const,
      severity: 'critical' as const
    },
    {
      id: '5',
      dateTime: '2025-08-12 10:22:19',
      type: 'Flow Rate Anomaly',
      description: 'Flow rate below expected range',
      status: 'active' as const,
      severity: 'low' as const
    },
    {
      id: '6',
      dateTime: '2025-08-12 09:15:33',
      type: 'Temperature High',
      description: 'Motor temperature above 80°C',
      acknowledgedBy: 'David Lee',
      status: 'resolved' as const,
      severity: 'medium' as const
    },
    {
      id: '7',
      dateTime: '2025-08-11 23:45:12',
      type: 'Power Failure',
      description: 'Backup power system activated',
      acknowledgedBy: 'Emergency System',
      status: 'resolved' as const,
      severity: 'critical' as const
    },
    {
      id: '8',
      dateTime: '2025-08-11 22:18:41',
      type: 'Vibration Alert',
      description: 'Unusual vibration pattern detected',
      status: 'active' as const,
      severity: 'medium' as const
    }
  ];

  // Customize some alarms based on wellId
  return baseAlarms.map(alarm => ({
    ...alarm,
    description: `${alarm.description} (${wellId.toUpperCase().replace('-', ' ')})`
  }));
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
  const itemsPerPage = 10;
  
  const allAlarms = generateMockAlarms(wellId);
  
  // Filter alarms based on search term, filter type, and date range
  const filteredAlarms = allAlarms.filter(alarm => {
    const matchesSearch = searchTerm === '' || 
      alarm.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alarm.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
      alarm.type.toLowerCase().includes(filterType.replace('-', ' '));
    
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

  return (
    <div className="space-y-4">
      {/* Table Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAlarms.length)} of {filteredAlarms.length} alarms
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-40">Date/Time</TableHead>
              <TableHead className="w-32">Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Acknowledged By</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAlarms.map((alarm) => (
              <TableRow key={alarm.id} className="hover:bg-muted/50">
                <TableCell className="text-center">
                  {getSeverityIcon(alarm.severity)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {alarm.dateTime}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{alarm.type}</Badge>
                </TableCell>
                <TableCell className="max-w-md">
                  {alarm.description}
                </TableCell>
                <TableCell>
                  {alarm.acknowledgedBy || '—'}
                </TableCell>
                <TableCell>
                  {getStatusBadge(alarm.status)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8 p-0"
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
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filteredAlarms.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No alarms found matching your criteria
        </div>
      )}
    </div>
  );
};