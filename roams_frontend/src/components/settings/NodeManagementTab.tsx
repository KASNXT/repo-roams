// roams_frontend/src/components/settings/NodeManagementTab.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Search, Plus, Download, Upload, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { parameterIcons, normalizeKey } from "@/utils/iconMap";
import type { LucideIcon } from "lucide-react";
import api from "@/services/api"; // ✅ use your configured axios instance

interface Node {
  id: number;
  nodeId: string;
  alias: string;
  dataType: string;
  unit: string;
  lastValue: string;
  status: "connected" | "warning" | "neutral";
  category: string;
  stationName: string;
}

export function NodeManagementTab() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // --- Fetch nodes from backend ---
  useEffect(() => {
    const loadNodes = async () => {
      try {
        // ✅ Use your API base (already has token & baseURL)
        const res = await api.get<any>("/opcua_node/?is_alarm=false");
        const data = Array.isArray(res.data)
          ? res.data
          : res.data.results || []; // handle pagination

        const mappedNodes: Node[] = data.map((node: any) => ({
          id: node.id,
          nodeId: node.node_id,
          alias: node.tag_name || node.node_id,
          dataType: node.access_level || "Unknown",
          unit: node.tag_units || "",
          lastValue: node.last_value !== null ? node.last_value.toString() : "No Data",
          status: node.last_value !== null ? "connected" : "neutral",
          category: node.tag_name ? normalizeKey(node.tag_name) : "default",
          stationName: node.station_name || "Unknown",
        }));

        setNodes(mappedNodes);
      } catch (error) {
        console.error("Failed to fetch nodes:", error);
        toast.error("Unable to load nodes from backend");
      } finally {
        setLoading(false);
      }
    };

    loadNodes();
  }, []);

  const filteredNodes = nodes.filter(
    (node) =>
      node.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.nodeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.stationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* --- Action Bar --- */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Node & Tag Management</h3>
          <p className="text-sm text-muted-foreground">
            Configure monitored data points and sensor mappings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm" className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Node
          </Button>
        </div>
      </div>

      {/* --- Search & Filter --- */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search nodes by name, ID or station..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* --- Nodes Table --- */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Monitored Data Points</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node ID</TableHead>
                <TableHead>Alias</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Last Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Station</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    Loading nodes...
                  </TableCell>
                </TableRow>
              ) : filteredNodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    No nodes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredNodes.map((node) => {
                  const Icon: LucideIcon =
                    parameterIcons[node.category] || parameterIcons.default;
                  return (
                    <TableRow key={node.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          {node.nodeId}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{node.alias}</TableCell>
                      <TableCell>
                        <span className="text-sm bg-secondary px-2 py-1 rounded">
                          {node.dataType}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{node.unit}</TableCell>
                      <TableCell className="font-mono font-medium">
                        {node.lastValue}
                      </TableCell>
                      <TableCell>
                        <StatusIndicator
                          status={node.status}
                          label={
                            node.status === "connected"
                              ? "Online"
                              : node.status === "warning"
                              ? "Warning"
                              : "Offline"
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{node.stationName}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
