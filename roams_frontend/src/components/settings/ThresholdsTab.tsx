import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { fetchStations, type Station } from "@/services/api";
import api from "@/services/api";

interface Threshold {
  id: number;
  node_id: number;
  parameter: string;
  add_new_tag_name: string;
  unit: string;
  min_value: number | null;
  max_value: number | null;
  warning_level: number | null;
  critical_level: number | null;
  severity: "Warning" | "Critical";
  active: boolean;
  breaches_24h: number;
  breaches_critical_24h: number;
  breaches_warning_24h: number;
  unacknowledged_breaches: number;
}

export function ThresholdsTab() {
  // Station & Threshold states
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [loadingStations, setLoadingStations] = useState(true);

  // Thresholds states
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [loadingThresholds, setLoadingThresholds] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<number, boolean>>({});

  // Load stations on mount
  useEffect(() => {
    const loadStations = async () => {
      try {
        const data = await fetchStations();
        setStations(data);
        if (data.length > 0 && !selectedStation) {
          setSelectedStation(data[0].station_name);
        }
      } catch (error) {
        console.error("Failed to fetch stations:", error);
        toast.error("Unable to load stations");
      } finally {
        setLoadingStations(false);
      }
    };
    loadStations();
  }, []);

  // Load thresholds when station changes
  useEffect(() => {
    if (!selectedStation) {
      setThresholds([]);
      return;
    }

    const loadThresholds = async () => {
      setLoadingThresholds(true);
      try {
        const response = await api.get("/thresholds/", {
          params: { station: selectedStation },
        });
        const responseData = response.data as Threshold[] | { results: Threshold[] };
        const data = Array.isArray(responseData) ? responseData : responseData.results || [];
        setThresholds(data);
        setUnsavedChanges({});
      } catch (error) {
        console.error("Failed to fetch thresholds:", error);
        toast.error("Unable to load thresholds for this station");
      } finally {
        setLoadingThresholds(false);
      }
    };

    loadThresholds();
  }, [selectedStation]);

  const updateThreshold = (id: number, field: string, value: number | null) => {
    setThresholds(prev => prev.map(threshold => 
      threshold.id === id ? { ...threshold, [field]: value } : threshold
    ));
    // Mark as having unsaved changes
    setUnsavedChanges(prev => ({ ...prev, [id]: true }));
  };

  const saveThresholds = async () => {
    setSavingChanges(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const threshold of thresholds) {
        if (!unsavedChanges[threshold.id]) continue; // Skip unchanged items

        try {
          await api.patch(`/thresholds/${threshold.id}/`, {
            min_value: threshold.min_value,
            max_value: threshold.max_value,
            warning_level: threshold.warning_level,
            critical_level: threshold.critical_level,
            severity: threshold.severity,
            active: threshold.active,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to save threshold ${threshold.id}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`✅ All ${successCount} thresholds saved successfully!`);
        setUnsavedChanges({});
      } else {
        toast.warning(`Saved ${successCount}, but ${errorCount} failed`);
      }
    } catch (error) {
      console.error("Failed to save thresholds:", error);
      toast.error("Failed to save thresholds");
    } finally {
      setSavingChanges(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Station Selector */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Select Station</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedStation} onValueChange={setSelectedStation}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choose a station..." />
              </SelectTrigger>
              <SelectContent>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.station_name}>
                    {station.station_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingStations && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Threshold Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Set warning and critical levels for parameters (stored in backend)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={saveThresholds}
            disabled={savingChanges || loadingThresholds || thresholds.length === 0 || Object.keys(unsavedChanges).length === 0}
          >
            {savingChanges && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes ({Object.keys(unsavedChanges).length})
          </Button>
        </div>
      </div>

      {/* Thresholds Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Parameter Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingThresholds ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">Loading thresholds...</span>
            </div>
          ) : thresholds.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {selectedStation ? "No thresholds configured for this station" : "Select a station to view thresholds"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Min</TableHead>
                    <TableHead>Max</TableHead>
                    <TableHead>Warning</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Breaches (24h)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thresholds.map((threshold) => (
                    <TableRow 
                      key={threshold.id} 
                      className={`hover:bg-muted/50 ${unsavedChanges[threshold.id] ? 'bg-yellow-50 dark:bg-yellow-950' : ''}`}
                    >
                      <TableCell className="font-medium">
                        <div>
                          {threshold.parameter || threshold.add_new_tag_name || "Unnamed"}
                          <div className="text-xs text-muted-foreground">({threshold.unit || "N/A"})</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={threshold.min_value ?? ""}
                          onChange={(e) => updateThreshold(threshold.id, 'min_value', e.target.value ? parseFloat(e.target.value) : null)}
                          className="w-20 text-xs"
                          placeholder="--"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={threshold.max_value ?? ""}
                          onChange={(e) => updateThreshold(threshold.id, 'max_value', e.target.value ? parseFloat(e.target.value) : null)}
                          className="w-20 text-xs"
                          placeholder="--"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={threshold.warning_level ?? ""}
                          onChange={(e) => updateThreshold(threshold.id, 'warning_level', e.target.value ? parseFloat(e.target.value) : null)}
                          className="w-20 text-xs"
                          placeholder="--"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={threshold.critical_level ?? ""}
                          onChange={(e) => updateThreshold(threshold.id, 'critical_level', e.target.value ? parseFloat(e.target.value) : null)}
                          className="w-20 text-xs"
                          placeholder="--"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={threshold.severity} onValueChange={(value) => updateThreshold(threshold.id, 'severity', value as any)}>
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
                        <div className="text-sm">
                          <div className="font-semibold">{threshold.breaches_24h}</div>
                          <div className="text-xs text-red-600">🔴 {threshold.breaches_critical_24h}</div>
                          <div className="text-xs text-yellow-600">🟡 {threshold.breaches_warning_24h}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {selectedStation && thresholds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">{thresholds.length}</div>
                <div className="text-sm text-muted-foreground">Total Parameters</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive mb-2">
                  {thresholds.reduce((sum, t) => sum + t.breaches_critical_24h, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Critical Breaches (24h)</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-status-warning mb-2">
                  {thresholds.reduce((sum, t) => sum + t.unacknowledged_breaches, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Unacknowledged Alerts</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}