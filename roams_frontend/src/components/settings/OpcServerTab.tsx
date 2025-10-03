import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Plus, Edit, Trash2, Wifi, Eye } from "lucide-react";

interface OpcServer {
  id: string;
  name: string;
  hostname: string;
  port: number;
  securityPolicy: string;
  status: "connected" | "disconnected";
}

const mockServers: OpcServer[] = [
  {
    id: "1",
    name: "Well-01 Controller",
    hostname: "192.168.1.100",
    port: 4840,
    securityPolicy: "Basic256Sha256",
    status: "connected"
  },
  {
    id: "2", 
    name: "Pump Station Alpha",
    hostname: "plc-alpha.roams.local",
    port: 4840,
    securityPolicy: "None",
    status: "connected"
  },
  {
    id: "3",
    name: "Tank Farm Monitor",
    hostname: "192.168.1.205",
    port: 4840,
    securityPolicy: "Basic256Sha256", 
    status: "disconnected"
  }
];

export function OpcServerTab() {
  const [servers] = useState<OpcServer[]>(mockServers);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
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

      {/* Servers Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Server Connections</CardTitle>
        </CardHeader>
        <CardContent>
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
              {servers.map((server) => (
                <TableRow key={server.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{server.name}</TableCell>
                  <TableCell className="font-mono text-sm">{server.hostname}</TableCell>
                  <TableCell>{server.port}</TableCell>
                  <TableCell>
                    <span className="text-sm bg-secondary px-2 py-1 rounded">
                      {server.securityPolicy}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusIndicator 
                      status={server.status} 
                      label={server.status === "connected" ? "Connected" : "Disconnected"}
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
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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