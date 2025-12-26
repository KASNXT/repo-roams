import { useEffect, useState } from "react";
import {
  Sliders,
  Power,
  Settings,
  Play,
  Square,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fetchStations, type Station as BackendStation } from "@/services/api";
import { normalizeKey } from "@/utils/lowercase";
import { UserDisplay } from "@/components/UserDisplay";

// Local station type (UI-level)
interface Station {
  id: string;
  name: string;
  status: "online" | "offline";
}

const Control = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStations, setLoadingStations] = useState(true);
  const { toast } = useToast();

  // ✅ Load OPC UA clients (stations) from backend
  useEffect(() => {
    const loadStations = async () => {
      setLoadingStations(true);
      try {
        const backendStations: BackendStation[] = await fetchStations();

        // Map backend station data into UI-friendly format
        const parsedStations: Station[] = backendStations.map((station) => ({
          id: normalizeKey(station.station_name),
          name: station.station_name,
          status:
            station.connection_status === "connected" ||
            station.connection_status === "Online" ||
            station.connection_status === "True" ||
            station.active === true
              ? "online"
              : "offline",
        }));

        setStations(parsedStations);

        // Auto-select the first available station
        if (parsedStations.length > 0) {
          setSelectedStation(parsedStations[0].id);
        }
      } catch (error) {
        console.error("❌ Failed to fetch stations:", error);
        toast({
          title: "Error",
          description: "Could not load OPC UA station data from backend.",
          variant: "destructive",
        });
      } finally {
        setLoadingStations(false);
      }
    };

    loadStations();
  }, [toast]);

  const currentStation = stations.find((s) => s.id === selectedStation);

  // ---- Simulated control commands ----
  const handleStart = async () => {
    if (!currentStation) return;
    setLoading(true);
    setTimeout(() => {
      setIsRunning(true);
      setLoading(false);
      toast({
        title: "Station Started",
        description: `${currentStation.name} started successfully.`,
      });
    }, 1200);
  };

  const handleStop = async () => {
    if (!currentStation) return;
    setLoading(true);
    setTimeout(() => {
      setIsRunning(false);
      setLoading(false);
      toast({
        title: "Station Stopped",
        description: `${currentStation.name} stopped successfully.`,
      });
    }, 1200);
  };

  const handleReset = async () => {
    if (!currentStation) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Station Reset",
        description: `${currentStation.name} reset successfully.`,
      });
    }, 1000);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* ---- Header ---- */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-gradient-surface px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 flex-1">
              <Sliders className="h-5 w-5" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Pump House</h1>
                <p className="text-xs text-muted-foreground">
                  Station Control & Operations
                </p>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                 <UserDisplay />
              </div>
            </div>
          </header>

          {/* ---- Body ---- */}
          <div className="flex-1 p-6 space-y-6">
            {/* Station Selection */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-5 w-5 text-primary" />
                  Station Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Select Station
                    </label>
                    <Select
                      value={selectedStation}
                      onValueChange={setSelectedStation}
                      disabled={loadingStations}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue
                          placeholder={
                            loadingStations
                              ? "Loading stations..."
                              : "Select station"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingStations ? (
                          <div className="p-3 text-muted-foreground text-sm">
                            Loading stations...
                          </div>
                        ) : stations.length === 0 ? (
                          <div className="p-3 text-muted-foreground text-sm">
                            No stations found
                          </div>
                        ) : (
                          stations.map((station) => (
                            <SelectItem key={station.id} value={station.id}>
                              <div className="flex items-center gap-2">
                                {station.name}
                                <Badge
                                  variant={
                                    station.status === "online"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="text-xs"
                                >
                                  {station.status}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {currentStation && (
                    <div className="flex items-center gap-2 ml-8">
                      <div className="flex items-center gap-2">
                        {currentStation.status === "online" ? (
                          <CheckCircle className="h-4 w-4 text-status-connected" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-status-disconnected" />
                        )}
                        <span className="text-sm font-medium">
                          {currentStation.name}
                        </span>
                      </div>
                      <Badge
                        variant={isRunning ? "default" : "outline"}
                        className={
                          isRunning ? "bg-status-connected text-white" : ""
                        }
                      >
                        {isRunning ? "Running" : "Stopped"}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ---- Control Panel ---- */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Control Panel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Start */}
                  <Card className="border-status-connected hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <CardContent className="p-6 text-center">
                      <Play className="h-12 w-12 text-status-connected mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Start Station</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Initiate pump operation and begin water flow
                      </p>
                      <Button
                        onClick={handleStart}
                        disabled={
                          loading ||
                          isRunning ||
                          currentStation?.status === "offline"
                        }
                        className="w-full bg-status-connected hover:bg-status-connected/90"
                      >
                        {loading ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Stop */}
                  <Card className="border-status-disconnected hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <CardContent className="p-6 text-center">
                      <Square className="h-12 w-12 text-status-disconnected mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Stop Station</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Safely shut down pump operation
                      </p>
                      <Button
                        onClick={handleStop}
                        disabled={
                          loading ||
                          !isRunning ||
                          currentStation?.status === "offline"
                        }
                        variant="destructive"
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Stopping...
                          </>
                        ) : (
                          <>
                            <Square className="h-4 w-4 mr-2" />
                            Stop
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Reset */}
                  <Card className="border-status-warning hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <CardContent className="p-6 text-center">
                      <RotateCcw className="h-12 w-12 text-status-warning mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Reset Station</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Clear alarms and reset system state
                      </p>
                      <Button
                        onClick={handleReset}
                        disabled={loading || currentStation?.status === "offline"}
                        variant="outline"
                        className="w-full border-status-warning text-status-warning hover:bg-status-warning hover:text-white"
                      >
                        {loading ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Control;
