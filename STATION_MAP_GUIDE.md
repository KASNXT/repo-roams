# Station Map with Real-Time Monitoring - Implementation Guide

## 📋 Overview

The **StationMap** component provides an interactive geographic visualization of all ROAMS stations with real-time monitoring capabilities. It displays station locations, status, and key operational metrics directly on the map.

**Key Features:**
- 🗺️ Interactive Leaflet map with OpenStreetMap & Satellite imagery toggle
- 📍 Color-coded station markers (Connected/Faulty/Disconnected)
- 📊 Real-time data from OPC UA reads: pump status, current, flow rate, well level
- 🔄 Auto-refresh every 30 seconds
- 🎯 Click markers to view detailed station information
- 📱 Fully responsive design
- 🌙 Dark mode support

---

## 🏗️ Architecture

### Component Stack

```
StationMap.tsx
├── MapLayerSwitcher (toggles between street/satellite views)
├── StationPopupContent (displays detailed station data)
├── Backend API Integration
│   ├── /api/opcua_clientconfig/ (station locations & metadata)
│   └── /api/opcua_readlog/ (latest OPC UA tag readings)
└── Leaflet Map Components
    ├── MapContainer
    ├── TileLayer (dynamic based on satellite toggle)
    └── Marker (color-coded by status)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  StationMap Component                                        │
│                                                              │
│  useEffect() triggered on mount                              │
│  ↓                                                           │
│  Parallel API Calls (Promise-based)                         │
│  ├─ GET /api/opcua_clientconfig/?active=true               │
│  │  └─ Returns: Station names, coordinates, status, URLs    │
│  │                                                          │
│  └─ GET /api/opcua_readlog/?ordering=-timestamp            │
│     └─ Returns: Latest tag readings (pump, current, etc.)   │
│                                                              │
│  Data Processing                                             │
│  ├─ Match logs to stations by client_config ID             │
│  ├─ Extract latest values per tag                          │
│  └─ Build StationData objects with merged info             │
│                                                              │
│  Rendering                                                   │
│  ├─ Create color-coded markers on map                       │
│  ├─ Auto-center on first valid station                      │
│  └─ Attach popups with real-time data                       │
│                                                              │
│  Auto-Refresh                                                │
│  └─ setInterval(fetchStationsData, 30000) every 30 sec      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 UI Components

### 1. **Station Markers**

**Color Coding:**
- 🟢 **Green** - Station connected
- 🟠 **Orange** - Station faulty
- 🔴 **Red** - Station disconnected

**Marker Features:**
- Animated pulse effect on all markers
- White border with drop shadow
- 32x32 pixel size, auto-scalable
- Click to open detailed popup

### 2. **Station Popup**

**Content Sections:**
```
┌─────────────────────────────────┐
│ Station Name                     │  ← Station identifier
│ 🟢 Connected                     │  ← Connection status (colored)
├─────────────────────────────────┤
│ 📍 Coordinates                   │  ← Lat/Long (4 decimals)
├─────────────────────────────────┤
│ Endpoint: opc.tcp://...          │  ← OPC UA server URL
├─────────────────────────────────┤
│ 🔋 Real-Time Metrics             │
│ ⚡ Pump: Running/Off             │
│ ⚡ Current: 5.2 A                │
│ 📈 Flow: 120.5 L/min             │
│ 💧 Level: 2.3 m                  │
├─────────────────────────────────┤
│ Last connected: [timestamp]      │
└─────────────────────────────────┘
```

### 3. **Controls**

- **Satellite/Street Toggle** - Switch between imagery types
- **Refresh Button** - Manual data refresh with loading spinner
- **Station Counter** - Shows active stations on map

### 4. **Info Box**

Displays:
- Marker color meanings
- How to interact with markers
- Satellite view information
- Auto-update frequency
- Coordinate/endpoint availability

---

## 🔌 API Integration

### Data Sources

| Endpoint | Purpose | Fields Used |
|----------|---------|------------|
| `/api/opcua_clientconfig/` | Station metadata & coordinates | `id`, `station_name`, `latitude`, `longitude`, `connection_status`, `endpoint_url`, `last_connected` |
| `/api/opcua_readlog/` | Latest OPC UA tag values | `client_config`, `node`, `value`, `timestamp`, `node_details` |

### Request Parameters

**OPC UA Config:**
```bash
GET /api/opcua_clientconfig/?active=true
```
- Returns only active stations
- Includes coordinate data for mapping

**Read Logs:**
```bash
GET /api/opcua_readlog/?ordering=-timestamp&limit=1000
```
- Latest 1000 log entries (most recent first)
- Used to extract current tag values

### Response Processing

**Station Config Response:**
```json
{
  "id": 1,
  "station_name": "Pump Station Alpha",
  "latitude": 0.3476,
  "longitude": 32.5825,
  "connection_status": "Connected",
  "endpoint_url": "opc.tcp://server.local:4840",
  "last_connected": "2025-01-15T10:30:00Z"
}
```

**Read Log Response:**
```json
{
  "id": 101,
  "client_config": 1,
  "node": 5,
  "station_name": "Pump Station Alpha",
  "node_tag_name": "Pump_Status",
  "node_details": {
    "tag_name": "Pump_Status",
    "node_type": "boolean",
    "node_id": "ns=2;i=5001",
    "tag_units": ""
  },
  "value": "1",
  "timestamp": "2025-01-15T10:35:22Z"
}
```

---

## 📊 Real-Time Data Extraction

### Tag Detection Logic

The component uses **keyword matching** to extract metrics from tag names:

```typescript
// Pump Status Detection
Keywords: ["pump", "run", "motor"]
Example Tags: "Pump_Status", "Running", "Motor_1"

