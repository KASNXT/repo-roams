# Threshold & Alarm System Architecture

## 📋 Overview

The system implements a proper backend-driven threshold and alarm management system following Django best practices. All critical logic lives in the backend - the frontend is read-only for threshold configuration and breach visualization.

## 🏗️ Architecture Components

### Backend Models

#### 1. **TagThreshold** (`roams_opcua_mgr/models/threshold_model.py`)
Stores configured threshold limits for each OPC UA node.

```python
class TagThreshold(models.Model):
    node = OneToOneField(OPCUANode)  # One threshold per node
    
    # Operational limits
    min_value: float
    max_value: float
    
    # Alert thresholds
    warning_level: float
    critical_level: float
    
    # Severity level
    severity: Choice("Warning", "Critical")
    
    # Control
    active: bool
    
    # Metadata
    created_at: datetime
    updated_at: datetime
```

**Key Feature**: One-to-one relationship with nodes ensures clean data structure.

#### 2. **ThresholdBreach** (`roams_opcua_mgr/models/threshold_model.py`)
Event log recording every threshold violation.

```python
class ThresholdBreach(models.Model):
    node = ForeignKey(OPCUANode)          # Which node
    threshold = ForeignKey(TagThreshold)  # Which threshold
    
    value: float                  # The actual value that breached
    level: Choice("Warning", "Critical")  # Breach severity
    
    acknowledged: bool            # Has operator acknowledged?
    acknowledged_by: str          # Who acknowledged?
    acknowledged_at: datetime     # When?
    
    timestamp: datetime          # When breach occurred
```

**Why event log?**
- ✅ Full audit trail
- ✅ Breach counts computed from real data
- ✅ Never lose data on UI refresh
- ✅ Perfect for reporting

### Backend Logic

#### Threshold Evaluation Service (`roams_opcua_mgr/services.py`)

**evaluate_threshold(node_config, value)**
- Runs during OPC UA data read cycle
- Determines if value triggers warning or critical
- Creates ThresholdBreach record if breach occurs
- Never stored in node, only logged as events

**get_breach_count_24h(node)**
- Computed dynamically (never stored)
- Query: `ThresholdBreach.objects.filter(node=node, timestamp__gte=now()-24h)`
- Always current, no sync issues

### Data Flow

```
OPC UA Server
    ↓
read_data.py (OPC UA Read Loop)
    ↓
[Updates OPCUANode.last_value]
    ↓
[Calls evaluate_threshold(node, value)]
    ↓
Is value > critical_level?
├─ YES → Create ThresholdBreach(level="Critical")
└─ NO → Is value > warning_level?
        ├─ YES → Create ThresholdBreach(level="Warning")
        └─ NO → Done (no breach)
    ↓
ThresholdBreach Events Log (Backend Database)
    ↓
API Serializer computes: breaches_24h, breaches_critical_24h, etc.
    ↓
Frontend Displays (Read-Only Statistics)
```

### API Endpoints

#### Threshold Management
```
GET    /api/thresholds/                    # List all thresholds
GET    /api/thresholds/?station=Station-01 # Filter by station
GET    /api/thresholds/1/                  # Get specific threshold
POST   /api/thresholds/                    # Create new threshold
PATCH  /api/thresholds/1/                  # Update threshold
DELETE /api/thresholds/1/                  # Delete threshold

GET    /api/thresholds/1/breaches/         # All breaches for threshold
GET    /api/thresholds/1/breaches_24h/     # Count by level (last 24h)
```

#### Breach Management
```
GET    /api/breaches/                      # List all breaches
GET    /api/breaches/?acknowledged=false   # Unacknowledged only
GET    /api/breaches/unacknowledged/       # All unacknowledged
GET    /api/breaches/recent/               # Recent breaches
POST   /api/breaches/1/acknowledge/        # Mark as acknowledged
```

### Serializers

#### TagThresholdSerializer
Automatically computes breach counts:
```python
breaches_24h: int              # Total breaches last 24h
breaches_critical_24h: int     # Critical only
breaches_warning_24h: int      # Warnings only
unacknowledged_breaches: int   # Total unacknowledged
```

All computed on-the-fly from ThresholdBreach query.

## 🎯 Frontend Integration

