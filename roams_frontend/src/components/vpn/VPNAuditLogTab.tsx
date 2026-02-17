import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download } from "lucide-react";
import { Loader2 } from "lucide-react";
import { getVPNAuditLog, VPNAuditLog } from "@/services/api";
import { format } from "date-fns";

export function VPNAuditLogTab() {
  const [filters, setFilters] = useState({
    action: "all",
    vpn_type: "all",
    admin_user_id: "",
  });

  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ["vpn-audit-log", filters],
    queryFn: () => {
      const filterObj: any = {};
      if (filters.action && filters.action !== "all") filterObj.action = filters.action;
      if (filters.vpn_type && filters.vpn_type !== "all") filterObj.vpn_type = filters.vpn_type;
      if (filters.admin_user_id) filterObj.admin_user_id = parseInt(filters.admin_user_id);
      return getVPNAuditLog(filterObj);
    },
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-500/20 text-green-700 dark:bg-green-950/30 dark:text-green-400";
      case "delete":
      case "revoke":
        return "bg-red-500/20 text-red-700 dark:bg-red-950/30 dark:text-red-400";
      case "update":
        return "bg-blue-500/20 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
      case "download":
        return "bg-purple-500/20 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400";
      case "activate":
      case "deactivate":
        return "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400";
      default:
        return "bg-gray-500/20 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400";
    }
  };

  const getVPNTypeColor = (type: string) => {
    return type === "l2tp" ? "bg-blue-500/20 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" : "bg-purple-500/20 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400";
  };

  const handleExport = () => {
    if (auditLogs.length === 0) {
      alert("No audit logs to export");
      return;
    }

    const csv = [
      ["Timestamp", "Action", "Type", "Client", "Admin", "IP Address", "Details"],
      ...auditLogs.map((log) => [
        format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
        log.action,
        log.vpn_type,
        log.client_name,
        log.admin_user.username,
        log.ip_address || "N/A",
        log.details || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vpn_audit_log_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div>
        <h3 className="text-lg font-semibold mb-4">VPN Audit Log</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="filter-action" className="text-xs">
              Action
            </Label>
            <Select value={filters.action} onValueChange={(val) => setFilters({ ...filters, action: val })}>
              <SelectTrigger id="filter-action" className="mt-1">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="revoke">Revoke</SelectItem>
                <SelectItem value="download">Download</SelectItem>
                <SelectItem value="activate">Activate</SelectItem>
                <SelectItem value="deactivate">Deactivate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filter-type" className="text-xs">
              VPN Type
            </Label>
            <Select value={filters.vpn_type} onValueChange={(val) => setFilters({ ...filters, vpn_type: val })}>
              <SelectTrigger id="filter-type" className="mt-1">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="l2tp">L2TP/IPsec</SelectItem>
                <SelectItem value="openvpn">OpenVPN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col">
            <Label htmlFor="filter-user" className="text-xs mb-1">
              Admin User ID
            </Label>
            <Input
              id="filter-user"
              type="number"
              placeholder="Filter by user"
              value={filters.admin_user_id}
              onChange={(e) => setFilters({ ...filters, admin_user_id: e.target.value })}
              className="mt-1 h-10"
            />
          </div>

          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" className="w-full" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading audit logs...</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Admin User</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getVPNTypeColor(log.vpn_type)}>
                        {log.vpn_type === "l2tp" ? "L2TP" : "OpenVPN"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.client_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.admin_user.username}</div>
                        {log.admin_user.last_login_time && (
                          <div className="text-xs text-muted-foreground">
                            Last login: {format(new Date(log.admin_user.last_login_time), "MMM dd, yyyy HH:mm")}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {log.ip_address || "N/A"}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {log.details || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-xs text-muted-foreground">Total Entries</div>
          <div className="text-2xl font-bold">{auditLogs.length}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-muted-foreground">Creations</div>
          <div className="text-2xl font-bold text-green-600">
            {auditLogs.filter((l) => l.action === "create").length}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-muted-foreground">Revocations</div>
          <div className="text-2xl font-bold text-red-600">
            {auditLogs.filter((l) => l.action === "revoke").length}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-muted-foreground">Downloads</div>
          <div className="text-2xl font-bold text-purple-600">
            {auditLogs.filter((l) => l.action === "download").length}
          </div>
        </div>
      </div>
    </div>
  );
}
