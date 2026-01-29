# Phase 5 Data Flow Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTIONS                            │
│                                                                      │
│  ┌──────────────────────┐         ┌──────────────────────────┐     │
│  │  Page Load/Reload    │         │  Select New Station      │     │
│  │       (F5)           │         │   (Dropdown Change)      │     │
│  └──────────┬───────────┘         └──────────────┬───────────┘     │
│             │                                    │                  │
└─────────────┼────────────────────────────────────┼──────────────────┘
              │                                    │
              ▼                                    ▼
        ┌──────────────┐                    ┌────────────────┐
        │   Analysis   │                    │   Analysis     │
        │    .tsx      │                    │    .tsx        │
        │   (mount)    │                    │  (useState)    │
        └──────┬───────┘                    └────────┬───────┘
               │                                    │
               └──────────┬───────────────────────┬─┘
                          │                       │
                ┌─────────▼──────────┐
                │  localStorage API  │
                │                    │
                │  .getItem()        │  ◀─────── Retrieve saved
                │  .setItem()        │           station
                │  .removeItem()     │  ◀─────── Save selection
                └────────┬───────────┘
                         │
                ┌────────▼────────┐
                │  SelectedWell   │
                │   (State)       │
                │                 │
                │  "Station A"    │
                │   or            │
                │  "Station B"    │
                └────────┬────────┘
                         │
                ┌────────▼──────────────────────────────────────┐
                │      AlarmsTable Component (Props)            │
                │                                               │
                │  - searchTerm                                 │
                │  - filterType                                 │
                │  - wellId (passed from selectedWell)  ◀─────┐ │
                │  - dateRange                              │  │
                └────────┬──────────────────────────────────┼──┘
                         │                                  │
                         │ useEffect dependency            │
                         │ [wellId, dateRange]             │
                         │                                  │
                ┌────────▼─────────────────┐               │
                │  fetchAlarmsFrom          │               │
                │  Database() Function      │               │
                │                           │               │
                │  ┌─────────────────────┐  │               │
                │  │ axios.create()      │  │               │
                │  │ baseURL: /api       │  │               │
                │  └─────────────────────┘  │               │
                │                           │               │
                │  ┌─────────────────────┐  │               │
                │  │ interceptor         │  │               │
                │  │ Attach token auth   │  │               │
                │  └─────────────────────┘  │               │
                │                           │               │
                └───────────┬────────────────┘
                            │
        ┌───────────────────▼────────────────────┐
        │    API Request                         │
        │                                        │
        │  GET /api/breaches/                    │
        │  Authorization: Token xyz...           │
        │                                        │
        │  HTTP/1.1 200 OK                       │
        │  Content-Type: application/json        │
        └───────────────────┬────────────────────┘
                            │
        ┌───────────────────▼────────────────────┐
        │    Backend API Response                │
        │    (ThresholdBreach Data)              │
        │                                        │
        │  [                                     │
        │    {                                   │
        │      id: 1,                            │
        │      timestamp: "2024-01-15T10:30Z",   │
        │      breach_type: "HIGH",              │
        │      node_name: "Sensor A",            │
        │      threshold: 95.5,                  │
        │      breach_value: 98.3,               │
        │      acknowledged: false               │
        │    },                                  │
        │    { ... }                             │
        │  ]                                     │
        └───────────────────┬────────────────────┘
                            │
        ┌───────────────────▼────────────────────┐
        │   Data Transformation                  │
        │   (ThresholdBreach → Alarm)            │
        │                                        │
        │   breach.id              → alarm.id    │
        │   breach.timestamp       → alarm.dateTime
        │   breach.breach_type     → alarm.type  │
        │   breach.node_name +     → alarm.      │
        │    threshold + value       description │
        │   breach.acknowledged_by → alarm.      │
        │                             acknowledgedBy
        │   breach.acknowledged    → alarm.status│
        │   breach.breach_type     → alarm.      │
        │                             severity   │
        └───────────────────┬────────────────────┘
                            │
                ┌───────────▼──────────┐
                │   setAllAlarms()     │
                │   (Update State)     │
                │                      │
                │  [Alarm[], ...]      │
                │  (Real Data)         │
                └───────────┬──────────┘
                            │
                ┌───────────▼──────────────────────────────────┐
                │   Component Render Logic                     │
                │                                               │
                │   if (loading) → Show spinner               │
                │                                               │
                │   if (allAlarms.length === 0)               │
                │     → Show empty state                       │
                │                                               │
                │   else                                       │
                │     → Apply filters (search, type, range)   │
                │     → Paginate results                       │
                │     → Render table/cards                     │
                │     → Show pagination controls              │
                │     → Show export button                     │
                └───────────┬──────────────────────────────────┘
                            │
                ┌───────────▼──────────┐
                │  USER SEES:          │
                │                      │
                │  ✅ Real Alarm Data  │
                │  ✅ Loading States   │
                │  ✅ Filtered Results │
                │  ✅ Pagination      │
                │  ✅ Export Button    │
                └──────────────────────┘