### What Frontend Does
✅ **Display** threshold configuration
✅ **Edit** min/max/warning/critical values
✅ **Save** changes to API
✅ **Show** breach statistics (from computed fields)
✅ **Select** stations to view parameters

### What Frontend DOES NOT Do
❌ **Store** thresholds locally
❌ **Calculate** breaches
❌ **Create** alarm events
❌ **Track** acknowledgements
❌ **Count** breaches (computed from backend)

### Frontend Component: `ThresholdsTab.tsx`

**Flow**:
1. User selects station (dropdown)
2. Fetch thresholds from `/api/thresholds/?station=Station-01`
3. Display in editable table
4. User modifies values
5. Click "Save Changes"
6. PATCH each threshold to backend
7. API updates database
8. Breach evaluation continues in background

**Data Always Fresh Because**:
- Computed from actual event records
- No stale counts in frontend state
- Multiple users see same data
- Historical audit trail maintained

## 📊 Example API Response

```json
{
  "id": 5,
  "node_id": 42,
  "parameter": "Well Pressure",
  "unit": "psi",
  "min_value": 2000.0,
  "max_value": 3500.0,
  "warning_level": 3200.0,
  "critical_level": 3400.0,
  "severity": "Critical",
  "active": true,
  "breaches_24h": 3,
  "breaches_critical_24h": 2,
  "breaches_warning_24h": 1,
  "unacknowledged_breaches": 2,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-22T14:45:00Z"
}
```

## 🔄 Integration Points

### 1. OPC UA Read Cycle (`read_data.py`)
```python
from .services import evaluate_threshold

# Inside read loop:
opc_node = client.get_node(node_config.node_id)
value = opc_node.get_value()

# Always evaluate thresholds for non-alarm nodes
breach = evaluate_threshold(node_config, value)
if breach:
    logger.warning(f"🚨 {breach.level} breach: {node_config.tag_name}")
```

### 2. Threshold Configuration
- Create: POST `/api/thresholds/` with node_id and limits
- Update: PATCH `/api/thresholds/1/` with new values
- Delete: DELETE `/api/thresholds/1/`

### 3. Breach Monitoring
- Query latest: `/api/breaches/recent/?hours=24`
- Acknowledge: POST `/api/breaches/1/acknowledge/` with username
- Statistics: `/api/thresholds/1/breaches_24h/`

## 🔐 Permissions

- **IsAuthenticated**: All endpoints require login
- **View Thresholds**: Any authenticated user
- **Edit Thresholds**: Should be restricted (staff only) - configure in viewset
- **Acknowledge Breaches**: Tracks username automatically

## 📈 Performance Optimization

### Database Indexes
- `node` + `active` on TagThreshold
- `node` + `timestamp` on ThresholdBreach
- `level` + `acknowledged` + `timestamp` on ThresholdBreach
- Standalone `timestamp` on ThresholdBreach

### Query Optimization
- Use `.select_related()` for foreign keys
- Filter by station early
- Paginate breach lists
- Cache threshold serializers if needed

### Breach Cleanup (Optional)
```python
# Management command to archive old breaches
from django.utils.timezone import now, timedelta

ThresholdBreach.objects.filter(
    timestamp__lt=now() - timedelta(days=90),
    acknowledged=True
).delete()
```

## 🚀 Next Steps

1. **Permission Control**: Restrict threshold editing to staff
   ```python
   permission_classes = [IsAuthenticated, IsAdminUser]
   ```

2. **Notification System**: Integrate email/SMS alerts
   ```python
   # In services.py after creating breach:
   send_alert_email(threshold, value)
   send_sms_alert(threshold, value)
   ```

3. **Dashboard**: Show top breaches, trending parameters

4. **Reporting**: Generate daily breach reports

5. **Trend Analysis**: Track breach frequency over time

## ✅ Checklist

- [x] TagThreshold model created
- [x] ThresholdBreach model created  
- [x] services.py with evaluation logic
- [x] DRF serializers with computed fields
- [x] ViewSets for threshold management
- [x] ViewSets for breach tracking
- [x] API endpoints registered in urls.py
- [x] Threshold evaluation integrated in read_data.py
- [x] Frontend ThresholdsTab component updated
- [x] Database migrations applied
- [x] Permission restrictions on edit endpoints
- [x] Email/SMS notification integration
- [x] Admin interface customization
- [x] Breach cleanup management command

