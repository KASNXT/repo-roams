import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Search, Plus, Download, Upload, BarChart3 } from "lucide-react";

interface Node {
  id: string;
  nodeId: string;
  alias: string;
  dataType: string;
  unit: string;
  lastValue: string;
  status: "connected" | "warning" | "neutral";
  category: string;
}

const mockNodes: Node[] = [
  {
    id: "1",
    nodeId: "ns=2;s=Well01.Pressure",
    alias: "Well 01 Pressure",
    dataType: "Float",
    unit: "psi",
    lastValue: "2847.5",
    status: "connected",
    category: "pressure"
  },
  {
    id: "2",
    nodeId: "ns=2;s=Well01.Temperature",
    alias: "Well 01 Temperature", 
    dataType: "Float",
    unit: "°F",
    lastValue: "185.2",
    status: "warning",
    category: "temperature"
  },
  {
    id: "3",
    nodeId: "ns=2;s=Pump.FlowRate",
    alias: "Main Pump Flow Rate",
    dataType: "Float", 
    unit: "bbl/day",
    lastValue: "1247.8",
    status: "connected",
    category: "flow"
  },
  {
    id: "4",
    nodeId: "ns=2;s=Tank01.Level",
    alias: "Storage Tank 01 Level",
    dataType: "Float",
    unit: "%",
    lastValue: "67.3", 
    status: "neutral",
    category: "level"
  }
];

const categoryColors: Record<string, string> = {
  pressure: "🔴",
  temperature: "🟡", 
  flow: "🔵",
  level: "🟢"
};

export function NodeManagementTab() {
  const [nodes] = useState<Node[]>(mockNodes);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredNodes = nodes.filter(node => 
    node.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.nodeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Action Bar */}
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

      {/* Search & Filter */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search nodes by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Nodes Table */}
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
                <TableHead>Data Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Last Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNodes.map((node) => (
                <TableRow key={node.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm max-w-xs truncate">
                    <div className="flex items-center gap-2">
                      <span>{categoryColors[node.category]}</span>
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
                  <TableCell className="font-mono font-medium">{node.lastValue}</TableCell>
                  <TableCell>
                    <StatusIndicator 
                      status={node.status} 
                      label={node.status === "connected" ? "Online" : node.status === "warning" ? "Warning" : "Offline"}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}