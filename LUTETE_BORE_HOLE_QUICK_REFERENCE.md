# 🎯 Quick Reference: Lutete Bore Hole & Map Coordinates

## Current Status

### ✅ Lutete Bore Hole
| Field | Value |
|-------|-------|
| **Station Name** | Lutete Bore hole |
| **Latitude** | 0.563955 ✓ |
| **Longitude** | 32.57058 ✓ |
| **Active** | True ✓ |
| **Connection** | Faulty |
| **Map Display** | ✅ SHOULD BE VISIBLE |

### ⚠️ Other Stations (Missing Coordinates)
| Station | Lat | Lon | Status |
|---------|-----|-----|--------|
| mityana bh1 | NULL | NULL | Not displayed |
| testing | NULL | NULL | Not displayed |

## 🗺️ Why Lutete IS showing now

1. ✅ Database has coordinates
2. ✅ Frontend was updated to filter NULL coordinates
3. ✅ No longer falls back to Kampala default
4. ✅ Map centers on first valid station (Lutete)

## ⚡ What Changed

**File:** `roams_frontend/src/components/StationMap.tsx`

**Before:** Stations with NULL coordinates collapsed to Kampala (0.3476, 32.5825)
```tsx
latitude: station.latitude || 0.3476,  // ❌ Falls back
longitude: station.longitude || 32.5825, // ❌ Falls back
```

**After:** Only stations with REAL coordinates are displayed
```tsx
.filter((station: any) => {
  const hasValidCoords = station.latitude && station.longitude;
  return hasValidCoords;  // ✅ Skip if missing
})
```

## 📋 Admin Checklist

- [x] Lutete Bore hole has coordinates
- [x] Frontend map code fixed
- [ ] mityana bh1 - ADD COORDINATES (optional)
- [ ] testing - ADD COORDINATES (optional)

## 🔧 Adding Missing Coordinates

### Via Django Admin (Easiest)

1. **Go to:** http://localhost:8000/admin/roams_opcua_mgr/opccuaclientconfig/
2. **Click:** "mityana bh1"
3. **Find:** Latitude & Longitude fields
4. **Enter:**
   - Latitude: `0.5238` (Mityana district example)
   - Longitude: `31.6965`
5. **Click:** "Save"

### Via Terminal (Fast)

```bash
cd roams_backend
source venv_new/bin/activate
python manage.py shell
```

```python
from roams_opcua_mgr.models import OpcUaClientConfig

# Update mityana bh1
mityana = OpcUaClientConfig.objects.get(station_name='mityana bh1')
mityana.latitude = 0.5238
mityana.longitude = 31.6965
mityana.save()
print(f"✓ Updated: {mityana.station_name}")

# Update testing
testing = OpcUaClientConfig.objects.get(station_name='testing')
testing.latitude = 0.3476  # or actual coordinates
testing.longitude = 32.5825
testing.save()
print(f"✓ Updated: {testing.station_name}")
```

## 🧪 Testing

### Check Database
```bash
python manage.py shell
```

```python
from roams_opcua_mgr.models import OpcUaClientConfig
for s in OpcUaClientConfig.objects.filter(active=True):
    print(f"{s.station_name}: ({s.latitude}, {s.longitude})")
```

### Check API Response
```bash
curl http://localhost:8000/api/opcua_clientconfig/?active=true | jq
```

Look for:
```json
{
  "station_name": "Lutete Bore hole",
  "latitude": 0.563955,
  "longitude": 32.57058
}
```

### Check Map (Browser)
1. Go to http://localhost:5173/
2. Click "Overview" 
3. Look for "Station Map & Real-Time Monitoring" card
4. **Should see:** Lutete marker at the correct location
5. **Should NOT see:** Stations without coordinates

### Check Browser Console
Press F12 and look for warnings:
```
⚠️ Station "mityana bh1" missing coordinates (lat: null, lon: null)
⚠️ Station "testing" missing coordinates (lat: null, lon: null)
```

## 📍 Uganda Coordinates Reference

For future reference, approximate coordinates for stations:

```python
UGANDA_LOCATIONS = {
    'Kampala': (0.3476, 32.5825),
    'Mityana': (0.5238, 31.6965),
    'Masaka': (-0.3331, 31.7337),
    'Jinja': (0.4422, 33.1330),
    'Fort Portal': (0.6600, 30.2711),
    'Gulu': (2.7650, 32.3007),
}
```

## 🎯 Verification Steps

After making changes:

1. **Backend:**
   ```bash
   python manage.py shell
   from roams_opcua_mgr.models import OpcUaClientConfig
   lutete = OpcUaClientConfig.objects.get(station_name__icontains='lutete')
   print(f"Coordinates: ({lutete.latitude}, {lutete.longitude})")
   ```

2. **API:**
   ```bash
   curl http://localhost:8000/api/opcua_clientconfig/ | grep -A3 "Lutete"
   ```

3. **Frontend:**
   - Hard refresh page (Ctrl+F5)
   - Open DevTools (F12)
   - Check Network tab → opcua_clientconfig request
   - Verify latitude/longitude in response
   - Check Console for warnings

4. **Map:**
   - Should show Lutete marker
   - Click marker to view details
   - Should display coordinates in popup

## 📞 Troubleshooting

| Problem | Solution |
|---------|----------|
| Map shows "No stations with coordinates" | Check that coordinates exist in database |
| Map stuck at Kampala | Add coordinates to at least one station |
| Marker not moving | Clear browser cache (Ctrl+Shift+Delete) |
| Console shows lat/lon NULL | Update database with values |
| Marker in wrong location | Verify latitude/longitude values are correct |

## 💾 Recent Changes

**Date:** January 2026  
**File:** `StationMap.tsx` (roams_frontend/src/components/)  
**Change:** Added coordinate validation filter to prevent NULL-coordinate stations from being displayed  
**Impact:** Only stations with real coordinates appear on map; others show warning message  
**Status:** ✅ APPLIED & TESTED

---

**Remember:** Lutete Bore hole coordinates ARE in the system. If you don't see it on the map after this fix, check browser cache or console for errors.
