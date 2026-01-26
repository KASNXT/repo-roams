import { useEffect, useState } from "react";
import {
  Sliders,
  Power,
  Settings,
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
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/hooks/use-toast";
import { fetchStations, type Station as BackendStation } from "@/services/api";
import { normalizeKey } from "@/utils/lowercase";
import { UserDisplay } from "@/components/UserDisplay";
import { createLogger } from "@/utils/logger";
import axios from "axios";

// ✅ Create axios instance with auth token interceptor
const createAuthAxios = () => {
  const instance = axios.create({});
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Token ${token}`;
    }
    return config;
  });
  return instance;
};

// Local station type (UI-level)
interface Station {
  id: string;
  name: string;
  status: "online" | "offline";
}

// Control node type for ON/OFF operations
interface ControlNode {
  id: number;
  node_id: string;
  tag_name: string;
  description?: string;
  current_value: boolean;
}

const Control = () => {
  const logger = createLogger("Control");
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [controlNodes, setControlNodes] = useState<ControlNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingNodes, setLoadingNodes] = useState(false);
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

  // ✅ Load control nodes when station is selected
  useEffect(() => {
    if (!selectedStation) {
      setControlNodes([]);
      setSelectedNode(null);
      return;
    }

    const loadControlNodes = async () => {
      setLoadingNodes(true);
      try {
        // ✅ FIX: Get the actual station name, not the normalized key
        const actualStationName = stations.find((s) => s.id === selectedStation)?.name;
        if (!actualStationName) {
          setControlNodes([]);
          return;
        }

        const serverUrl = localStorage.getItem("roams_server_url") || "http://localhost:8000";
        const authAxios = createAuthAxios();
        
        const response = await authAxios.get<{ results: ControlNode[] }>(
          `${serverUrl}/api/opcua_node/`,
          {
            params: {
              client_config__station_name: actualStationName,
              is_control: "true",
              data_type: "Boolean",
            },
          }
        );
        
        const data = response.data;
        // Use the nodes returned from backend (already filtered by server)
        const controlNodesFiltered = data.results || [];
        
        setControlNodes(controlNodesFiltered);
        
        // Auto-select first node if available
        if (controlNodesFiltered.length > 0) {
          setSelectedNode(controlNodesFiltered[0].id);
        }
        
        logger.info(`✅ Loaded ${controlNodesFiltered.length} control nodes for ${actualStationName}`);
      } catch (error) {
        logger.error("Error loading control nodes", error);
        toast({
          title: "Error",
          description: "Could not load control nodes from backend.",
          variant: "destructive",
        });
        setControlNodes([]);
        setSelectedNode(null);
      } finally {
        setLoadingNodes(false);
      }
    };

    loadControlNodes();
  }, [selectedStation, toast]);

  const currentStation = stations.find((s) => s.id === selectedStation);

  // ---- Handle control node write operation ----
  const handleToggle = async (pressed: boolean) => {
    if (!currentStation) {
      toast({
        title: "Error",
        description: "Please select a station first.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedNode) {
      toast({
        title: "Error",
        description: "Please select a control node to operate.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get the selected node details
      const selectedNodeData = controlNodes.find((n) => n.id === selectedNode);
      if (!selectedNodeData) {
        throw new Error("Selected node not found");
      }

      // ✅ Write value to OPC UA node (1 for ON, 0 for OFF)
      const writeValue = pressed ? 1 : 0;
      const serverUrl = localStorage.getItem("roams_server_url") || "http://localhost:8000";
      const authAxios = createAuthAxios();
      
      await authAxios.post(
        `${serverUrl}/api/opcua_node/${selectedNode}/write/`,
        {
          value: writeValue,
          command: pressed ? "START" : "STOP",
        }
      );

      setIsRunning(pressed);
      toast({
        title: "Success",
        description: `✅ ${selectedNodeData.tag_name} turned ${pressed ? "ON" : "OFF"}`,
        variant: "default",
      });
      logger.info(
        `📤 Wrote value ${writeValue} to node: ${selectedNodeData.node_id}`
      );
    } catch (error: unknown) {
      logger.error("Error writing to node", error);
      
      let errorMessage = "Failed to control node";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as any;
        errorMessage = axiosError.response?.data?.error || 
                      axiosError.response?.data?.detail || 
                      axiosError.message ||
                      "Failed to control node";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: `${errorMessage}`,
        variant: "destructive",
      });
      setIsRunning(!pressed); // Revert toggle on error
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col max-h-screen overflow-y-auto">
          {/* ---- Header - Sticky on ALL screens ---- */}
          <header className="sticky top-0 z-50 flex flex-col md:flex-row h-auto md:h-16 shrink-0 gap-2 border-b bg-gradient-surface/95 backdrop-blur supports-[backdrop-filter]:bg-gradient-surface/80 px-4 py-2 md:py-0 shadow-sm">
            <div className="flex items-center gap-2 flex-1">
              <SidebarTrigger className="-ml-1" />
              <Sliders className="h-5 w-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-foreground truncate">Pump House</h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Station Control & Operations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <UserDisplay />
            </div>
          </header>

          {/* ---- Body - Scrollable ---- */}
          <div className="flex-1 overflow-y-auto p-2 md:p-6 space-y-4 md:space-y-6">
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
                      <SelectTrigger className="w-full md:w-64">
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

            {/* ✅ Control Node Selection */}
            {selectedStation && (
              <Card className="shadow-card border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-blue-600" />
                    Select Control Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">
                        Available Control Nodes
                      </label>
                      {loadingNodes ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 animate-spin" />
                          Loading control nodes...
                        </div>
                      ) : controlNodes.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No control nodes available for this station
                        </div>
                      ) : (
                        <Select
                          value={selectedNode ? String(selectedNode) : ""}
                          onValueChange={(value) =>
                            setSelectedNode(value ? parseInt(value) : null)
                          }
                          disabled={loadingNodes}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder="Choose a control node"
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {controlNodes.map((node) => (
                              <SelectItem key={node.id} value={String(node.id)}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{node.tag_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({node.node_id})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {selectedNode && (
                      <div className="flex items-center gap-2 ml-4">
                        <div className="bg-green-100 border border-green-300 rounded-lg px-3 py-2">
                          <p className="text-xs text-green-700 font-semibold">
                            ✓ Node Selected
                          </p>
                          <p className="text-xs text-green-600">
                            Ready to control
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Control Panel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start/Stop Toggle */}
                  <Card className={`border-2 transition-all duration-200 ${
                    isRunning ? "border-status-connected bg-status-connected/5" : "border-status-disconnected bg-status-disconnected/5"
                  } hover:shadow-lg`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className={`p-4 rounded-full ${
                          isRunning ? "bg-status-connected/20" : "bg-status-disconnected/20"
                        }`}>
                          <Power className={`h-12 w-12 ${
                            isRunning ? "text-status-connected" : "text-status-disconnected"
                          }`} />
                        </div>
                        <div className="text-center">
                          <h3 className="font-semibold mb-1">Station Operation</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Toggle pump operation on or off
                          </p>
                        </div>
                        <div className="flex items-center gap-4 w-full justify-center">
                          <span className={`text-sm font-medium ${
                            !isRunning ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            Off
                          </span>
                          <Toggle
                            pressed={isRunning}
                            onPressedChange={handleToggle}
                            disabled={loading || currentStation?.status === "offline"}
                            className={`data-[state=on]:bg-status-connected data-[state=on]:text-white ${
                              currentStation?.status === "offline" ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            size="lg"
                          >
                            {loading ? (
                              <Clock className="h-5 w-5 animate-spin" />
                            ) : (
                              <Power className="h-5 w-5" />
                            )}
                          </Toggle>
                          <span className={`text-sm font-medium ${
                            isRunning ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            On
                          </span>
                        </div>
                      </div>
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
