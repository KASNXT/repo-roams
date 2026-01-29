# Station Map - Quick Reference & Recommendations

## ✅ What's Implemented

### 🗺️ Core Features
- ✅ Interactive Leaflet map with OSM & Satellite layers
- ✅ Color-coded station markers (green/orange/red)
- ✅ Real-time popup showing:
  - Pump status (Running/Off)
  - Current (Amperage)
  - Flow rate (L/min)
  - Well level (meters)
  - Coordinates & OPC UA endpoint
- ✅ Satellite/Street view toggle
- ✅ Auto-refresh every 30 seconds
- ✅ Manual refresh button
- ✅ Station counter
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Dark mode support
- ✅ Error handling with toast notifications
- ✅ Loading states with spinner
- ✅ Info box explaining features

---

## 🎯 How It Works

### Data Sources
1. **Stations:** `/api/opcua_clientconfig/?active=true`
   - Gets all active stations with their coordinates
   - Returns: station_name, latitude, longitude, connection_status, endpoint_url

2. **Metrics:** `/api/opcua_readlog/?ordering=-timestamp&limit=1000`
   - Gets latest OPC UA tag readings
   - Extracts: pump status, current, flow rate, well level by keyword matching

### Marker Colors
- 🟢 **Green** = Connected
- 🟠 **Orange** = Faulty  
- 🔴 **Red** = Disconnected

### Auto-Refresh
- **Frequency:** Every 30 seconds
- **Trigger:** useEffect on mount + setInterval
- **Cleanup:** clearInterval on component unmount

---

## 🚀 Getting Started

### 1. Verify Backend Setup

**Check if OPC UA coordinates are set:**
```bash
# Django shell
python manage.py shell

from roams_opcua_mgr.models import OpcUaClientConfig
OpcUaClientConfig.objects.filter(active=True).values('station_name', 'latitude', 'longitude')
```

**If no coordinates:**
```bash
# Add coordinates to stations
station = OpcUaClientConfig.objects.get(station_name="Station Alpha")
station.latitude = 0.3476
station.longitude = 32.5825
station.save()
```

### 2. Ensure OPC UA Reads are Logging

Check the database for recent reads:
```bash
python manage.py shell
from roams_opcua_mgr.models import OpcUaReadLog
OpcUaReadLog.objects.filter(client_config__active=True).order_by('-timestamp')[:5]
```

If no reads: OPC UA clients may not be running or reading tags.

### 3. Test the Map

1. Navigate to Overview page
2. Scroll to "Station Map & Real-Time Monitoring"
3. Should see:
   - Satellite/Street toggle button
   - Refresh button
   - Number of active stations
   - Interactive map with markers
   - Info box at bottom

### 4. Click a Marker

- Map should show popup with station details
- Displays real-time metrics extracted from latest OPC UA reads

---

## 💡 Recommendations & Best Practices

### 🏆 Highly Recommended (Easy to Implement)

#### 1. **Add Tag Name Hints to Admin**
Make it easier for users to understand which tags are being displayed:

```python
# In OPCUANode model admin
readonly_fields = ('detected_as',)

def detected_as(self, obj):
    tags = []
    tag_name = obj.tag_name.lower()
    if any(k in tag_name for k in ['pump', 'run', 'motor']):
        tags.append('💡 Pump Status')
    if any(k in tag_name for k in ['current', 'amp']):
        tags.append('⚡ Current')
    if any(k in tag_name for k in ['flow']):
        tags.append('📈 Flow Rate')
    if any(k in tag_name for k in ['level', 'water']):
        tags.append('💧 Level')
    return ', '.join(tags) if tags else '❌ Not recognized'
```

**Benefit:** Users know immediately what data will show on map

#### 2. **Add Coordinate Entry in Settings**
Create a map UI in RTU Clients tab where users can:
- Click on map to set coordinates
- See current coordinates
- Validate lat/long range

```tsx
// Add to OpcServerTab.tsx
<div>
  <label>Station Coordinates</label>
  <CoordinateMapPicker 
    onSelect={(lat, lng) => setForm({...form, latitude: lat, longitude: lng})}
  />
  <p>{form.latitude}, {form.longitude}</p>
</div>
```

**Benefit:** Easier than manual entry, reduces errors

#### 3. **Add Status Indicator on Card Header**
Show a quick indicator that map is updating:

