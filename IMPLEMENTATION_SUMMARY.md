# Implementation Summary: Backend-Driven Threshold & Alarm System

## 🎉 What Was Implemented

A complete backend-driven threshold and alarm system that moves all business logic out of the frontend and into the Django backend.

### ✅ Backend Changes

#### 1. New Models (`roams_opcua_mgr/models/threshold_model.py`)
- **TagThreshold**: Stores configured limits (min, max, warning_level, critical_level)
- **ThresholdBreach**: Event log for every threshold violation with audit trail
- Proper indexes for query performance
- One-to-one relationship between TagThreshold and OPCUANode

#### 2. Threshold Evaluation Service (`roams_opcua_mgr/services.py`)
- `evaluate_threshold()`: Checks values against thresholds, logs breaches
- `get_breach_count_24h()`: Dynamically computes breach counts
- `get_unacknowledged_breaches()`: Retrieves unacknowledged events
- `acknowledge_breach()`: Records operator acknowledgement

#### 3. Integration with OPC UA Read Loop (`read_data.py`)
- Added threshold evaluation in the main read cycle
- Calls `evaluate_threshold()` for each node read
- Creates event records for breaches
- Works continuously in background

#### 4. DRF Serializers (`roams_api/serializers.py`)
- **TagThresholdSerializer**: Includes computed breach counts
  - `breaches_24h`: Total breaches last 24 hours
  - `breaches_critical_24h`: Critical breaches only
  - `breaches_warning_24h`: Warning breaches only
  - `unacknowledged_breaches`: Count of unacknowledged
- **ThresholdBreachSerializer**: For breach event records

#### 5. API ViewSets (`roams_api/views.py`)
- **TagThresholdViewSet**: Full CRUD for thresholds
  - Filters by station
  - Endpoint to get breaches for threshold
  - Endpoint for 24h breach counts
- **ThresholdBreachViewSet**: Read-only breach management
  - Filters by node, level, acknowledged status
  - Acknowledge endpoint (POST)
  - Unacknowledged list
  - Recent breaches list

#### 6. API Endpoints Registered (`roams_api/urls.py`)
- `/api/thresholds/` - List, create, update, delete thresholds
- `/api/thresholds/{id}/breaches/` - Get breach history
- `/api/thresholds/{id}/breaches_24h/` - 24h breach counts
- `/api/breaches/` - List all breaches
- `/api/breaches/unacknowledged/` - Unacknowledged only
- `/api/breaches/recent/` - Recent breaches
- `/api/breaches/{id}/acknowledge/` - Acknowledge a breach

#### 7. Database Migration
- Created migration: `0007_tagthreshold_thresholdbreach_and_more.py`
- Applied successfully with proper indexes

### ✅ Frontend Changes

#### 1. Updated `ThresholdsTab.tsx` Component
- **Station Selection**: Dropdown to select which station's thresholds to view
- **Real Data Fetching**: Loads thresholds from `/api/thresholds/?station=`
- **Editable Fields**: Users can modify:
  - min_value
  - max_value
  - warning_level
  - critical_level
  - severity
- **Unsaved Changes Tracking**: UI shows which rows have been modified
- **Save Functionality**: Sends PATCH requests to backend
- **Breach Statistics**: Displays:
  - Total breaches in 24h
  - Critical breaches breakdown
  - Warning breaches breakdown
  - Unacknowledged count
- **Loading States**: Shows spinners during load/save

#### 2. Removed Mock Data
- No more hardcoded `mockThresholds`
- No local state calculations
- No frontend-only logic

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      OPC UA Server                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              read_data.py (Read Loop)                           │
│  - Runs every 20 seconds in background                          │
│  - Reads all configured nodes                                   │
│  - Updates OPCUANode.last_value                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│          evaluate_threshold(node_config, value)                 │
│  - Looks up TagThreshold for node                               │
│  - Compares value against levels                                │
│  - If breach → Creates ThresholdBreach record                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              ThresholdBreach Event Log (DB)                     │
│  - One row per breach event                                     │
│  - Includes: node, value, level, timestamp, acknowledged       │
│  - Full audit trail for reporting                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│           API Serializer (Computed Fields)                      │
│  - breaches_24h = Query().filter(last_24h).count()             │
│  - breaches_critical_24h = Query().filter(...critical).count()  │
│  - breaches_warning_24h = Query().filter(...warning).count()    │
│  - unacknowledged = Query().filter(acknowledged=False).count()  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│       Frontend: ThresholdsTab.tsx (Read + Configure)            │
│  - Displays thresholds per station                              │
│  - Shows breach statistics                                      │
│  - Allows editing limits                                        │
│  - Saves via API PATCH endpoint                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Key Principles Implemented

