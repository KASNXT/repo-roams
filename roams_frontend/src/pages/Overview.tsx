import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MapPin, AlertTriangle, Activity, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import * as L from 'leaflet';
import axios from "axios";

// ✅ Custom marker icons (fixes missing default icon issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Station {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  last_seen: string;
}

const Overview = () => {
  const [uptimeData, setUptimeData] = useState<any[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [overallUptime, setOverallUptime] = useState<number>(0);

  // ✅ Fetch uptime data
 useEffect(() => {
  axios.get<any>("/api/system-uptime/")
    .then((res) => {
      setOverallUptime(res.data.overall_uptime);

      const chartData = Object.entries(res.data.uptime || {}).map(
        ([name, uptime]) => ({
          name,
          uptime,
        })
      );

      setUptimeData(chartData);
    })
    .catch((err) => console.error("Uptime fetch error:", err));
}, []);


  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-background">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-gradient-to-r from-primary/5 to-primary/10 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">ROAMS - Overview</h1>
                <p className="text-xs text-muted-foreground">
                  System Overview & Performance Summary
                </p>
              </div>
            </div>
          </header>

          {/* Body */}
          <div className="flex-1 p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Stations</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stations.length}</div>
                  <p className="text-xs text-muted-foreground">Active monitored sites</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallUptime}%</div>
                  <p className="text-xs text-muted-foreground">Last 7 days average</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">5</div>
                  <p className="text-xs text-muted-foreground">2 critical / 3 warnings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Server Status</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Online</div>
                  <p className="text-xs text-muted-foreground">Running normally</p>
                </CardContent>
              </Card>
            </div>

            {/* OpenStreetMap Section */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Station Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 w-full rounded-lg overflow-hidden border">
                  <MapContainer
                    center={[0.3476, 32.5825]} // Kampala default
                    zoom={7}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap contributors"
                    />
                    {stations.map((station) => (
                      <Marker
                        key={station.id}
                        position={[station.latitude, station.longitude]}
                      >
                        <Popup>
                          <div className="text-sm">
                            <strong>{station.name}</strong> <br />
                            Status:{" "}
                            <span
                              className={
                                station.status === "Online"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {station.status}
                            </span>{" "}
                            <br />
                            Last seen: {new Date(station.last_seen).toLocaleString()}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>

            {/* Uptime Trend Chart */}
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Uptime Trend</CardTitle>
                <Button size="sm" variant="outline">
                  View Full Analysis
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={uptimeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[90, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="uptime"
                        stroke="#16a34a"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Overview;