```tsx
<div className="flex items-center gap-2">
  <span className="animate-pulse w-2 h-2 bg-green-500 rounded-full" />
  <span className="text-xs text-muted-foreground">Live updates</span>
</div>
```

**Benefit:** Users know data is fresh

---

### 🌟 Nice to Have (Moderate Effort)

#### 1. **Click Marker to View Station Details**
Navigate to station control page:

```tsx
// In StationPopupContent
<button 
  onClick={() => navigate(`/station/${station.id}`)}
  className="text-xs underline text-blue-600"
>
  View Full Details
</button>
```

**Benefit:** Quick access to controls and historical data

#### 2. **Show Latest Measurement Timestamp**
Display when the metrics were last updated:

```tsx
<div className="text-xs text-gray-500">
  Updated: {new Date(station.tags?.[0]?.timestamp).toLocaleTimeString()}
</div>
```

**Benefit:** Transparency on data freshness

#### 3. **Geofencing/Alerts**
Highlight stations that are offline for > 5 minutes:

```tsx
const isStaleData = (timestamp: string) => {
  return new Date().getTime() - new Date(timestamp).getTime() > 300000; // 5 min
};

// Use different marker color if stale
```

**Benefit:** Immediate visual indication of connectivity issues

#### 4. **Export Map as Image**
Let users save map snapshot:

```tsx
import html2canvas from 'html2canvas';

<Button onClick={() => {
  html2canvas(mapRef.current).then(canvas => {
    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = 'station-map.png';
    link.click();
  });
}}>
  Download Map
</Button>
```

**Benefit:** Share map with stakeholders in reports

---

### 🚀 Advanced (Higher Effort, High Value)

#### 1. **Real-Time WebSocket Updates**
Replace 30-second polling with instant push updates:

```tsx
// Use Django Channels
const ws = new WebSocket('ws://localhost/ws/station-updates/');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Update stations immediately instead of polling
  setStations(prev => 
    prev.map(s => s.id === data.station_id ? {...s, ...data} : s)
  );
};
```

**Benefits:**
- Real-time updates (< 1 second latency)
- Reduced server load
- More responsive UX

**Implementation:** ~2-3 hours

#### 2. **Historical Playback**
Show how stations moved/changed status over time:

```tsx
<Slider 
  min={start_date}
  max={end_date}
  onChange={(date) => {
    fetchStationsAt(date); // Get snapshot for that time
  }}
/>
```

**Benefits:**
- Visualize outage patterns
- Identify recurring issues
- Better root cause analysis

**Implementation:** ~3-4 hours

#### 3. **Custom Map Overlays**
Add additional layers like:
- Zones (service areas)
- Pipelines (connectivity)
- Weather data
- Satellite imagery with custom styling

```tsx
// Using Leaflet plugins
import L from 'leaflet-draw';
// User can draw zones, export as GeoJSON
```

**Benefits:**
- Context-aware monitoring
- Better situational awareness
- Professional appearance

**Implementation:** ~2-3 hours

#### 4. **Heatmap of Activity**
Show which areas have most station activity:

```tsx
import HeatmapLayer from 'leaflet-heatmap';
// Render heatmap based on historical uptime/issues
```

**Benefits:**
- Identify problem zones
- Allocate resources better
- Visual analytics

**Implementation:** ~2 hours

---

## 📊 Feature Comparison Table

| Feature | Effort | Impact | Priority | Status |
|---------|--------|--------|----------|--------|
| **Core Map** | 2 hrs | ⭐⭐⭐⭐⭐ | P0 | ✅ Done |
| Tag Hints Admin | 1 hr | ⭐⭐⭐ | P1 | 📋 Recommended |
| Coordinate Picker | 2 hrs | ⭐⭐⭐⭐ | P1 | 📋 Recommended |
| Status Indicator | 30 min | ⭐⭐ | P2 | 💡 Nice |
| Click → Details | 1 hr | ⭐⭐⭐⭐ | P1 | 💡 Nice |
| Timestamp Display | 30 min | ⭐⭐ | P2 | 💡 Nice |
| Stale Data Alert | 1 hr | ⭐⭐⭐ | P1 | 💡 Nice |
| Export as Image | 1.5 hrs | ⭐⭐ | P3 | 💡 Nice |
| WebSocket Updates | 3 hrs | ⭐⭐⭐⭐⭐ | P2 | 🚀 Advanced |
| Historical Playback | 4 hrs | ⭐⭐⭐⭐ | P3 | 🚀 Advanced |
| Custom Overlays | 3 hrs | ⭐⭐⭐ | P3 | 🚀 Advanced |
| Heatmap Layer | 2 hrs | ⭐⭐⭐⭐ | P3 | 🚀 Advanced |

