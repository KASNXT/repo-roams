# 🎯 Analysis Page - Sampling Time Display Enhancement

## Current State
Your Analysis.tsx component fetches and displays telemetry data, but doesn't show the sampling interval being used.

## Recommended Enhancement

Add a sampling interval indicator to the Analysis page header showing:
- Current sampling rate
- Expected data freshness
- Last data point timestamp

### Suggested Implementation

```tsx
// Add this to Analysis.tsx after the station selector

// Display current sampling interval for selected station
const [samplingInterval, setSamplingInterval] = useState<number>(5000);

useEffect(() => {
  if (!selectedWell) return;
  
  const loadSamplingInfo = async () => {
    try {
      const api = axios.create({
        baseURL: "http://localhost:8000/api",
      });
      
      api.interceptors.request.use((config) => {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers = config.headers ?? {};
          (config.headers as Record<string, string>).Authorization = `Token ${token}`;
        }
        return config;
      });

      const res = await api.get("/clients/");
      const stations = Array.isArray(res.data) ? res.data : res.data.results || [];
      const station = stations.find(s => s.station_name === selectedWell);
      
      if (station) {
        setSamplingInterval(station.subscription_interval || 5000);
      }
    } catch (error) {
      console.error("Failed to load sampling info:", error);
    }
  };

  loadSamplingInfo();
}, [selectedWell]);

// Add to header display:
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <Clock className="h-4 w-4" />
  <span>Sampling: {(samplingInterval / 1000).toFixed(1)}s</span>
</div>
```

## Why This Matters

### For SCADA Comparison
```
Your Page Shows:
┌─────────────────────────────────────────┐
│ Analysis Dashboard                      │
├─────────────────────────────────────────┤
│ Station: testing                        │
│ Date Range: 7 days                      │
│ Sampling: 5.0s  ← NEW INFO             │
├─────────────────────────────────────────┤
│ [Charts showing data every 5 seconds]   │
└─────────────────────────────────────────┘

Compare with Other SCADA:
- Other system: "Sampling: 2.0s"
- ROAMS: "Sampling: 5.0s"
- ❌ Mismatch: Adjust to 2.0s first!
```

### For Data Interpretation
```
Sampling Rate: 5.0s
↓
Expected readings: 1 per 5 seconds
↓
If seeing gaps in chart: Normal (network delay or edge case)
If seeing 100 points in 1 minute: Something's wrong (not 5s)
```

## Current System Sampling Status

```
┌──────────────────────┬─────────────┬──────────────┬─────────┐
│ Station              │ Active      │ Interval     │ Status  │
├──────────────────────┼─────────────┼──────────────┼─────────┤
│ testing              │ ✓ Yes       │ 5000ms (5s)  │ ✓ OK    │
│ Lutete Bore hole     │ ✓ Yes       │ 5000ms (5s)  │ ✓ OK    │
│ katu bh1             │ ✓ Yes       │ 5000ms (5s)  │ ✓ OK    │
│ mityana bh1          │ ✓ Yes       │ 5000ms (5s)  │ ⚠️ Dead │
└──────────────────────┴─────────────┴──────────────┴─────────┘

💡 Tip: All stations sample at 5 seconds (synchronized)
✅ Good for SCADA comparison if other system also uses 5s
```

## Data Flow in Analysis.tsx

```
┌─────────────────────────────────────────────────┐
│ User selects station: "testing"                 │
└────────────────────┬────────────────────────────┘
                     ↓
        ┌────────────────────────────┐
        │ Load Sampling Info (NEW)    │
        │ subscription_interval=5000  │
        └────────────┬────────────────┘
                     ↓
        ┌────────────────────────────┐
        │ Display: "Sampling: 5.0s"   │
        └────────────┬────────────────┘
                     ↓
        ┌────────────────────────────┐
        │ Load Historical Data        │
        │ fetchHistory() every 5 sec  │
        └────────────┬────────────────┘
                     ↓
        ┌────────────────────────────┐
        │ Render Charts & Alarms      │
        │ Data points ~5s apart       │
        └────────────────────────────┘
```

## Impact on Your Analysis Page

### Before Enhancement
- User doesn't know the sampling rate
- Confusion when comparing with other SCADA
- Unclear why gaps appear in data

### After Enhancement
- **Transparency**: User sees "Sampling: 5.0s"
- **Debugging**: Easier to identify mismatches
- **Validation**: User can verify data freshness
- **SCADA Ready**: Clear indication for comparison

## Implementation Notes

### Backend API Addition (Optional)

Add sampling info to station API response:

```python
# In roams_api/serializers.py
from rest_framework import serializers
from roams_opcua_mgr.models import OpcUaClientConfig

class OpcUaClientConfigSerializer(serializers.ModelSerializer):
    subscription_interval_seconds = serializers.SerializerMethodField()
    
    def get_subscription_interval_seconds(self, obj):
        return obj.subscription_interval / 1000
    
    class Meta:
        model = OpcUaClientConfig
        fields = [
            'id', 
            'station_name', 
            'endpoint_url', 
            'active', 
            'connection_status',
            'subscription_interval',  # in ms
            'subscription_interval_seconds',  # in seconds (new)
            'created_at',
        ]
```

### Frontend Component Usage

```tsx
interface Station {
  id: number;
  station_name: string;
  endpoint_url: string;
  active: boolean;
  connection_status: string;
  subscription_interval: number;  // milliseconds
  subscription_interval_seconds?: number;  // seconds
  created_at: string;
}

// Display sampling info
<div className="text-sm text-muted-foreground flex items-center gap-2">
  <Clock className="h-4 w-4" />
  <span>Data refreshes every {(station.subscription_interval / 1000).toFixed(1)}s</span>
</div>
```

## Testing the Feature

### Manual Test
1. Open Analysis page
2. Select station "testing"
3. Should show "Sampling: 5.0s"
4. Change interval in admin to 2000ms
5. Refresh page
6. Should show "Sampling: 2.0s"

### Automated Test
```typescript
test('displays sampling interval', async () => {
  const { getByText } = render(<Analysis />);
  
  // Should show default 5s
  await waitFor(() => {
    expect(getByText('Sampling: 5.0s')).toBeInTheDocument();
  });
});
```

## Comparison with SCADA

### Workflow Before Fix
```
User: "Is my data synced with the other SCADA?"
System: (silent - no indication of sampling rate)
User: (guesses, gets confused)
```

### Workflow After Fix
```
User: "Is my data synced with the other SCADA?"
System: "Shows Sampling: 5.0s"
User: Checks other SCADA: "Ah, they sample at 2.0s - I need to adjust"
User: Goes to admin, changes to 2000ms
User: ✅ Systems now synchronized!
```

---

## Summary

| Aspect | Current | With Enhancement |
|--------|---------|-------------------|
| **User knows sampling rate** | ❌ NO | ✅ YES |
| **SCADA comparison easy** | ❌ HARD | ✅ EASY |
| **Data freshness obvious** | ❌ NO | ✅ YES |
| **Debugging mismatches** | ❌ DIFFICULT | ✅ CLEAR |

**Recommendation**: Add sampling interval display to Analysis.tsx header for better transparency and SCADA comparison support.