```

---

## Component Interaction Flow

```
USER ACTION                    COMPONENT STATE           STORAGE
─────────────                  ──────────────            ──────

1. Load page          ┌──────────────────────┐
   (first time)       │  Analysis.tsx        │
                      │  useEffect (mount)   │──────► localStorage.getItem()
                      │  No saved station    │         (returns null)
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │  Load first station  │
                      │  setSelectedWell()   │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │  Pass to AlarmsTable │
                      │  wellId="Station A"  │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │ AlarmsTable          │
                      │ useEffect (mount)    │──────► fetchAlarmsFromDatabase()
                      │ Fetch from API       │         GET /api/breaches/
                      │ Show alarms          │
                      └──────────────────────┘


2. User selects     ┌──────────────────────┐
   different        │  Analysis.tsx        │
   station          │  onChange handler    │
                    │  setSelectedWell()   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  useEffect dependency│
                    │  [selectedWell]      │──────► localStorage.setItem()
                    │  Save to storage     │         (saves "Station B")
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Pass to AlarmsTable │
                    │  wellId="Station B"  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ AlarmsTable          │
                    │ useEffect dependency │
                    │ [wellId] changed!    │──────► fetchAlarmsFromDatabase()
                    │ Fetch new data       │         GET /api/breaches/
                    │ setAllAlarms()       │
                    │ Show new alarms      │
                    └──────────────────────┘


3. Page reload      ┌──────────────────────┐
   (F5)             │  Analysis.tsx        │
                    │  useEffect (mount)   │──────► localStorage.getItem()
                    │  Check storage       │         (returns "Station B")
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Found saved station │
                    │  setSelectedWell()   │
                    │  ("Station B")       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Pass to AlarmsTable │
                    │  wellId="Station B"  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ AlarmsTable          │
                    │ Shows "Station B"    │
                    │ data automatically   │
                    │ ✅ Persistence      │
                    │    works!            │
                    └──────────────────────┘
```

---

## State Management Overview

### Analysis.tsx State
```
┌─────────────────────────────────────┐
│  Component State                    │
├─────────────────────────────────────┤
│  stations: Station[]                │  ◀─ From API
│  selectedWell: string               │  ◀─ From localStorage (persistent)
│  loadingStations: boolean           │
│  nodes: Node[]                      │  ◀─ Related data
│  historyData: any[]                 │  ◀─ Related data
│  dateRange: DateRange               │  ◀─ User input
│  searchTerm: string                 │  ◀─ User input
│  alarmFilter: string                │  ◀─ User input
└─────────────────────────────────────┘
```

### AlarmsTable.tsx State
```
┌─────────────────────────────────────┐
│  Component State                    │
├─────────────────────────────────────┤
│  allAlarms: Alarm[]                 │  ◀─ From API (/api/breaches/)
│  loading: boolean                   │  ◀─ Fetch status
│  currentPage: number                │  ◀─ Pagination
│  expandedAlarmId: string|number|null│  ◀─ UI state
├─────────────────────────────────────┤
│  Derived (from props + state):      │
│  filteredAlarms: Alarm[]            │  ◀─ After filtering
│  paginatedAlarms: Alarm[]           │  ◀─ After pagination
└─────────────────────────────────────┘
```

---

## Data Flow: From API to Display

```
API Response (ThresholdBreach)
          │
          ▼
    ┌──────────────┐
    │ breach.id: 1 │
    │ breach_type: │
    │   "HIGH"     │
    │ timestamp:   │
    │   "2024..."  │
    └──────────────┘
          │
          ▼
    [Map to Alarm]
          │
          ▼
    ┌──────────────┐
    │ id: 1        │
    │ type:        │
    │   "HIGH      │
    │   Breach"    │
    │ dateTime:    │
    │   "Jan 15..." │
    │ severity:    │
    │   "high"     │
    └──────────────┘
          │
          ▼
    [Apply Filters]
          │
          ▼
    [Paginate]
          │
          ▼
    [Render JSX]
          │
          ▼
    ┌──────────────────────────┐
    │ Display in Table/Cards   │
    │ ✅ Real Data             │
    └──────────────────────────┘
