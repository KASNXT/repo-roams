# Station Map - Visual Feature Guide

## 🗺️ Map Overview

```
╔════════════════════════════════════════════════════════════════╗
║                    ROAMS - Overview Page                       ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  System Status Cards (Cards with real data)                   ║
║  ┌─────────┬─────────┬─────────┬─────────┐                   ║
║  │ Active  │ System  │ System  │ Django  │                   ║
║  │Stations │ Uptime  │ Alarms  │ Server  │                   ║
║  │   5     │ 95.2%   │   2     │ Online  │                   ║
║  └─────────┴─────────┴─────────┴─────────┘                   ║
║                                                                ║
║  ┌─ Station Map & Real-Time Monitoring ─────────────────┐   ║
║  │                                                        │   ║
║  │  [Satellite] [Refresh] 5 stations                      │   ║
║  │  ┌──────────────────────────────────────────────────┐ │   ║
║  │  │                                                  │ │   ║
║  │  │         🟢 Station Alpha                         │ │   ║
║  │  │                   (marker)                       │ │   ║
║  │  │      🟠 Station Beta                             │ │   ║
║  │  │                                                  │ │   ║
║  │  │         🟢 Station Gamma                         │ │   ║
║  │  │                                                  │ │   ║
║  │  │     © OpenStreetMap contributors                │ │   ║
║  │  └──────────────────────────────────────────────────┘ │   ║
║  │                                                        │   ║
║  │  📍 Map Features                                        │   ║
║  │  • 🟢 Green = Connected  🟠 Orange = Faulty           │   ║
║  │  • 🔴 Red = Disconnected                              │   ║
║  │  • Click markers to view real-time data               │   ║
║  │  • Auto-updates every 30 seconds                      │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  ┌─ Uptime Trend ─────────────────────────────────────────┐  ║
║  │ [View Full Analysis]                                  │  ║
║  │                                                        │  ║
║  │    100│    ╱╲                                          │  ║
║  │       │   ╱  ╲                                         │  ║
║  │     95│  ╱    ╲_                                       │  ║
║  │       │ ╱       ╲_____                                │  ║
║  │     90│                                               │  ║
║  │       └─────────────────────────────────────────────  │  ║
║  │       Station names                                   │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🎯 Marker Types

### Connected Station (🟢 Green)
```
    ┌─────────────┐
    │  🟢 Active  │ ← Green circle
    │  Station    │ ← Pulsing
    │   Name      │ ← White border
    └─────────────┘
```

### Faulty Station (🟠 Orange)
```
    ┌─────────────┐
    │  🟠 Warning │ ← Orange circle
    │  Station    │ ← Pulsing  
    │   Name      │ ← White border
    └─────────────┘
```

### Disconnected Station (🔴 Red)
```
    ┌─────────────┐
    │  🔴 Offline │ ← Red circle
    │  Station    │ ← Pulsing
    │   Name      │ ← White border
    └─────────────┘
```

---

## 📍 Popup Window Layout

### When User Clicks a Marker:

```
┌─────────────────────────────────────────┐
│                                         │
│  Station Alpha              [✕ Close]   │
│  🟢 Connected                           │
├─────────────────────────────────────────┤
│                                         │
│  📍 Coordinates                         │
│  0.3476, 32.5825                        │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Endpoint: opc.tcp://server.local:4840 │
│                                         │
├─────────────────────────────────────────┤
│  ⚡ Pump: Running      🟢 Active        │
│  ⚡ Current: 5.2 A                      │
│  📈 Flow: 120.5 L/min                   │
│  💧 Level: 2.3 m                        │
├─────────────────────────────────────────┤
│                                         │
│  Last connected:                        │
│  2025-01-15 10:35:22 UTC               │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎨 Controls & Features

### Top Controls:
```
╔══════════════════════════════════════════════════════╗
│  [🛰️ Satellite] [🔄 Refresh ⟳] ← 5 stations →      │
└──────────────────────────────────────────────────────┘
  ↓                    ↓                    ↓
  Toggle              Manual               Station
  map view            refresh              count
```

### Info Box:
```
╔════════════════════════════════════════════════════╗
║ 📍 Map Features                                    ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║ • Color-coded markers:                             ║
║   🟢 Connected, 🟠 Faulty, 🔴 Disconnected        ║
║                                                    ║
║ • Click markers to view real-time data:            ║
║   pump status, current, flow rate, well level      ║
║                                                    ║
║ • Toggle satellite view for satellite imagery      ║
║                                                    ║
║ • Auto-updates every 30 seconds from latest        ║
║   OPC UA reads                                     ║
║                                                    ║
║ • Coordinates & endpoints displayed in popup      ║
║   for reference                                    ║
╚════════════════════════════════════════════════════╝
```

