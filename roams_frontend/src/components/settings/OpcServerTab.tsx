
// roams_frontend/src/components/settings/OpcServerTab.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Plus, Edit, Trash2, Wifi, Eye } from "lucide-react";
import { fetchStations } from "@/services/api"; // ✅ Correct import

// --- Define interface for station data from backend ---
interface OpcServer {
  id: number;
  station_name: string;
  endpoint_url: string;
  security_policy: string;
  connection_status: string;
  active: boolean;
}

// --- Helper to extract hostname and port from OPC UA URL ---
function parseOpcUrl(url: string): { hostname: string; port: number } {
  try {
    const match = url.match(/opc\.tcp:\/\/([^:/]+):(\d+)/);
    return {
      hostname: match ? match[1] : "Unknown",
      port: match ? parseInt(match[2]) : 0,
    };
  } catch {
    return { hostname: "Invalid URL", port: 0 };
  }
}

export function OpcServerTab() {
  const [servers, setServers] = useState<OpcServer[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch data from backend on component load
  useEffect(() => {
  const loadServers = async () => {
    try {
      const data = await fetchStations();
      setServers(data);
    } catch (err) {
      console.error("❌ Failed to load OPC servers:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Load once on mount
  loadServers();

  // 🔄 Auto refresh every 5 seconds
  const interval = setInterval(loadServers, 5000);

  // cleanup timer
  return () => clearInterval(interval);
}, []);


  return (
    <div className="space-y-6">
      {/* --- Action Bar --- */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Site System Configurations</h3>
          <p className="text-sm text-muted-foreground">
            Manage connections to industrial servers and PLCs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Wifi className="h-4 w-4 mr-2" />
            Test All
          </Button>
          <Button size="sm" className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>
      </div>

      {/* --- Servers Table --- */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Server Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-muted-foreground">
              Loading server data...
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No OPC UA servers found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>IP/Hostname</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Security Policy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.map((server) => {
                  const { hostname, port } = parseOpcUrl(server.endpoint_url);
                  const raw = server.connection_status?.toLowerCase();
                  const status =
                    raw === "connected" ||
                    raw === "online" ||
                    raw === "true"
                      ? "connected"
                      : "disconnected";

                  return (
                    <TableRow key={server.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {server.station_name || `Server ${server.id}`}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {hostname}
                      </TableCell>
                      <TableCell>{port}</TableCell>
                      <TableCell>
                        <span className="text-sm bg-secondary px-2 py-1 rounded">
                          {server.security_policy || "None"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusIndicator
                          status={status}
                          label={
                            status === "connected"
                              ? "Connected"
                              : "Disconnected"
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Wifi className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
