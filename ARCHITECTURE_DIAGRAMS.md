# System Architecture Diagrams

## 1. Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                          OPC UA SERVERS                                  │
│                                                                          │
└────────────────────────┬─────────────────────────────────────────────────┘
                         │ OPC UA Read Values
                         ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  read_data.py (Background Thread - runs every 20 seconds)               │
│                                                                          │
│  for each node:                                                         │
│    value = opc_node.get_value()                                        │
│    node.last_value = value                                             │
│    node.save()                                                          │
│                                                                          │
└───────────────────┬──────────────────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  evaluate_threshold(node, value) - from services.py                     │
│                                                                          │
│  1. Get threshold = TagThreshold.objects.get(node=node)                │
│  2. Compare:                                                            │
│     - value > critical_level?  → level = "Critical"                    │
│     - value > warning_level?   → level = "Warning"                     │
│     - value < min_value?       → level = "Warning"                     │
│     - value > max_value?       → level = "Warning"                     │
│  3. If breach: ThresholdBreach.objects.create(...)                     │
│                                                                          │
└───────────────────┬──────────────────────────────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
    Breach?              No Breach
         │                     │
         ↓                     ↓
   Create Event            Continue
   in Database
         │
         ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ThresholdBreach Event Table (Immutable Log)                            │
│                                                                          │
│  id | node_id | threshold_id | value | level    | timestamp | ack    │
│  ---|---------|--------------|-------|----------|-----------|------  │
│  1  | 42      | 5            | 3450  | Critical | 2025-01-22| false  │
│  2  | 42      | 5            | 3460  | Critical | 2025-01-22| false  │
│  3  | 42      | 5            | 3440  | Warning  | 2025-01-22| true   │
│ ... | ...     | ...          | ...   | ...      | ...       | ...    │
│                                                                          │
└───────────────────┬──────────────────────────────────────────────────────┘
                    │
     ┌──────────────┴────────────────────┐
     │                                   │
     ↓                                   ↓
  Query for                         Query for
  Breach Count                    Breach Details
     │                                   │
     ↓                                   ↓
  SELECT COUNT(*)            SELECT * FROM
  FROM breach                 breach WHERE ...
  WHERE node=42              ORDER BY timestamp DESC
  AND timestamp >
      now()-24h
     │                                   │
     └──────────────┬────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  API Serializer (Computed Fields)                                       │
│                                                                          │
│  {                                                                      │
│    "id": 5,                                                            │
│    "parameter": "Well Pressure",                                       │
│    "min_value": 2000,                                                 │
│    "max_value": 3500,                                                 │
│    "warning_level": 3200,                                             │
│    "critical_level": 3400,                                            │
│    "breaches_24h": 15,          ← Computed from COUNT query           │
│    "breaches_critical_24h": 3,  ← Computed from filtered COUNT        │
│    "breaches_warning_24h": 12,  ← Computed from filtered COUNT        │
│    "unacknowledged_breaches": 2 ← Computed from COUNT where ack=false │
│  }                                                                      │
│                                                                          │
└───────────────────┬──────────────────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Frontend: ThresholdsTab Component                                      │
│                                                                          │
│  1. User selects station                                               │
│  2. Fetch: GET /api/thresholds/?station=X                             │
│  3. Display:                                                            │
│     - Parameter names                                                  │
│     - Editable limit fields                                            │
│     - Breach statistics (from API response)                            │
│  4. User edits → Mark unsaved                                          │
│  5. User saves → PATCH /api/thresholds/{id}/                         │
│  6. Backend updates TagThreshold                                       │
│  7. Next read cycle uses new limits                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## 2. Data Model Relationships

```
OPCUANode (Existing)
├─ id
├─ tag_name
├─ node_id
├─ last_value
├─ client_config (FK → OpcUaClientConfig)
└─ ... other fields ...
      │
      │ 1:1 relationship
      ↓
TagThreshold (NEW)
├─ id
├─ node (OneToOne → OPCUANode)
├─ min_value
├─ max_value
├─ warning_level
├─ critical_level
├─ severity
├─ active
├─ created_at
├─ updated_at
      │
      │ 1:M relationship
      ↓
ThresholdBreach (NEW)
├─ id
├─ node (FK → OPCUANode)
├─ threshold (FK → TagThreshold)
├─ value
├─ level
├─ acknowledged
├─ acknowledged_by
├─ acknowledged_at
└─ timestamp
```

## 3. Component Interaction

