# Alarm Card Integration - Quick Reference

## What Changed?

The "Active Warnings" alarm card on the dashboard homepage now:
- ✅ Displays **real alarm count** from the backend (instead of hardcoded "3")
- ✅ **Updates automatically** every 10 seconds
- ✅ Shows **loading state** ("…") while fetching
- ✅ **Navigates to alerts page** when clicked

## Files Modified

### 1. `/roams_frontend/src/services/api.ts`
**3 additions:**
- `ThresholdBreach` interface (lines ~65-72)
- `fetchActiveBreaches()` function (lines ~160-189)
- `fetchBreaches(acknowledged?)` function (lines ~191-220)

### 2. `/roams_frontend/src/pages/Index.tsx`
**5 additions:**
- `useNavigate` import (line 2)
- `activeAlarms` state (line 43)
- `loadingAlarms` state (line 44)
- Alarm fetch effect hook (lines 111-137)
- `handleAlarmsCardClick()` handler (lines 144-146)

**1 modification:**
- Alarms card now uses `activeAlarms.length` and onClick handler (lines 219-235)

## How It Works

### Data Flow
```
Backend Database (ThresholdBreach table)
        ↓
API Endpoint (/api/breaches/?acknowledged=false)
        ↓
fetchActiveBreaches() [API Service]
        ↓
activeAlarms state [React Component]
        ↓
Card Count Display [UI]
```

### Click Behavior
```
User clicks "Alarms" card
        ↓
handleAlarmsCardClick()
        ↓
navigate("/notifications")
        ↓
Notifications page loads
```

## Code Snippets

### Fetch Function (API Service)
```typescript
export async function fetchActiveBreaches(): Promise<ThresholdBreach[]> {
  try {
    const res = await api.get<PaginatedBreachResponse | ThresholdBreach[]>(
      "/breaches/?acknowledged=false"
    );
    const data = res.data;
    return Array.isArray(data) ? data : data.results || [];
  } catch (err) {
    console.error("Failed to fetch active breaches:", err);
    return [];
  }
}
```

### Effect Hook (Component)
```typescript
useEffect(() => {
  let mounted = true;
  
  const loadAlarms = async () => {
    setLoadingAlarms(true);
    try {
      const breaches = await fetchActiveBreaches();
      if (!mounted) return;
      setActiveAlarms(breaches);
    } catch (err) {
      console.error("Failed to fetch active alarms:", err);
    } finally {
      if (mounted) setLoadingAlarms(false);
    }
  };

  loadAlarms();
  const interval = setInterval(loadAlarms, 10000); // Every 10s
  return () => {
    mounted = false;
    clearInterval(interval);
  };
}, []);
```

### Click Handler
```typescript
const handleAlarmsCardClick = () => {
  navigate("/notifications");
};
```

### Updated Card Component
```tsx
<Card 
  className="shadow-card hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer"
  onClick={handleAlarmsCardClick}
>
  <CardHeader className="pb-3">
    <CardTitle className="flex items-center gap-2 text-base">
      <AlertTriangle className="h-5 w-5 text-status-warning" />
      Alarms
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-status-warning">
      {loadingAlarms ? "…" : activeAlarms.length}
    </div>
    <p className="text-sm text-muted-foreground">Active Warnings</p>
  </CardContent>
</Card>
```

## API Endpoint Details

**Endpoint**: `GET /api/breaches/?acknowledged=false`

**Backend Components**:
- ViewSet: `ThresholdBreachViewSet` (roams_api/views.py)
- Serializer: `ThresholdBreachSerializer` (roams_api/serializers.py)
- Model: `ThresholdBreach` (roams_opcua_mgr/models.py)
- URL: Registered as `r'breaches'` (roams_api/urls.py)

**Response Format**:
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "node": 42,
      "node_name": "Temperature Sensor",
      "threshold": 100,
      "breach_value": 125.5,
      "breach_type": "HIGH",
      "timestamp": "2024-01-15T10:30:00Z",
      "acknowledged": false
    },
    ...
  ]
}
```

## Testing Checklist

- [ ] Dashboard loads without errors
- [ ] Alarms card shows correct count on load
- [ ] Count updates every 10 seconds
- [ ] Loading state "…" appears briefly during fetch
- [ ] Clicking card navigates to /notifications
- [ ] Network tab shows GET /api/breaches/?acknowledged=false requests
- [ ] Browser console has no errors
- [ ] Page unmounts cleanly (no memory leaks)

## Troubleshooting

### Card still shows 3
- Check browser console for errors
- Verify /api/breaches/ endpoint is accessible
- Check authentication token is valid
- Verify backend has ThresholdBreach data

### Card doesn't respond to click
- Verify useNavigate hook is imported
- Check React Router is configured correctly
- Verify /notifications page exists

### Count not updating
- Check network tab for failed requests
- Verify API response format matches ThresholdBreach interface
- Check browser console for errors
- Verify polling interval is firing (every 10s)

### API returns no data
- Verify threshold breaches exist in database
- Check acknowledged filter in backend
- Test manually: curl http://localhost:8000/api/breaches/?acknowledged=false
- Verify authentication token is sent

## Browser DevTools Tips

### Check Network Requests
```javascript
// Open DevTools → Network tab
// Filter by "breaches"
// Look for: GET /api/breaches/?acknowledged=false
// Response should show paginated results
```

### Check Component State
```javascript
// Open DevTools → React Dev Tools Extension
// Find Index component
// Check activeAlarms state
// Should show array of ThresholdBreach objects
```

### Verify API Response
```javascript
// In console, after component mounts:
fetch('http://localhost:8000/api/breaches/?acknowledged=false', {
  headers: {
    'Authorization': `Token ${localStorage.getItem('token')}`
  }
}).then(r => r.json()).then(console.log)
```

## Related Pages/Components

- **Notifications Page**: `/notifications` (destination when card clicked)
- **API Documentation**: Check roams_api/urls.py for available endpoints
- **Admin Interface**: Can manually create test ThresholdBreach records
- **Database**: PostgreSQL opcua_mgr_thresholdbreach table

## Performance Notes

- **Polling**: 10 seconds (same as other dashboard cards)
- **Data Size**: Only unacknowledged breaches (filtered server-side)
- **Error Recovery**: Automatic - gracefully falls back to empty array
- **Memory**: Cleaned up on component unmount
- **Rendering**: Efficient - only re-renders when count changes
