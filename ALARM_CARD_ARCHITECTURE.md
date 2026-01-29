# Alarm Card Integration Architecture

## Component Hierarchy

```
App.tsx (Router)
    ↓
Index.tsx (Dashboard Page)
    ├─ Dashboard Layout
    │  ├─ Top Cards Section
    │  │  ├─ Active Stations Card (from summary API)
    │  │  ├─ Online Stations Card (from summary API)
    │  │  ├─ Last Updated Card (timestamp)
    │  │  └─ Alarms Card ✨ NEW INTEGRATION
    │  │     ├─ Icon: AlertTriangle
    │  │     ├─ Count: activeAlarms.length (from /api/breaches/)
    │  │     ├─ Label: Active Warnings
    │  │     ├─ Click Handler: navigate("/notifications")
    │  │     └─ Loading State: "…" while fetching
    │  └─ Stations & Nodes Section
    └─ State Management
       ├─ activeAlarms: ThresholdBreach[]
       ├─ loadingAlarms: boolean
       └─ Effects: fetchActiveBreaches() every 10s
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React/TypeScript)                                 │
│                                                             │
│  Index.tsx                                                  │
│  ├─ useEffect (alarm fetch)                                │
│  │  ├─ Runs on mount                                       │
│  │  └─ Repeats every 10 seconds                            │
│  │                                                         │
│  └─ fetchActiveBreaches()                                  │
│     └─ Calls API Service                                   │
│        ↓                                                   │
│  api.ts                                                    │
│  ├─ fetchActiveBreaches()                                  │
│  │  └─ Constructs request to /breaches/?acknowledged=false│
│  │     ↓                                                   │
│  └─ axios interceptor adds Auth token                      │
│     ↓                                                       │
└─────────────────────────────────────────────────────────────┘
         ↓ HTTP GET /api/breaches/?acknowledged=false
         ↓ Header: Authorization: Token {token}
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend (Django REST Framework)                             │
│                                                             │
│  roams_api/urls.py                                          │
│  └─ router.register(r'breaches', ThresholdBreachViewSet)    │
│     ↓                                                       │
│  roams_api/views.py                                         │
│  └─ ThresholdBreachViewSet(viewsets.ReadOnlyModelViewSet)   │
│     ├─ Filters query: acknowledged=false                   │
│     ├─ Orders by: -timestamp (newest first)                │
│     └─ Returns paginated response                          │
│        ↓                                                   │
│  roams_api/serializers.py                                  │
│  └─ ThresholdBreachSerializer                              │
│     ├─ Serializes model fields                             │
│     └─ Returns JSON response                               │
│        ↓                                                   │
│  roams_opcua_mgr/models.py                                 │
│  └─ ThresholdBreach model                                  │
│     ├─ node (ForeignKey)                                   │
│     ├─ threshold (ForeignKey)                              │
│     ├─ breach_value (float)                                │
│     ├─ breach_type (CharField)                             │
│     ├─ timestamp (DateTimeField)                           │
│     └─ acknowledged (BooleanField)                         │
│        ↓                                                   │
│  PostgreSQL Database                                       │
│  └─ opcua_mgr_thresholdbreach table                         │
│     └─ Stores all threshold breaches                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ↓ JSON Response with paginated results
         ↓ {"count": 5, "next": null, "results": [...]}
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend Update                                             │
│                                                             │
│  setActiveAlarms(breaches)                                  │
│  └─ Updates state with response data                        │
│     ↓                                                       │
│  Component Re-renders                                       │
│  └─ Alarms Card                                             │
│     ├─ Count: activeAlarms.length                           │
│     ├─ Display: Shows 5 (or whatever count)                 │
│     └─ Next update in 10 seconds                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ↓ User clicks Alarms card
         ↓ handleAlarmsCardClick()
         ↓ navigate("/notifications")
         ↓
    /notifications page loads with alarm details
```

## State Management Timeline

```
Mount Component
    ↓
useEffect executes (alarm fetch)
    ↓
setLoadingAlarms(true)
    ↓
fetchActiveBreaches() → API call
    ↓
Response received (paginated: {count, results})
    ↓
setActiveAlarms(breaches)
setLoadingAlarms(false)
    ↓
Component re-renders with new count
    ↓
Card displays: activeAlarms.length (e.g., 5)
    ↓
Wait 10 seconds...
    ↓
Repeat every 10 seconds until unmount
    ↓
Cleanup: clearInterval, set mounted=false
```

## Card Click Flow

```
User hovers Alarms Card
    ↓
Visual feedback: scale-105, enhanced shadow
    ↓
User clicks card
    ↓
onClick event triggered
    ↓
handleAlarmsCardClick() executes
    ↓
navigate("/notifications") called
    ↓
Router navigates to /notifications route
    ↓
Notifications page component loads
    ↓
Can display filtered alarms or full alarm list
```

## API Response Format

```
GET /api/breaches/?acknowledged=false

Response:
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
    {
      "id": 2,
      "node": 43,
      "node_name": "Pressure Sensor",
      "threshold": 50,
      "breach_value": 45.2,
      "breach_type": "LOW",
      "timestamp": "2024-01-15T10:25:00Z",
      "acknowledged": false
    },
    ... (3 more breaches)
  ]
}
```

## Performance Considerations

- **Polling Interval**: 10 seconds (matches other dashboard cards)
- **Data Size**: Only unacknowledged breaches (filtered at API level)
- **Pagination**: Handled by DRF pagination (default 100 items per page)
- **Caching**: No client-side caching (real-time updates needed)
- **Error Handling**: Graceful fallback to empty array on API errors

## Integration Points

1. **Authentication**: Uses existing token interceptor in api.ts
2. **Styling**: Uses existing Card component and status-warning color class
3. **Navigation**: Uses React Router's useNavigate hook
4. **Notifications Page**: Already exists at /notifications route
5. **API Endpoint**: Already registered in backend urls.py