```
┌─────────────────────────────────────┐
│     React Frontend Component        │
│        ThresholdsTab.tsx            │
└────────────┬──────────────────────────┘
             │
             │ 1. Load stations
             ↓
      ┌─────────────────┐
      │ /api/clients/   │
      └────────┬────────┘
               │
      ┌────────↓────────┐
      │ Station List    │
      │ ├─ Station-01   │
      │ ├─ Station-02   │
      │ └─ Station-03   │
      └────────┬────────┘
               │
               │ 2. User selects station
               ↓
      ┌─────────────────────────┐
      │ /api/thresholds/        │
      │ ?station=Station-01     │
      └─────────┬───────────────┘
                │
      ┌─────────↓──────────┐
      │ Threshold List     │
      │ ├─ Pressure        │
      │ │  ├─ min: 2000    │
      │ │  ├─ max: 3500    │
      │ │  ├─ warn: 3200   │
      │ │  ├─ crit: 3400   │
      │ │  └─ breaches: 15 │
      │ ├─ Temperature     │
      │ │  └─ ...          │
      │ └─ Flow Rate       │
      │    └─ ...          │
      └─────────┬──────────┘
                │
        ┌───────┴───────┐
        │ User edits    │
        │ limits        │
        └───────┬───────┘
                │
       ┌────────↓────────────┐
       │ PATCH /api/         │
       │ thresholds/5/       │
       │ {                   │
       │  warning_level: 3250│
       │  critical_level: 3450
       │ }                   │
       └────────┬────────────┘
                │
        ┌───────↓────────┐
        │ Backend        │
        │ Updates DB     │
        └───────┬────────┘
                │
        ┌───────↓──────────────────┐
        │ Next OPC Read            │
        │ Evaluates with new limits│
        └────────────────────────────┘
```

## 4. Class Hierarchy

```
models.Model
│
├── TagThreshold
│   ├── node: OneToOneField(OPCUANode)
│   ├── min_value: FloatField
│   ├── max_value: FloatField
│   ├── warning_level: FloatField
│   ├── critical_level: FloatField
│   ├── severity: CharField(choices)
│   ├── active: BooleanField
│   ├── created_at: DateTimeField
│   └── updated_at: DateTimeField
│
└── ThresholdBreach
    ├── node: ForeignKey(OPCUANode)
    ├── threshold: ForeignKey(TagThreshold)
    ├── value: FloatField
    ├── level: CharField(choices)
    ├── acknowledged: BooleanField
    ├── acknowledged_by: CharField
    ├── acknowledged_at: DateTimeField
    └── timestamp: DateTimeField

viewsets.ModelViewSet
│
├── TagThresholdViewSet
│   ├── GET /api/thresholds/
│   ├── GET /api/thresholds/{id}/
│   ├── POST /api/thresholds/
│   ├── PATCH /api/thresholds/{id}/
│   ├── DELETE /api/thresholds/{id}/
│   └── Custom Actions:
│       ├── GET /api/thresholds/{id}/breaches/
│       └── GET /api/thresholds/{id}/breaches_24h/
│
└── ThresholdBreachViewSet
    ├── GET /api/breaches/
    ├── GET /api/breaches/{id}/
    └── Custom Actions:
        ├── POST /api/breaches/{id}/acknowledge/
        ├── GET /api/breaches/unacknowledged/
        └── GET /api/breaches/recent/
```

## 5. State Machine: Threshold Evaluation

```
                    ┌──────────────────┐
                    │  OPC UA Value    │
                    │   Received       │
                    └────────┬─────────┘
                             │
                             ↓
                    ┌──────────────────┐
                    │ Is Threshold     │
                    │ Configured?      │
                    └────┬─────────┬───┘
                         │         │
                    YES  │         │  NO
                         ↓         ↓
                    ┌─────────┐  SKIP
                    │ Compare │  (Log as info)
                    │ Levels  │
                    └────┬────┘
                         │
         ┌───────────────┼────────────────┐
         │               │                │
    value ≥ crit?   value ≥ warn?   No Breach
         │               │                │
         ↓               ↓                ↓
    CRITICAL         WARNING           NORMAL
    Breach           Breach            (End)
         │               │
         └───────────────┴───────┬──────┘
                                 │
                    ┌────────────↓────────────┐
                    │ Create ThresholdBreach  │
                    │ Event Record            │
                    └────────────┬────────────┘
                                 │
                    ┌────────────↓────────────┐
                    │ Log to Console          │
                    │ Alert (optional)        │
                    │ Continue...             │
                    └─────────────────────────┘
```

## 6. API Request/Response Flow

