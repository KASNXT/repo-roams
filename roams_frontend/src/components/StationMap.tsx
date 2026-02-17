import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from 'leaflet';
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Loader2, Satellite, MapPin, Zap, Droplets, TrendingUp, AlertCircle, Maximize2, RotateCcw, Expand } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// ✅ Custom marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface StationTag {
  id: number;
  tag_name: string;
  value: string | number;
  timestamp: string;
  node_type?: string;
}

interface StationData {
  id: number;
  station_name: string;
  latitude: number;
  longitude: number;
  connection_status: "Connected" | "Disconnected" | "Faulty";
  endpoint_url: string;
  last_connected: string;
  pump_status?: string;
  current?: number;
  flowrate?: number;
  well_level?: number;
  tags?: StationTag[];
}

interface MapProviderProps {
  isSatellite: boolean;
}

// 🗺️ Layer switcher component
const MapLayerSwitcher = ({ isSatellite }: MapProviderProps) => {
  const map = useMap();

  useEffect(() => {
    // Remove existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    // Add new layer based on satellite toggle
    if (isSatellite) {
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: '&copy; Esri, DigitalGlobe, Earthstar Geographics',
      }).addTo(map);
    } else {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
    }
  }, [isSatellite, map]);

  return null;
};

// 🎯 Custom marker icon based on status
const createStationIcon = (status: string) => {
  const color = status === "Connected" ? "#10b981" : status === "Faulty" ? "#f97316" : "#ef4444";
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      ">
        📍
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// 📍 Station popup content
const StationPopupContent = ({ station }: { station: StationData }) => {
  // Extract pump status and metrics from tags
  const getPumpStatus = () => {
    const pumpTag = station.tags?.find(t =>
      t.tag_name.toLowerCase().includes("pump") ||
      t.tag_name.toLowerCase().includes("run") ||
      t.tag_name.toLowerCase().includes("motor")
    );
    return pumpTag ? (pumpTag.value === "1" || pumpTag.value === "true" ? "Running" : "Off") : "Unknown";
  };

  const getTagValue = (keywords: string[]) => {
    return station.tags?.find(t =>
      keywords.some(k => t.tag_name.toLowerCase().includes(k))
    )?.value || "—";
  };

  const pumpStatus = getPumpStatus();
  const current = getTagValue(["current", "amp", "amps"]);
  const flowrate = getTagValue(["flow", "flowrate", "flow_rate"]);
  const wellLevel = getTagValue(["level", "water", "tank", "depth"]);

  const statusColor =
    station.connection_status === "Connected"
      ? "text-green-600"
      : station.connection_status === "Faulty"
        ? "text-orange-600"
        : "text-red-600";

  return (
    <div className="w-64 p-3 space-y-3">
      {/* Station Header */}
      <div className="border-b pb-2">
        <h3 className="font-bold text-sm">{station.station_name}</h3>
        <p className={`text-xs font-semibold ${statusColor}`}>
          {station.connection_status === "Connected" ? "🟢" : "🔴"} {station.connection_status}
        </p>
      </div>

      {/* Coordinates */}
      <div className="flex items-center gap-2 text-xs">
        <MapPin className="h-3 w-3 text-blue-600" />
        <span>{station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}</span>
      </div>

      {/* Real-Time Data Grid */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900 dark:to-cyan-900 text-gray-800 dark:text-gray-100 p-2 rounded space-y-2">
        {/* Pump Status */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-600 dark:text-yellow-400" /> Pump
          </span>
          <span className={`font-bold ${pumpStatus === "Running" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {pumpStatus}
          </span>
        </div>

        {/* Current */}
        {current !== "—" && (
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1">
              <Zap className="h-3 w-3 text-red-500 dark:text-red-400" /> Current
            </span>
            <span className="font-mono text-gray-700 dark:text-gray-200">{current} A</span>
          </div>
        )}

        {/* Flow Rate */}
        {flowrate !== "—" && (
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-500 dark:text-blue-400" /> Flow
            </span>
            <span className="font-mono text-gray-700 dark:text-gray-200">{flowrate} m³/h</span>
          </div>
        )}

        {/* Well Level */}
        {wellLevel !== "—" && (
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1">
              <Droplets className="h-3 w-3 text-cyan-500 dark:text-cyan-400" /> Level
            </span>
            <span className="font-mono text-gray-700 dark:text-gray-200">{wellLevel} m</span>
          </div>
        )}
      </div>

      {/* Last Connected */}
      <div className="text-xs text-gray-600 dark:text-gray-400">
        <p className="text-gray-500">Last connected:</p>
        <p>{new Date(station.last_connected).toLocaleString()}</p>
      </div>
    </div>
  );
};

// 🔍 Zoom level persistence handler
const ZoomHandler = ({ onZoomChange }: { onZoomChange: (zoom: number) => void }) => {
  const map = useMap();

  useEffect(() => {
    const handleZoom = () => {
      onZoomChange(map.getZoom());
    };

    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map, onZoomChange]);

  return null;
};

// 🏷️ Marker with hover tooltip component
const MarkerWithTooltip = ({ station }: { station: StationData }) => {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.bindTooltip(station.station_name, {
        permanent: false,
        direction: "top",
        offset: [0, -10],
      });
    }
  }, [station.station_name]);

  return (
    <Marker
      key={station.id}
      position={[station.latitude, station.longitude]}
      icon={createStationIcon(station.connection_status)}
      ref={markerRef}
    >
      <Popup>
        <StationPopupContent station={station} />
      </Popup>
    </Marker>
  );
};

// ✅ Helper to show stations only with database coordinates
interface StationMapProps {
  fullPage?: boolean;
}

export const StationMap = ({ fullPage = false }: StationMapProps) => {
  const navigate = useNavigate();
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSatellite, setIsSatellite] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0.3476, 32.5825]); // Kampala default
  const [zoom, setZoom] = useState<number>(() => {
    // Load zoom from localStorage on mount
    const saved = localStorage.getItem("roams_map_zoom");
    return saved ? parseInt(saved) : 11;
  });

  // Save zoom level to localStorage whenever it changes
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    localStorage.setItem("roams_map_zoom", newZoom.toString());
  };

  // Reset zoom to default
  const resetZoom = () => {
    handleZoomChange(11);
  };

  // 📡 Fetch stations with real-time data
  const fetchStationsData = async () => {
    try {
      setLoading(true);

      // Fetch active stations with coordinates
      const stationsRes = await api.get("opcua_clientconfig/", {
        params: { active: true },
      });

      // Fetch latest read logs for tags
      const logsRes = await api.get("opcua_readlog/", {
        params: { ordering: "-timestamp", limit: 1000 },
      });

      // Build stations with data - Use database coordinates first, fallback to calculated positions
      // Handle both array and paginated responses
      const stationsArray = Array.isArray(stationsRes.data)
        ? stationsRes.data
        : (stationsRes.data as any).results || [];
      
      const stationsWithData: StationData[] = stationsArray
        .map((station: any, index: number) => {
          // ✅ PRIORITY 1: Use database coordinates if available
          let latitude = station.latitude;
          let longitude = station.longitude;
          let hasValidCoords = Boolean(latitude && longitude);
          
          // ⚠️ FALLBACK: If no coordinates in database, distribute around Kampala for visualization
          if (!hasValidCoords) {
            const radius = 0.1; // ~10km radius
            const angle = (index / stationsArray.length) * 2 * Math.PI;
            latitude = 0.3476 + radius * Math.cos(angle);
            longitude = 32.5825 + radius * Math.sin(angle);
            console.warn(
              `⚠️ Station "${station.station_name}" has no GPS coordinates in database - placing at calculated position: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            );
          } else {
            console.log(`✅ Station "${station.station_name}" using database coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
          
          // Group latest values by node for this station
          // Handle both array and paginated logs response
          const logsArray = Array.isArray(logsRes.data)
            ? logsRes.data
            : (logsRes.data as any).results || [];
          
          const stationLogs = logsArray.filter(
            (log: any) => log.client_config === station.id
          );

          // Get unique latest values for each node
          const latestTags: { [key: number]: StationTag } = {};
          stationLogs.forEach((log: any) => {
            if (!latestTags[log.node] || new Date(log.timestamp) > new Date(latestTags[log.node].timestamp)) {
              latestTags[log.node] = {
                id: log.node,
                tag_name: log.node_details?.tag_name || `Node ${log.node}`,
                value: log.value,
                timestamp: log.timestamp,
                node_type: log.node_details?.node_type,
              };
            }
          });

          return {
            id: station.id,
            station_name: station.station_name,
            latitude: latitude,
            longitude: longitude,
            connection_status: station.connection_status,
            endpoint_url: station.endpoint_url,
            last_connected: station.last_connected || new Date().toISOString(),
            tags: Object.values(latestTags),
          };
        });

      setStations(stationsWithData);

      // Auto-center map to first station
      if (stationsWithData.length > 0) {
        setMapCenter([stationsWithData[0].latitude, stationsWithData[0].longitude]);
      }

      // Notify user if some stations are missing coordinates
      const stationsWithoutCoords = stationsArray.filter(
        (s) => !s.latitude || !s.longitude
      );
      if (stationsWithoutCoords.length > 0) {
        const missingNames = stationsWithoutCoords.map((s) => s.station_name).join(", ");
        toast.warning(
          `⚠️  ${stationsWithoutCoords.length} station(s) missing GPS coordinates - displaying at calculated positions. Please add latitude/longitude in admin settings for accurate map placement.`,
          { duration: 6000 }
        );
      }

      if (stationsWithData.length === 0) {
        toast.info("No active stations found. Please add stations in admin settings.");
      }
    } catch (error) {
      console.error("Error fetching stations:", error);
      toast.error("Failed to load station data");
    } finally {
      setLoading(false);
    }
  };

  // ♻️ Initial load and polling
  useEffect(() => {
    fetchStationsData();
    const interval = setInterval(fetchStationsData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={fullPage ? "h-full w-full flex flex-col" : "space-y-3"}>
      {/* Controls */}
      <div className={fullPage ? "border-b p-2 md:p-4 bg-card shadow-sm flex items-center gap-1 md:gap-2 flex-wrap" : "flex items-center gap-1 md:gap-2 flex-wrap"}>
        {/* Street/Satellite Toggle */}
        <Button
          onClick={() => setIsSatellite(!isSatellite)}
          variant={isSatellite ? "default" : "outline"}
          size="sm"
          title={isSatellite ? "Switch to Street view" : "Switch to Satellite view"}
          className="hidden sm:flex gap-2"
        >
          <Satellite className="h-4 w-4" />
          <span className="hidden md:inline">{isSatellite ? "Satellite" : "Street"}</span>
        </Button>
        
        {/* Icon-only version for mobile */}
        <Button
          onClick={() => setIsSatellite(!isSatellite)}
          variant={isSatellite ? "default" : "outline"}
          size="icon"
          title={isSatellite ? "Switch to Street view" : "Switch to Satellite view"}
          className="sm:hidden h-9 w-9"
        >
          <Satellite className="h-4 w-4" />
        </Button>

        {/* Refresh Button */}
        <Button
          onClick={fetchStationsData}
          variant="outline"
          size="sm"
          disabled={loading}
          title="Refresh map data"
          className="hidden sm:flex gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          <span className="hidden md:inline">{loading ? "Loading..." : "Refresh"}</span>
        </Button>
        
        {/* Icon-only refresh for mobile */}
        <Button
          onClick={fetchStationsData}
          variant="outline"
          size="icon"
          disabled={loading}
          title="Refresh map data"
          className="sm:hidden h-9 w-9"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </Button>

        {/* Reset Zoom Button */}
        <Button
          onClick={resetZoom}
          variant="outline"
          size="sm"
          title="Reset map zoom to default level"
          className="hidden sm:flex gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="hidden md:inline">Reset Zoom</span>
        </Button>
        
        {/* Icon-only reset zoom for mobile */}
        <Button
          onClick={resetZoom}
          variant="outline"
          size="icon"
          title="Reset map zoom to default level"
          className="sm:hidden h-9 w-9"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        {/* Full View Button */}
        {!fullPage && (
          <>
            <Button
              onClick={() => navigate("/map")}
              variant="outline"
              size="sm"
              title="Open map in fullscreen"
              className="hidden sm:flex gap-2"
            >
              <Expand className="h-4 w-4" />
              <span className="hidden md:inline">Full View</span>
            </Button>
            
            {/* Icon-only full view for mobile */}
            <Button
              onClick={() => navigate("/map")}
              variant="outline"
              size="icon"
              title="Open map in fullscreen"
              className="sm:hidden h-9 w-9"
            >
              <Expand className="h-4 w-4" />
            </Button>
          </>
        )}

        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
          {stations.length} station{stations.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Map Container */}
      <div className={fullPage ? "flex-1 overflow-hidden w-full" : "h-96 w-full rounded-lg overflow-hidden border border-border bg-muted"}>
        {loading && stations.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading map...</span>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={zoom}
            style={{ height: "100%", width: "100%" }}
          >
            {/* Zoom persistence handler */}
            <ZoomHandler onZoomChange={handleZoomChange} />

            {/* Layer Switcher */}
            <MapLayerSwitcher isSatellite={isSatellite} />

            {/* Initial layer (will be replaced by MapLayerSwitcher) */}
            {!isSatellite && (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
            )}

            {/* Station Markers with Tooltips */}
            {stations.map((station) => (
              <MarkerWithTooltip key={station.id} station={station} />
            ))}

            {/* Empty state */}
            {stations.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-lg text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No stations with coordinates</p>
                </div>
              </div>
            )}
          </MapContainer>
        )}
      </div>

      {/* Info Box */}
      {!fullPage && (
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-xs space-y-1">
          <p className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <MapPin className="h-3 w-3" /> Map Features
          </p>
          <ul className="text-blue-800 dark:text-blue-200 space-y-1 ml-5 list-disc">
            <li><strong>Color-coded markers:</strong> 🟢 Connected, 🟠 Faulty, 🔴 Disconnected</li>
            <li><strong>Click markers</strong> to view real-time data: pump status, current, flow rate, well level</li>
            <li><strong>Toggle satellite view</strong> for satellite imagery</li>
            <li><strong>Auto-updates</strong> every 30 seconds from latest OPC UA reads</li>
            <li><strong>Coordinates & endpoints</strong> displayed in popup for reference</li>
          </ul>
        </div>
      )}
    </div>
  );
};
