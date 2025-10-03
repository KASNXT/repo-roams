import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusIndicator } from "@/components/StatusIndicator";
import { BarChart3, Copy, Settings2 } from "lucide-react";

interface Threshold {
  id: string;
  parameter: string;
  unit: string;
  minValue: number;
  maxValue: number;
  warningLevel: number;
  criticalLevel: number;
  severity: "Warning" | "Critical";
  breaches: number;
}

const mockThresholds: Threshold[] = [
  {
    id: "1",
    parameter: "Well Pressure",
    unit: "psi",
    minValue: 2000,
    maxValue: 3500,
    warningLevel: 3200,
    criticalLevel: 3400,
    severity: "Critical",
    breaches: 3
  },
  {
    id: "2",
    parameter: "Temperature",
    unit: "°F", 
    minValue: 32,
    maxValue: 200,
    warningLevel: 180,
    criticalLevel: 195,
    severity: "Warning",
    breaches: 12
  },
  {
    id: "3",
    parameter: "Flow Rate",
    unit: "bbl/day",
    minValue: 800,
    maxValue: 2000,
    warningLevel: 1800,
    criticalLevel: 1950,
    severity: "Warning", 
    breaches: 1
  },
  {
    id: "4",
    parameter: "Tank Level",
    unit: "%",
    minValue: 10,
    maxValue: 95,
    warningLevel: 85,
    criticalLevel: 90,
    severity: "Critical",
    breaches: 0
  }
];

export function ThresholdsTab() {
  const [thresholds, setThresholds] = useState<Threshold[]>(mockThresholds);

  const updateThreshold = (id: string, field: string, value: number) => {
    setThresholds(prev => prev.map(threshold => 
      threshold.id === id ? { ...threshold, [field]: value } : threshold
    ));
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Device Thresholds</h3>
          <p className="text-sm text-muted-foreground">
            Configure monitoring limits and alert conditions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Apply to Group
          </Button>
          <Button variant="outline" size="sm">
            <Settings2 className="h-4 w-4 mr-2" />
            Bulk Configure
          </Button>
        </div>
      </div>

      {/* Thresholds Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Parameter Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Min Value</TableHead>
                <TableHead>Max Value</TableHead>
                <TableHead>Warning</TableHead>
                <TableHead>Critical</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Breaches</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thresholds.map((threshold) => (
                <TableRow key={threshold.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div>
                      {threshold.parameter}
                      <div className="text-xs text-muted-foreground">({threshold.unit})</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={threshold.minValue}
                      onChange={(e) => updateThreshold(threshold.id, 'minValue', parseFloat(e.target.value))}
                      className="w-20 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={threshold.maxValue}
                      onChange={(e) => updateThreshold(threshold.id, 'maxValue', parseFloat(e.target.value))}
                      className="w-20 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={threshold.warningLevel}
                      onChange={(e) => updateThreshold(threshold.id, 'warningLevel', parseFloat(e.target.value))}
                      className="w-20 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={threshold.criticalLevel}
                      onChange={(e) => updateThreshold(threshold.id, 'criticalLevel', parseFloat(e.target.value))}
                      className="w-20 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Select defaultValue={threshold.severity}>
                      <SelectTrigger className="w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Warning">Warning</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-sm">{threshold.breaches}</span>
                      {threshold.breaches > 0 && (
                        <StatusIndicator 
                          status={threshold.breaches > 5 ? "disconnected" : "warning"} 
                          label={threshold.breaches > 5 ? "High" : "Low"}
                        />
                      )}
                    </div>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">24</div>
              <div className="text-sm text-muted-foreground">Total Parameters</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-status-warning mb-2">16</div>
              <div className="text-sm text-muted-foreground">Warning Breaches (24h)</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive mb-2">3</div>
              <div className="text-sm text-muted-foreground">Critical Breaches (24h)</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}