```
REQUEST:
┌──────────────────────────────────────┐
│ GET /api/thresholds/?station=ST-01   │
│ Header: Authorization: Token ...     │
│                                      │
│ Query Params:                        │
│ - station = "Station-01"             │
│ - limit = 20 (default)               │
│ - offset = 0 (default)               │
└──────────────────────────────────────┘
                 │
                 │ Process in Backend
                 ↓
┌──────────────────────────────────────┐
│ ViewSet Logic:                       │
│                                      │
│ 1. Check authentication              │
│ 2. Filter queryset by station        │
│ 3. Apply pagination                  │
│ 4. Serialize each object             │
│ 5. Compute breach counts             │
│    (multiple queries per threshold)  │
│ 6. Return JSON response              │
└──────────────────────────────────────┘
                 │
                 ↓
RESPONSE:
┌──────────────────────────────────────┐
│ HTTP 200 OK                          │
│ Content-Type: application/json       │
│                                      │
│ {                                    │
│   "count": 3,                        │
│   "next": null,                      │
│   "previous": null,                  │
│   "results": [                       │
│     {                                │
│       "id": 5,                       │
│       "parameter": "Pressure",       │
│       "min_value": 2000,             │
│       "max_value": 3500,             │
│       "warning_level": 3200,         │
│       "critical_level": 3400,        │
│       "breaches_24h": 15,  ← Computed│
│       ...                            │
│     },                               │
│     { ... },                         │
│     { ... }                          │
│   ]                                  │
│ }                                    │
└──────────────────────────────────────┘
```

## 7. Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    Production Server                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Django Backend                        │  │
│  │  ┌────────────────────────────────────────────┐ │  │
│  │  │ read_data.py                               │ │  │
│  │  │ (Thread: reads OPC every 20s)              │ │  │
│  │  │                                            │ │  │
│  │  │  - Get OPC values                          │ │  │
│  │  │  - Update OPCUANode.last_value             │ │  │
│  │  │  - Call evaluate_threshold()               │ │  │
│  │  │  - Create ThresholdBreach if needed        │ │  │
│  │  └────────────────────────────────────────────┘ │  │
│  │                                                  │  │
│  │  ┌────────────────────────────────────────────┐ │  │
│  │  │ API Server                                 │ │  │
│  │  │ (REST endpoints)                           │ │  │
│  │  │                                            │ │  │
│  │  │ /api/thresholds/                           │ │  │
│  │  │ /api/breaches/                             │ │  │
│  │  │ /api/...                                   │ │  │
│  │  └────────────────────────────────────────────┘ │  │
│  │                                                  │  │
│  │  ┌────────────────────────────────────────────┐ │  │
│  │  │ Database (PostgreSQL/SQLite)               │ │  │
│  │  │                                            │ │  │
│  │  │ Tables:                                    │ │  │
│  │  │ - TagThreshold (thresholds config)         │ │  │
│  │  │ - ThresholdBreach (event log)              │ │  │
│  │  │ - OPCUANode (nodes with last_value)        │ │  │
│  │  │ - OpcUaReadLog (telemetry)                 │ │  │
│  │  │ - ... other tables ...                     │ │  │
│  │  └────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Frontend (React)                      │  │
│  │  ┌────────────────────────────────────────────┐ │  │
│  │  │ ThresholdsTab Component                    │ │  │
│  │  │                                            │ │  │
│  │  │ - Station selector                         │ │  │
│  │  │ - Threshold table (editable)               │ │  │
│  │  │ - Breach statistics                        │ │  │
│  │  │ - Save button                              │ │  │
│  │  └────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           │
              ┌────────────↓────────────┐
              │   User's Browser       │
              │   (Any network)        │
              └────────────────────────┘
```

## 8. Key Numbers

```
Typical Thresholds per Station:     10-50
Typical OPC Read Frequency:         Every 20 seconds
Typical Breaches per Day:           0-100 (per threshold)
Event Log Retention:                90 days (configurable)
API Response Time:                  <100ms
Database Query Time:                <10ms

Memory Usage (Backend):             ~200MB base + logs
Storage Usage (per 1000 breaches): ~50KB (compact)
```

## 9. Quick Decision Tree

```
User wants to...
│
├─ Set threshold limits
│  └─ Use ThresholdsTab component
│     └─ PATCH /api/thresholds/
│
├─ View breach history
│  └─ GET /api/breaches/?node=X
│
├─ Acknowledge a breach
│  └─ POST /api/breaches/{id}/acknowledge/
│
├─ Get unacknowledged breaches
│  └─ GET /api/breaches/unacknowledged/
│
├─ Count 24h breaches by type
│  └─ GET /api/thresholds/{id}/breaches_24h/
│
├─ Configure auto-alerts
│  └─ Add notification service to evaluate_threshold()
│
└─ Generate reports
   └─ Query ThresholdBreach with date filters
      └─ Aggregate by node/level/station
```

These diagrams provide visual understanding of how all components interact!
