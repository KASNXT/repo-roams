# Backend & Frontend Integration Review - System Status Cards

## 📊 Current System Architecture

### Backend Endpoints Available

#### 1. **System Uptime Endpoint** ✅
- **Path**: `/api/system-uptime/`
- **Method**: GET
- **Authentication**: Required (IsAuthenticated)
- **Response**:
```json
{
  "uptime": {
    "station_name_1": 95.5,
    "station_name_2": 98.2,
    ...
  },
  "overall_uptime": 96.8
}
```
- **Location**: `roams_api/views.py:227`
- **Calculation**: Averages uptime % across all stations

#### 2. **Active Stations Summary Endpoint** ✅
- **Path**: `/api/active-stations/`
- **Method**: GET
- **Authentication**: Required (IsAuthenticated, IsFrontendApp)
- **Response**:
```json
{
  "total_active_stations": 5,
  "total_connected_stations": 4
}
```
- **Location**: `roams_api/views.py:161`
- **Source**: `get_total_active_stations()`, `get_total_connected_stations()`

#### 3. **OPC UA Client Config Endpoint** ✅
- **Path**: `/api/opcua_clientconfig/`
- **Method**: GET
- **Response**: List of all client configs including:
  - `station_name`
  - `endpoint_url` (where ROAMS uploads)
  - `active` (status)
  - `last_connected` (timestamp)
  - `connection_status`
  - `security_policy`

#### 4. **Threshold Breach (System Alarms) Endpoint** ✅
- **Path**: `/api/breaches/`
- **Method**: GET
- **Response**: Array of ThresholdBreach objects
  - `id`
  - `timestamp`
  - `breach_type` (HIGH/LOW)
  - `node_name`
  - `threshold`
  - `breach_value`
  - `acknowledged`

---

## 🎯 Current Frontend Overview Page

### Cards Currently Displayed (Lines 88-117)
```tsx
1. Active Stations     → stations.length (hardcoded data)
2. System Uptime       → overallUptime% (from API ✅)
3. Active Alerts       → 5 (HARDCODED ❌)
4. Server Status       → "Online" (HARDCODED ❌)
```

### Issues Identified
- ❌ **Active Stations** - Data not loading (stations array empty)
- ❌ **Active Alerts** - Hardcoded value "5"
- ❌ **Server Status** - Hardcoded as "Online"
- ❌ **Cards** - No hover effects
- ❌ **Responsiveness** - Basic grid, can be enhanced

---

## 📋 Data Source Mapping for Cards

| Card | Current | Should Show | API Endpoint | Notes |
|------|---------|------------|--------------|-------|
| **Active Stations** | hardcoded 0 | Connected stations count | `/api/active-stations/` | Use `total_connected_stations` |
| **System Uptime** | ✅ Working | Overall uptime % | `/api/system-uptime/` | Already implemented |
| **System Alarms** | ❌ 5 (fake) | Real alarm count | `/api/breaches/` | Count unacknowledged breaches |
| **Server Status** | ❌ "Online" | Django server + endpoints | Health check | Create new endpoint or check existing |
| **ROAMS Upload** | ❌ Missing | OPC UA endpoint URL | `/api/opcua_clientconfig/` | First station's endpoint_url |

---

## 🚀 Implementation Plan

### Phase 1: Add Data Integration
1. Fetch actual connected stations from `/api/active-stations/`
2. Fetch real alarm count from `/api/breaches/` (unacknowledged)
3. Create server health endpoint (optional - can check database)
4. Get ROAMS upload URL from first OPC UA client config

### Phase 2: Add Hover Effects
1. Add transition effects to cards
2. Add shadow hover effect
3. Add scale/lift effect
4. Add cursor pointer
5. Add icon animations on hover

### Phase 3: Responsive Enhancements
1. Adjust grid for mobile (1 column)
2. Adjust for tablet (2 columns)
3. Keep 4 columns for desktop

---

## 📦 Code Structure

### Backend Files to Reference
- **System Uptime**: `roams_backend/roams_api/views.py:227`
- **Active Stations**: `roams_backend/roams_api/views.py:161`
- **Models**: `roams_backend/roams_opcua_mgr/models.py`
- **Utilities**: `roams_backend/roams_opcua_mgr/opcua_client.py`

### Frontend Files to Update
- **Overview Page**: `roams_frontend/src/pages/Overview.tsx`
- **API Config**: `roams_frontend/src/services/api.ts`

---

## 🎨 Hover Effect Specifications

### CSS Classes to Add
```css
.card-hover:hover {
  @apply shadow-lg scale-105 transition-all duration-300 cursor-pointer;
}

.icon-hover:hover {
  @apply text-primary transition-colors duration-200;
}
```

### Tailwind Classes
- `hover:shadow-lg` - Shadow on hover
- `hover:scale-105` - Slight zoom
- `transition-all duration-300` - Smooth animation
- `cursor-pointer` - Indicate interactivity

---

## 📊 Card Updates Required

```tsx
// Current Card Structure
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">Title</CardTitle>
    <Icon className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">Value</div>
    <p className="text-xs text-muted-foreground">Description</p>
  </CardContent>
</Card>

// Add These Classes
<Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
```

---

## 🔄 Data Flow

```
Frontend (Overview.tsx)
        ↓
    useEffect
        ↓
    axios.get("/api/system-uptime/")
    axios.get("/api/active-stations/")
    axios.get("/api/breaches/")
    axios.get("/api/opcua_clientconfig/")
        ↓
    Backend (views.py)
        ↓
    OpcUaClientConfig.objects.all()
    ThresholdBreach.objects.all()
    get_total_connected_stations()
        ↓
    Return Response
        ↓
    Frontend setState
        ↓
    Render Cards
```

---

## 📝 Next Steps

1. ✅ **Review** backend endpoints and data sources (DONE)
2. ⏳ **Create** new card component with hover effects
3. ⏳ **Add** data fetching for all 4 metrics
4. ⏳ **Implement** real-time updates (optional)
5. ⏳ **Test** all card interactions

---

## 🎯 Success Criteria

- ✅ All 4 cards show real data from API
- ✅ Hover effects smooth and responsive
- ✅ Active stations count updates from `/api/active-stations/`
- ✅ System alarms count real breaches from `/api/breaches/`
- ✅ Server status shows actual health
- ✅ ROAMS upload URL visible (from OPC UA config)
- ✅ Cards responsive on all screen sizes

---

## 📌 Important Notes

### Endpoint Functionality
- All endpoints return data in real-time
- Authentication required for frontend calls
- Token passed via localStorage

### Data Availability
- System uptime calculated from OpcUaReadLog entries
- Active stations from OpcUaClientConfig with `active=True`
- Alarms from ThresholdBreach model
- Upload location from first OPC UA endpoint_url

### Performance
- Light API calls (small datasets)
- Suitable for real-time dashboard updates
- Consider polling every 30-60 seconds for status

---

**Status**: Ready for implementation
**Recommendation**: Implement data integration first, then add hover effects