### ✅ What's in Backend (Authoritative)
- ✓ Threshold limits (min/max/warning/critical)
- ✓ Threshold breach events (audit log)
- ✓ Breach evaluation logic
- ✓ Acknowledgement tracking
- ✓ Breach counting (computed on-the-fly)
- ✓ Station/node relationships

### ✅ What's in Frontend (Display Only)
- ✓ Threshold configuration UI
- ✓ Breach statistics display
- ✓ Station/parameter selection
- ✓ Real-time data refresh from API

### ❌ What's NOT in Frontend
- ✗ Hardcoded mock data
- ✗ Alarm logic/evaluation
- ✗ Breach counting/storage
- ✗ Acknowledgement logic
- ✗ Severity determination

## 🔐 Why This Architecture?

| Problem | Old (Frontend) | New (Backend) |
|---------|---|---|
| **UI Refresh** | Lose all data ❌ | Data persisted ✅ |
| **Multiple Users** | Inconsistency ❌ | Single source of truth ✅ |
| **Audit Trail** | None ❌ | Full breach log ✅ |
| **Alarms When UI Closed** | Won't work ❌ | Works always ✅ |
| **Breach Counts** | Stored (stale) ❌ | Computed (current) ✅ |
| **Data Consistency** | Manual sync ❌ | Automatic ✅ |
| **Reporting** | Incomplete ❌ | Complete history ✅ |

## 📦 Files Created

```
roams_backend/
├── roams_opcua_mgr/
│   ├── models/
│   │   ├── threshold_model.py (NEW)
│   │   └── __init__.py (MODIFIED - added imports)
│   ├── services.py (NEW - threshold evaluation logic)
│   ├── read_data.py (MODIFIED - integrated evaluation)
│   └── migrations/
│       └── 0007_tagthreshold_thresholdbreach_and_more.py (NEW)
│
└── roams_api/
    ├── serializers.py (MODIFIED - added threshold serializers)
    ├── views.py (MODIFIED - added viewsets)
    └── urls.py (MODIFIED - registered endpoints)

roams_frontend/src/components/settings/
└── ThresholdsTab.tsx (COMPLETELY REWRITTEN)

THRESHOLD_ARCHITECTURE.md (NEW - documentation)
```

## 🚀 Testing the Implementation

### 1. Create a Threshold
```bash
curl -X POST http://localhost:8000/api/thresholds/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "node": 42,
    "min_value": 100,
    "max_value": 500,
    "warning_level": 450,
    "critical_level": 480,
    "severity": "Critical",
    "active": true
  }'
```

### 2. View Thresholds for Station
```bash
curl http://localhost:8000/api/thresholds/?station=Station-01 \
  -H "Authorization: Token YOUR_TOKEN"
```

### 3. Check Recent Breaches
```bash
curl http://localhost:8000/api/breaches/recent/?hours=24 \
  -H "Authorization: Token YOUR_TOKEN"
```

### 4. Acknowledge a Breach
```bash
curl -X POST http://localhost:8000/api/breaches/1/acknowledge/ \
  -H "Authorization: Token YOUR_TOKEN"
```

## 🎯 What Happens Now

1. **User opens ThresholdsTab**
   - Selects a station from dropdown
   - Component fetches thresholds from API
   - Displays with current 24h breach counts

2. **User edits a threshold**
   - Changes min/max/warning/critical values
   - UI marks as "unsaved" (yellow highlight)
   - "Save Changes" button shows count

3. **User clicks Save**
   - Sends PATCH requests for changed rows
   - Backend updates TagThreshold records
   - Next OPC UA read will use new limits

4. **OPC UA reads values**
   - read_data.py calls evaluate_threshold()
   - Checks against TagThreshold limits
   - If breach: Creates ThresholdBreach record
   - Never loses data, always logged

5. **Breach counts stay current**
   - API computes from ThresholdBreach events
   - Always accurate, never stale
   - Works even if UI refreshes

## ✨ Benefits

- ✅ **Persistent**: Thresholds and breaches survive UI refresh
- ✅ **Multi-user**: All users see same data
- ✅ **Auditable**: Full breach history for compliance
- ✅ **Reliable**: Alarms work 24/7 regardless of UI
- ✅ **Correct**: Computed counts never stale
- ✅ **Scalable**: Proper indexes for performance
- ✅ **Maintainable**: Clear separation of concerns

## 📝 Documentation

Full architecture documentation in: `/THRESHOLD_ARCHITECTURE.md`

Covers:
- Data models
- Service layer
- API design
- Data flow
- Integration points
- Performance optimization
- Next steps (notifications, reports, etc.)