**Priority Legend:**
- P0 = Core requirement (done)
- P1 = Should have (recommended)
- P2 = Nice to have
- P3 = Future enhancement

---

## 🔧 Implementation Checklist

### ✅ Current State
- [x] Map component created
- [x] Real-time data integration
- [x] Marker color coding
- [x] Popup with metrics
- [x] Satellite toggle
- [x] Auto-refresh mechanism
- [x] Responsive design
- [x] Dark mode support
- [x] Error handling
- [x] Backend serializers enhanced

### 📋 Recommended Next Steps (Phase 2)

- [ ] Add tag name hints to Admin
- [ ] Create coordinate picker widget
- [ ] Add status indicator on card
- [ ] Implement click → station details navigation
- [ ] Display measurement timestamps
- [ ] Add stale data alerts

### 🚀 Future Enhancements (Phase 3+)

- [ ] WebSocket real-time updates
- [ ] Historical data playback
- [ ] Custom map overlays (zones, pipelines)
- [ ] Heatmap visualization
- [ ] Export map as image/PDF
- [ ] Multi-user cursor tracking
- [ ] Mobile app integration

---

## 🛠️ How to Add a Recommendation Feature

### Example: Adding Timestamp Display

**1. Update StationPopupContent:**
```tsx
<div className="text-xs text-gray-500 mt-2">
  Latest: {station.tags?.[0]?.timestamp 
    ? new Date(station.tags[0].timestamp).toLocaleTimeString()
    : 'Unknown'}
</div>
```

**2. Update StationData interface:**
```tsx
interface StationData {
  // ... existing fields
  latestReadTime?: string; // Add this
}
```

**3. Test:**
```bash
npm run dev
# Navigate to Overview page
# Verify timestamp shows in popup
```

---

## 🎓 Learning Resources

### Map Library (Leaflet)
- Docs: https://leafletjs.com/
- React Wrapper: https://react-leaflet.js.org/
- Examples: https://leafletjs.com/examples.html

### OPC UA
- Tag naming best practices
- Connection status meanings
- Read log interpretation

### React Performance
- useEffect cleanup patterns
- State management in maps
- Memory leak prevention

---

## 📞 Support & Troubleshooting

### Map Not Loading?
1. Check browser console for errors
2. Verify Leaflet CSS is imported
3. Check API connectivity

### No Stations Showing?
1. Ensure OPC UA client configs have active=true
2. Add latitude/longitude coordinates
3. Click Refresh button

### Real-time Data Not Updating?
1. Check OPC UA clients are reading tags
2. Verify OpcUaReadLog table has recent entries
3. Ensure tag names contain keywords (pump, current, flow, level)

### Satellite View Not Loading?
1. Check internet connectivity
2. Verify Esri tile server is accessible
3. Try street view and switch back

---

## 📈 Success Metrics

After implementation, you should see:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Map Load Time | < 2s | Browser DevTools |
| Marker Accuracy | ±50m | Compare with GPS |
| Data Freshness | 30s max | Check timestamps |
| Station Coverage | 100% active | Count markers vs DB |
| User Engagement | > 50% visits | Analytics tracking |

---

## 🎉 Summary

The Station Map is now **production-ready** with:

✅ **What Users Get:**
- Real-time visual of all station locations
- Live pump, current, flow, and level data
- Quick status checks (green/orange/red)
- Satellite imagery option
- Auto-updating every 30 seconds

✅ **What's Still Possible:**
- Make coordinates easier to set (coordinate picker)
- Click markers to view full station details
- Switch to real-time updates (WebSockets)
- Add historical playback
- Create heatmaps and zones
- Export maps for reports

**Next Recommended Task:** Coordinate Picker Widget (2 hours, high impact)

---

**Created:** January 2025
**Component Version:** 1.0.0
**Status:** ✅ Production Ready & Extensible