---

## 🎯 Data Display Hierarchy

### Marker (First Level)
```
🟢 Red/Orange/Green circle
 ↓
 Station has a status
 (Connected/Faulty/Disconnected)
```

### Popup (Second Level - Click to View)
```
Station Header
├─ Name
└─ Status (colored)

Geographic Info
├─ Latitude, Longitude  
└─ Map coordinates

Connection Info
├─ OPC UA Endpoint
└─ Server location

Real-Time Metrics
├─ 💡 Pump Status (Running/Off)
├─ ⚡ Current (Amperage)
├─ 📈 Flow Rate (L/min)
└─ 💧 Well Level (meters)

Connection History
└─ Last connected timestamp
```

---

## 🔄 Satellite View Toggle

### Street View (Default)
```
╔────────────────────────────────╗
│  [Street ↔ Satellite]          │
│  ┌──────────────────────────┐  │
│  │                          │  │
│  │  OpenStreetMap view      │  │
│  │  (colored roads, names)  │  │
│  │                          │  │
│  └──────────────────────────┘  │
╚────────────────────────────────╝
```

### Satellite View
```
╔────────────────────────────────╗
│  [Street ↔ Satellite]          │
│  ┌──────────────────────────┐  │
│  │                          │  │
│  │  Satellite imagery       │  │
│  │  (Esri World Imagery)    │  │
│  │                          │  │
│  └──────────────────────────┘  │
╚────────────────────────────────╝
```

---

## ⚡ Real-Time Metric Extraction

### Tag Name Matching:

```
Tag in OPC UA            → Detected As
─────────────────────────────────────────
Pump_Status              → 💡 Pump (Running/Off)
Pump_Running             → 💡 Pump (Running/Off)
Motor_1                  → 💡 Pump (Running/Off)

Current_Phase_A          → ⚡ Current (5.2 A)
Current_L1               → ⚡ Current (5.2 A)
Amps                     → ⚡ Current (5.2 A)

Flow_Rate                → 📈 Flow (120.5 L/min)
FlowRate_GPM             → 📈 Flow (120.5 L/min)
Flowrate_LPM             → 📈 Flow (120.5 L/min)

Water_Level              → 💧 Level (2.3 m)
Tank_Depth               → 💧 Level (2.3 m)
Well_Level               → 💧 Level (2.3 m)

Unknown_Tag              → ❌ Not detected
```

---

## 🔄 Auto-Refresh Flow Diagram

```
Component Mounts
      ↓
Fetch data immediately
├─ GET /api/opcua_clientconfig/?active=true
└─ GET /api/opcua_readlog/?limit=1000
      ↓
Display on map
      ↓
Set interval (30 seconds)
      ├─ Every 30 seconds: Fetch again
      ├─ Update markers if status changed
      └─ Update popup data if viewed
      ↓
Component Unmounts
      ↓
Clear interval (cleanup)
```

---

## 📱 Responsive Breakpoints

### Desktop (> 1024px)
```
┌──────────────────────────────────────┐
│ [Satellite] [Refresh] 5 stations     │
├──────────────────────────────────────┤
│                                      │
│        Full width map               │
│        All markers visible          │
│        Controls at top              │
│                                      │
└──────────────────────────────────────┘
```

### Tablet (640px - 1024px)
```
┌─────────────────────────────────┐
│ [Sat] [Ref] 5 stn               │
├─────────────────────────────────┤
│                                 │
│     Map (90% width)            │
│     Readable text              │
│     Touch-friendly controls    │
│                                 │
└─────────────────────────────────┘
```

### Mobile (< 640px)
```
┌────────────────────┐
│ [Sat][Ref] 5 stn   │
├────────────────────┤
│                    │
│  Map (full width)  │
│  Stacked controls  │
│  Popup scrollable  │
│                    │
└────────────────────┘
```

---

## 🌙 Dark Mode

### Light Mode
```
┌─────────────────────────────┐
│ White background            │
│ Dark text                   │
│ Blue accents                │
│ Light gray borders          │
└─────────────────────────────┘
```

### Dark Mode
```
┌─────────────────────────────┐
│ Dark background             │
│ Light text                  │
│ Bright blue accents         │
│ Dark gray borders           │
└─────────────────────────────┘
```

---

## 🎯 User Journey

### Step 1: Open Overview Page
```
User navigates to /overview
↓
Page loads with:
- System Status Cards
- Station Map (NEW)
- Uptime Trend
```

### Step 2: View Map
```
User sees interactive map
- Colored markers show stations
- Map centered on Uganda
- Green/Orange/Red indicating status
```