```

---

## localStorage Lifecycle

```
FIRST VISIT
  │
  ▼
Check: localStorage.getItem("selectedWell")
  │
  ├─ NULL (first visit)
  │  │
  │  ▼
  │ Set default: first station
  │ 
  └─ HAS VALUE (returning user)
     │
     ▼
    Validate: station still exists?
     │
     ├─ YES → Use saved station
     │
     └─ NO → Use first station


ONGOING USAGE
  │
  ▼
User selects station
  │
  ▼
useEffect with [selectedWell]
  │
  ▼
localStorage.setItem("selectedWell", value)
  │
  ▼
Station saved in browser storage


PAGE RELOAD
  │
  ▼
Component remounts
  │
  ▼
useEffect with [] (mount only)
  │
  ▼
localStorage.getItem("selectedWell")
  │
  ├─ FOUND → Restore station
  │
  └─ NOT FOUND → Use first station
  │
  ▼
State updated
  │
  ▼
Render with saved selection ✅
```

---

## API Call Sequence

```
useEffect triggers (mount or wellId/dateRange change)
              │
              ▼
    fetchAlarmsFromDatabase()
              │
              ▼
    axios.create({
      baseURL: "http://localhost:8000/api",
      headers: { "Content-Type": "application/json" }
    })
              │
              ▼
    Add interceptor for token auth
              │
              ▼
    GET /api/breaches/
    Headers: Authorization: Token xyz...
              │
              ▼
    Backend processes request
              │
              ├─ Valid token?
              │  ├─ YES → Query database
              │  └─ NO → 401 Unauthorized
              │
              ▼
    Response: [{ ThresholdBreach }, ...]
              │
              ▼
    Map to Alarm format
              │
              ▼
    Return Promise<Alarm[]>
              │
              ▼
    setAllAlarms(alarms)
              │
              ▼
    setLoading(false)
              │
              ▼
    Component re-renders
              │
              ▼
    Display real data ✅
```

---

## Error Handling Flow

```
Try {
  const res = await api.get("/breaches/")
  const breaches = Array.isArray(res.data) ? res.data : []
  return breaches.map(breach => ({ ... }))
}
Catch (error) {
  console.error("Error fetching alarms:", error)
  return [] ◀────── Return empty array
}

If error occurs:
  │
  ├─ Network error → return []
  ├─ 401 Unauthorized → return []
  ├─ 500 Server error → return []
  └─ Invalid data → return []
      │
      ▼
  Component still renders
      │
      ▼
  Empty state shows ✅
  (No crash, graceful fallback)
```

---

## Summary of Data Flow

1. **User loads page** → Check localStorage for saved station
2. **Saved station found** → Restore and display it
3. **Station selection made** → Save to localStorage & pass to child
4. **AlarmsTable receives wellId** → Trigger useEffect
5. **useEffect fires** → Call fetchAlarmsFromDatabase()
6. **Fetch function runs** → Make authenticated API call to /api/breaches/
7. **API responds** → Map ThresholdBreach objects to Alarm format
8. **setAllAlarms() called** → Update component state with real data
9. **Apply filters** → Search, type, date range filtering
10. **Paginate results** → Show 10 per page
11. **Render JSX** → Display in responsive table/cards
12. **User sees real data** → ✅ From database, not mocked

---

**Architecture Complete** ✅
- Station persists to localStorage
- API integration pulls real data
- Error handling graceful
- Data transforms correctly
- UI displays real alarms