// Current Detection
Keywords: ["current", "amp", "amps"]
Example Tags: "Current_Phase_A", "Amps", "I_L1"

// Flow Rate Detection
Keywords: ["flow", "flowrate", "flow_rate"]
Example Tags: "Flow_Rate", "Flow_GPM", "Flowrate_LPM"

// Well Level Detection
Keywords: ["level", "water", "tank", "depth"]
Example Tags: "Water_Level", "Tank_Depth", "Well_Level"
```

**Value Parsing:**
- Pump: "1"/"true" = Running, else = Off
- Current/Flow/Level: Direct numeric display + unit from DB
- Fallback: "—" if tag not found

---

## 🗺️ Map Layers

### Street View (OpenStreetMap)
```
URL: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
Attribution: © OpenStreetMap contributors
```

### Satellite View (Esri World Imagery)
```
URL: https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
Attribution: © Esri, DigitalGlobe, Earthstar Geographics
```

### Layer Switcher Implementation

```tsx
useEffect(() => {
  // Remove existing TileLayer
  // Add new TileLayer based on isSatellite state
  // Component re-renders with new layer
}, [isSatellite, map])
```

---

## 🔄 Auto-Refresh Mechanism

### Polling Strategy

```typescript
// Initial load on component mount
useEffect(() => {
  fetchStationsData();
  
  // Set up 30-second polling
  const interval = setInterval(fetchStationsData, 30000);
  
  // Cleanup on unmount
  return () => clearInterval(interval);
}, []);
```

**Benefits:**
- Real-time data updates without WebSockets
- Server-friendly (30-second interval)
- Graceful cleanup prevents memory leaks
- User can manual refresh anytime

---

## 🎯 Integration with Overview Page

### Usage in Overview.tsx

```tsx
import { StationMap } from "@/components/StationMap";

export default function Overview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Station Map & Real-Time Monitoring</CardTitle>
      </CardHeader>
      <CardContent>
        <StationMap />
      </CardContent>
    </Card>
  );
}
```

**Result:**
- Replaces old hardcoded map with dynamic component
- Integrates with system status cards above
- Sits above uptime trend chart

---

## 🔧 Backend Model Requirements

### OpcUaClientConfig Model

**Required Fields for Mapping:**
- `id` - Station identifier
- `station_name` - Display name
- `latitude` - Geographic latitude (-90 to 90)
- `longitude` - Geographic longitude (-180 to 180)
- `connection_status` - Connected/Disconnected/Faulty
- `endpoint_url` - OPC UA server endpoint
- `last_connected` - Timestamp of last connection

### OpcUaReadLog Model

**Required Fields for Metrics:**
- `client_config_id` - FK to OpcUaClientConfig
- `node_id` - FK to OPCUANode
- `value` - Tag reading value
- `timestamp` - When value was read

### OPCUANode Model

**Required Fields:**
- `tag_name` - Human-readable tag name
- `node_type` - Data type (boolean, float, int)
- `node_id` - OPC UA node identifier
- `tag_units` - Unit of measurement (A, L/min, m, etc.)

---

## ⚙️ Serializer Enhancements

### OpcUaClientConfigSerializer

**Added Fields:**
```python
fields = [
    'id',
    'station_name',
    'endpoint_url',
    'active',
    'last_connected',
    'created_at',
    'connection_status',
    'security_policy',
    'latitude',        # ← NEW
    'longitude'        # ← NEW
]
```

### OpcUaReadLogSerializer

**Added Fields & Methods:**
```python
node_type = CharField(source="node.node_type", read_only=True)
node_details = SerializerMethodField()

def get_node_details(self, obj):
    return {
        'tag_name': obj.node.tag_name,
        'node_type': obj.node.node_type,
        'node_id': obj.node.node_id,
        'tag_units': obj.node.tag_units,
    }
```

---

## 🎨 Styling & Theming

### Color Scheme

**Light Mode:**
- Background: White
- Text: Dark gray
- Accents: Blue, green, orange, red

**Dark Mode:**
- Background: Dark gray/black
- Text: Light gray
- Accents: Brighter colors maintained

### Responsive Layout

```
Desktop (> 1024px):
┌──────────────────────────────────┐
│ [Satellite] [Refresh] 5 stations │
├──────────────────────────────────┤
│                                  │
│     [Interactive Map 400px high] │
│                                  │
├──────────────────────────────────┤
│ 📍 Map Features Info Box         │
└──────────────────────────────────┘