### Step 3: Click a Marker
```
User clicks on a station marker
↓
Popup appears with:
- Station name & status
- Coordinates
- OPC UA endpoint
- Real-time metrics
```

### Step 4: Toggle Satellite
```
User clicks "Satellite" button
↓
Map switches to satellite view
↓
User can see physical geography
↓
Clicks "Street" to go back
```

### Step 5: Auto-Update
```
Data updates every 30 seconds
- Markers may change color
- Popup updates if viewed
- No page refresh needed
```

---

## 🔧 Troubleshooting Visual Guide

### Issue: Blank Map Area
```
❌ PROBLEM                   ✅ SOLUTION
┌────────────────┐         ┌────────────────────┐
│ [White space]  │  ─→     │ Check browser      │
│ No tiles       │         │ console for        │
│ No markers     │         │ CORS errors        │
└────────────────┘         └────────────────────┘
```

### Issue: No Markers Visible
```
❌ PROBLEM                   ✅ SOLUTION
┌────────────────┐         ┌────────────────────┐
│ Map loaded     │  ─→     │ Verify stations    │
│ But no dots    │         │ have coordinates   │
│ 0 stations     │         │ (not null/0,0)     │
└────────────────┘         └────────────────────┘
```

### Issue: Popup Shows "—" 
```
❌ PROBLEM                   ✅ SOLUTION
┌────────────────┐         ┌────────────────────┐
│ Empty fields:  │  ─→     │ Rename tags to     │
│ Pump: —        │         │ include keywords:  │
│ Current: —     │         │ • Pump_Status      │
│ Flow: —        │         │ • Current_Phase_A  │
└────────────────┘         │ • Flow_Rate        │
                           │ • Water_Level      │
                           └────────────────────┘
```

### Issue: Satellite Not Loading
```
❌ PROBLEM                   ✅ SOLUTION
┌────────────────┐         ┌────────────────────┐
│ Click          │  ─→     │ Check internet     │
│ Satellite →    │         │ Toggle back to     │
│ Blank map      │         │ Street, try again  │
└────────────────┘         └────────────────────┘
```

---

## 📊 Data Flow Visualization

### From Backend to Map Display

```
OPC UA Servers
    ↓
OPC UA Clients (read tags)
    ↓
OpcUaReadLog table
    ↓
GET /api/opcua_readlog/
    ↓
Frontend receives JSON
    ↓
Extract pump/current/flow/level by keyword
    ↓
StationMap component
    ↓
Display in popup
    ↓
Auto-refresh every 30 seconds
```

### Station Localization

```
Admin adds coordinates
    ↓
OpcUaClientConfig.latitude
OpcUaClientConfig.longitude
    ↓
GET /api/opcua_clientconfig/?active=true
    ↓
Frontend receives with lat/lng
    ↓
Leaflet converts to map markers
    ↓
Markers display on map at exact coordinates
```

---

## 🎯 Performance Visualization

### API Call Timing
```
Start              0ms
├─ GET config      |────| 150ms
├─ GET readlog     |─────────| 250ms
↓
Merged & processed || 50ms
↓
Rendered           ||| 100ms
↓
Complete           500ms total
```

### Auto-Refresh Cycle
```
Initial Load (0s)
    ↓ [30 sec pause]
Refresh (30s)
    ↓ [30 sec pause]
Refresh (60s)
    ↓ [30 sec pause]
Refresh (90s)
    ...continues while page open
```

---

## ✨ Animation Effects

### Marker Pulse
```
🟢 Normal
↓ (pulse)
🟢 Larger
↓ (pulse)
🟢 Back to normal
↓ (repeat every 2 seconds)
```

### Loading Spinner
```
When Refresh clicked:
━ 
- (rotating)
↻
│
Back to ━ when done
```

---

## 🏆 Best Use Cases

### Scenario 1: Daily Operations
```
Operations team opens Overview
    ↓
Sees all station locations at a glance
    ↓
Green = all good, Red = investigate
    ↓
Clicks red marker to see details
    ↓
Can see pump status, current, flow
    ↓
Makes informed decisions
```

### Scenario 2: Emergency Response
```
Alert received: "Station Alpha offline"
    ↓
Opens map
    ↓
Sees Station Alpha marker is now RED
    ↓
Can see last timestamp (when it went offline)
    ↓
Coordinates visible for dispatch
    ↓
Can navigate to station quickly
```

### Scenario 3: Satellite Inspection
```
Manager wants to see station location from space
    ↓
Clicks Satellite button
    ↓
Map switches to satellite view
    ↓
Can see actual buildings/terrain
    ↓
More context for decisions
    ↓
Switches back to street for road navigation
```

---

**Visual Guide Created:** January 2025  
**Version:** 1.0.0

