// roams_frontend/src/components/settings/VPNConnections.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Server, Download, Upload, ArrowRight } from "lucide-react";
import { fetchVPNStatus, type VPNClient, type VPNStatus } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function VPNConnections() {
  const { user } = useAuth();
  const [vpnData, setVpnData] = useState<VPNStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.is_staff;

  useEffect(() => {
    if (!isAdmin) return;

    loadVPNStatus();

    // Auto-refresh every 10 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(loadVPNStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, autoRefresh]);

  const loadVPNStatus = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      const data = await fetchVPNStatus();
      setVpnData(data);
    } catch (error: any) {
      console.error("Failed to fetch VPN status:", error);
      if (error?.response?.status === 403) {
        toast.error("Admin access required to view VPN connections");
      } else {
        // Silently fail if VPN not configured
        setVpnData({
          total_connections: 0,
          openvpn_count: 0,
          l2tp_count: 0,
          clients: [],
          servers: { openvpn: false, l2tp: false },
          last_updated: new Date().toISOString(),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (dateString: string): string => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      const connectedTime = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - connectedTime.getTime();
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    } catch {
      return dateString;
    }
  };

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-medium">VPN Connections</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadVPNStatus}
              disabled={loading}
              className="h-8 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-8 text-xs"
            >
              Auto: {autoRefresh ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Server Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/20">
                <Server className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">OpenVPN</p>
                <p className="text-sm font-medium">{vpnData?.openvpn_count || 0} clients</p>
              </div>
            </div>
            <StatusIndicator
              status={vpnData?.servers?.openvpn ? "connected" : "disconnected"}
              label=""
            />
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/20">
                <Server className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">L2TP/IPSec</p>
                <p className="text-sm font-medium">{vpnData?.l2tp_count || 0} clients</p>
              </div>
            </div>
            <StatusIndicator
              status={vpnData?.servers?.l2tp ? "connected" : "disconnected"}
              label=""
            />
          </div>
        </div>

        {/* Total Connections Badge */}
        <div className="flex items-center justify-between p-3 bg-gradient-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Total Active Connections</span>
          </div>
          <span className="text-2xl font-bold text-primary">{vpnData?.total_connections || 0}</span>
        </div>

        {/* Connected Clients Table */}
        {vpnData && vpnData.clients && vpnData.clients.length > 0 ? (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left py-2 px-3 font-medium">Client</th>
                  <th className="text-left py-2 px-3 font-medium hidden sm:table-cell">Real IP</th>
                  <th className="text-left py-2 px-3 font-medium hidden md:table-cell">VPN IP</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-left py-2 px-3 font-medium hidden lg:table-cell">Encryption</th>
                  <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Duration</th>
                  <th className="text-left py-2 px-3 font-medium hidden lg:table-cell">Traffic</th>
                </tr>
              </thead>
              <tbody>
                {vpnData.clients.map((client) => (
                  <tr key={client.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-medium text-xs sm:text-sm">{client.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">
                      {client.ip_address}
                    </td>
                    <td className="py-2 px-3 text-xs sm:text-sm text-muted-foreground hidden md:table-cell font-mono">
                      {client.vpn_ip || 'N/A'}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        client.vpn_type === 'OpenVPN' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                      }`}>
                        {client.vpn_type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground hidden lg:table-cell">
                      {client.encryption || 'N/A'}
                    </td>
                    <td className="py-2 px-3 text-xs sm:text-sm text-muted-foreground hidden md:table-cell">
                      {formatDuration(client.connected_since)}
                    </td>
                    <td className="py-2 px-3 hidden lg:table-cell">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <Download className="h-3 w-3" />
                          {formatBytes(client.bytes_received)}
                        </div>
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Upload className="h-3 w-3" />
                          {formatBytes(client.bytes_sent)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active VPN connections</p>
            {!vpnData?.servers?.openvpn && !vpnData?.servers?.l2tp && (
              <p className="text-xs mt-1">VPN servers may not be configured or running</p>
            )}
          </div>
        )}

        {/* Last Updated */}
        {vpnData && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last updated: {new Date(vpnData.last_updated).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