Mobile (< 640px):
┌────────────────────┐
│ [Sat] [Ref] 5 stn  │
├────────────────────┤
│                    │
│  [Map 400px high]  │
│                    │
├────────────────────┤
│ 📍 Features Info   │
└────────────────────┘
```

---

## 🛠️ Troubleshooting

### Issue: "No stations with coordinates found"

**Causes:**
- Stations have no latitude/longitude set
- No active stations in database
- API returns empty array

**Solution:**
1. Go to RTU Clients in Settings
2. Edit station and add coordinates
3. Ensure station has `active=true`
4. Click Refresh on map

### Issue: Markers not showing real-time data

**Causes:**
- OPC UA client not reading tags
- No OpcUaReadLog entries for station
- Tag keywords don't match

**Solution:**
1. Verify OPC UA connection is active
2. Check that nodes are being read (OpcUaReadLog table has entries)
3. Use tag names with clear keywords (Pump_Status, Current, Flow_Rate, Water_Level)

### Issue: Satellite view not loading

**Causes:**
- Esri service temporarily down
- Network connectivity issue
- Tile layer URL changed

**Solution:**
1. Switch back to street view and try again
2. Check browser console for CORS errors
3. Verify internet connection

---

## 📈 Performance Optimization

### API Call Optimization

| Strategy | Implementation | Benefit |
|----------|-----------------|---------|
| **Parallel Requests** | Promise-based | Faster load time |
| **Polling Interval** | 30 seconds | Balance between freshness and server load |
| **Log Limit** | 1000 latest entries | Reduces payload size |
| **Ordering** | `-timestamp` | Gets most recent values first |
| **Filtering** | `active=true` | Excludes inactive stations |

### Frontend Optimization

| Strategy | Implementation | Benefit |
|----------|-----------------|---------|
| **Lazy Loading** | React.lazy for map | Faster initial page load |
| **Cleanup** | clearInterval on unmount | Prevents memory leaks |
| **State Batching** | Single setState | Reduces re-renders |
| **Icon Caching** | SVG via divIcon | No network requests for markers |

---

## 🔐 Security Considerations

### Authentication

- All API calls require `IsAuthenticated` permission
- Token automatically attached via Axios interceptor
- Frontend stored in localStorage

### Data Protection

- Coordinates public (maps are public)
- Real-time metrics protected by authentication
- Connection status available to authenticated users only

### Rate Limiting

- Polling every 30 seconds (standard)
- Manual refresh always available
- No throttling on single user

---

## 📚 API Endpoints Used

### GET /api/opcua_clientconfig/
**Permission:** IsAuthenticated, IsFrontendApp
**Query Params:** `?active=true`
**Response:** List of OpcUaClientConfig objects
**Fields:** id, station_name, latitude, longitude, connection_status, endpoint_url, last_connected

### GET /api/opcua_readlog/
**Permission:** IsAuthenticated, IsFrontendApp
**Query Params:** `?ordering=-timestamp&limit=1000`
**Response:** List of OpcUaReadLog objects with node_details
**Fields:** id, client_config, node, value, timestamp, node_details

---

## 🚀 Future Enhancements

1. **Real-time Updates via WebSocket**
   - Replace polling with push notifications
   - Reduce latency to < 1 second

2. **Click to Drill-Down**
   - Click station marker → Station detail page
   - View full node list, historical data, controls

3. **Geofencing**
   - Draw zones on map
   - Alert when stations move outside zones

4. **Historical Playback**
   - Replay station movement/status over time
   - Visualize outages on timeline

5. **Export/Share**
   - Export map as image/PDF
   - Share map URL with stakeholders

6. **Custom Base Maps**
   - User-selectable map styles
   - Custom tile layer upload

---

## 📝 Maintenance & Monitoring

### Logs to Monitor

- Browser console: Map loading errors, API timeouts
- Backend logs: Serializer errors, API response times
- Client browser: Network tab for API calls

### Key Metrics

- Average API response time: < 500ms
- Map render time: < 1s
- Data freshness: 30-second max staleness
- Marker accuracy: Depends on GPS coordinates

### Regular Tasks

- Verify coordinates are being saved in admin
- Check OPC UA clients are collecting reads
- Monitor API performance
- Test satellite layer periodically

---

## 📚 Files Modified

| File | Changes | Status |
|------|---------|--------|
| `src/components/StationMap.tsx` | **NEW** - Full component implementation | ✅ Created |
| `src/pages/Overview.tsx` | Import & integrate StationMap component | ✅ Updated |
| `roams_api/serializers.py` | Added latitude/longitude & node_details | ✅ Enhanced |

---

**Last Updated:** January 2025
**Component Status:** ✅ Production Ready
**Version:** 1.0.0

