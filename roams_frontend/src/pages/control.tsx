import { useState } from "react";
import { Sliders } from "lucide-react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
//import { UserDisplay } from "@/components/UserDisplay";
import { 
  Settings, 
  Play, 
  Square, 
  RotateCcw, 
  Power, 
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Control = () => {
  const [selectedStation, setSelectedStation] = useState("station-alpha");
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Mock station data
  const stations = [
    { id: "station-alpha", name: "Station Alpha", status: "online" },
    { id: "station-beta", name: "Station Beta", status: "offline" },
    { id: "station-gamma", name: "Station Gamma", status: "online" },
  ];

  const currentStation = stations.find(s => s.id === selectedStation);

  const handleStart = async () => {
    setLoading(true);
    // Simulate OPC UA write operation
    setTimeout(() => {
      setIsRunning(true);
      setLoading(false);
      toast({
        title: "Station Started",
        description: `${currentStation?.name} has been started successfully`,
      });
    }, 2000);
  };

  const handleStop = async () => {
    setLoading(true);
    // Simulate OPC UA write operation
    setTimeout(() => {
      setIsRunning(false);
      setLoading(false);
      toast({
        title: "Station Stopped",
        description: `${currentStation?.name} has been stopped successfully`,
      });
    }, 2000);
  };

  const handleReset = async () => {
    setLoading(true);
    // Simulate OPC UA write operation
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Station Reset",
        description: `${currentStation?.name} has been reset successfully`,
      });
    }, 1500);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-gradient-surface px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 flex-1">
              <Sliders className="h-5 w-5" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Pump House</h1>
                <p className="text-xs text-muted-foreground">Station Control & Operations</p>
              </div>
            </div>
            {/* <UserDisplay /> */}
          </header>

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
                    <label className="text-sm font-medium mb-2 block">Select Station</label>
                    <Select value={selectedStation} onValueChange={setSelectedStation}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map((station) => (
                          <SelectItem key={station.id} value={station.id}>
                            <div className="flex items-center gap-2">
                              {station.name}
                              <Badge 
                                variant={station.status === 'online' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {station.status}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {currentStation && (
                    <div className="flex items-center gap-2 ml-8">
                      <div className="flex items-center gap-2">
                        {currentStation.status === 'online' ? (
                          <CheckCircle className="h-4 w-4 text-status-connected" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-status-disconnected" />
                        )}
                        <span className="text-sm font-medium">{currentStation.name}</span>
                      </div>
                      <Badge 
                        variant={isRunning ? 'default' : 'outline'}
                        className={isRunning ? 'bg-status-connected text-white' : ''}
                      >
                        {isRunning ? 'Running' : 'Stopped'}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Control Panel */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Control Panel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Start Button */}
                  <Card className="border-status-connected hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <CardContent className="p-6 text-center">
                      <Play className="h-12 w-12 text-status-connected mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Start Station</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Initiate pump operation and begin water flow
                      </p>
                      <Button 
                        onClick={handleStart}
                        disabled={loading || isRunning || currentStation?.status === 'offline'}
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

                  {/* Stop Button */}
                  <Card className="border-status-disconnected hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <CardContent className="p-6 text-center">
                      <Square className="h-12 w-12 text-status-disconnected mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Stop Station</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Safely shut down pump operation
                      </p>
                      <Button 
                        onClick={handleStop}
                        disabled={loading || !isRunning || currentStation?.status === 'offline'}
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

                  {/* Reset Button */}
                  <Card className="border-status-warning hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <CardContent className="p-6 text-center">
                      <RotateCcw className="h-12 w-12 text-status-warning mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Reset Station</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Clear alarms and reset system state
                      </p>
                      <Button 
                        onClick={handleReset}
                        disabled={loading || currentStation?.status === 'offline'}
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

            {/* OPC UA Status */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Bore Hole Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-status-connected/10">
                    <CheckCircle className="h-6 w-6 text-status-connected" />
                    <div>
                      <p className="font-medium">Server Connection</p>
                      <p className="text-sm text-muted-foreground">Connected</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-status-connected/10">
                    <CheckCircle className="h-6 w-6 text-status-connected" />
                    <div>
                      <p className="font-medium">Node Subscription</p>
                      <p className="text-sm text-muted-foreground">Active (24 nodes)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-status-connected/10">
                    <CheckCircle className="h-6 w-6 text-status-connected" />
                    <div>
                      <p className="font-medium">Write Permissions</p>
                      <p className="text-sm text-muted-foreground">Enabled</p>
                    </div>
                  </div>
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