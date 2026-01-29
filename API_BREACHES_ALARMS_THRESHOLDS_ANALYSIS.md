# API Endpoints: Breaches, Alarms & Thresholds Analysis

## Overview
This document provides a comprehensive analysis of all API endpoints related to breaches, alarms, and thresholds in the ROAMS backend.

---

## 📋 Table of Contents
1. [URL Routes](#url-routes)
2. [Models](#models)
3. [ViewSets](#viewsets)
4. [Serializers](#serializers)
5. [Available Endpoints](#available-endpoints)
6. [Missing Endpoints & Improvements](#missing-endpoints--improvements)
7. [Action Methods](#action-methods)

---

## URL Routes

### Base Routes (from `roams_api/urls.py`)
```python
router.register(r'thresholds', TagThresholdViewSet, basename='threshold')
router.register(r'breaches', ThresholdBreachViewSet, basename='breach')
router.register(r'alarms', AlarmLogViewSet, basename='alarm')
router.register(r'alarm-retention-policy', AlarmRetentionPolicyViewSet, basename='alarm-retention-policy')
```

### Generated URLs
- **Thresholds**: `/api/thresholds/`
- **Breaches**: `/api/breaches/`
- **Alarms**: `/api/alarms/`
- **Alarm Retention Policy**: `/api/alarm-retention-policy/`

---

## Models

### 1. ThresholdBreach Model
**Location**: `roams_opcua_mgr/models/node_config_model.py` (lines 289-351)

```python
class ThresholdBreach(models.Model):
    # Relationships
    node = models.ForeignKey(
        OPCUANode,
        on_delete=models.CASCADE,
        related_name="breaches"
    )
    
    # Data
    value = models.FloatField()
    level = models.CharField(
        max_length=10,
        choices=[("Warning", "Warning"), ("Critical", "Critical")]
    )
    
    # Acknowledgement tracking
    acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.CharField(max_length=255, null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Indexes
    - (node, timestamp)
    - (level, acknowledged, timestamp)
    - (timestamp)
```

**Key Features**:
- ✅ Full audit trail with `acknowledged_by` and `acknowledged_at`
- ✅ Level-based filtering (Warning vs Critical)
- ✅ Optimized with database indexes
- ✅ Related name for reverse queries: `node.breaches`

---

### 2. AlarmLog Model
**Location**: `roams_opcua_mgr/models/node_config_model.py` (lines 278-287)

```python
class AlarmLog(models.Model):
    node = models.ForeignKey("OPCUANode", on_delete=models.CASCADE)
    station_name = models.CharField(max_length=100)
    message = models.TextField()
    severity = models.CharField(max_length=20, default="Warning")
    timestamp = models.DateTimeField(auto_now_add=True)
    acknowledged = models.BooleanField(default=False)
```

**Note**: This model is simpler than ThresholdBreach and lacks:
- ❌ Acknowledgement metadata (`acknowledged_by`, `acknowledged_at`)
- ❌ Database indexes
- ❌ Formal choice restrictions on severity

---

### 3. AlarmRetentionPolicy Model
**Location**: `roams_opcua_mgr/models/alarm_retention_model.py`

```python
class AlarmRetentionPolicy(models.Model):
    alarm_log_retention_days = models.IntegerField(
        default=90,
        validators=[MinValueValidator(7), MaxValueValidator(365)]
    )
    breach_retention_days = models.IntegerField(
        default=90,
        validators=[MinValueValidator(7), MaxValueValidator(365)]
    )
    keep_unacknowledged = models.BooleanField(default=True)
    auto_cleanup_enabled = models.BooleanField(default=True)
    last_cleanup_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @classmethod
    def get_policy(cls):
        """Get or create the default retention policy (id=1)"""
        policy, created = cls.objects.get_or_create(id=1, defaults={...})
        return policy
```

---

## ViewSets

### 1. ThresholdBreachViewSet
**Location**: `roams_api/views.py` (lines 584-668)

**Type**: `viewsets.ReadOnlyModelViewSet`

**Permissions**: `[IsAuthenticated]`

**Filter Backends**:
- `DjangoFilterBackend`
- `filters.OrderingFilter`

**Filterable Fields**: `node`, `level`, `acknowledged`

**Searchable Fields**: None

**Ordering Fields**: `timestamp`, `level`

**Custom Actions**:
1. **acknowledge** (POST `/api/breaches/{id}/acknowledge/`)
   - Mark a breach as acknowledged
   - Sets: `acknowledged=True`, `acknowledged_by`, `acknowledged_at`
   - Returns: Updated breach data

2. **unacknowledged** (GET `/api/breaches/unacknowledged/`)
   - List all unacknowledged breaches
   - Paginated response

3. **recent** (GET `/api/breaches/recent/`)
   - Get recent breaches (last 50)
   - Query param: `hours` (default: 24)
   - Example: `/api/breaches/recent/?hours=7`

**QuerySet Filtering**:
- Supports station filtering via query param: `?station=Station-01`

---

### 2. AlarmLogViewSet
**Location**: `roams_api/views.py` (lines 725-768)

**Type**: `viewsets.ReadOnlyModelViewSet`

**Permissions**: `[IsAuthenticated]`

**Filter Backends**:
- `DjangoFilterBackend`
- `filters.SearchFilter`
- `filters.OrderingFilter`

**Filterable Fields**: `station_name`, `severity`, `acknowledged`, `timestamp`

**Searchable Fields**: `node__tag_name__name`, `message`, `station_name`

**Ordering Fields**: `timestamp`, `severity`

**Default Ordering**: `-timestamp` (newest first)

**Date Range Filtering**:
- Query params: `from_date`, `to_date`
- Parsed using `dateutil.parser.parse()`

---

### 3. AlarmRetentionPolicyViewSet
**Location**: `roams_api/views.py` (lines 770-790)

**Type**: `viewsets.ModelViewSet`

**Permissions**: `[IsAuthenticated, IsAdminUser]`

**Custom Methods**:
- **get_object()**: Always returns the default retention policy (id=1)
- **list()**: Returns single object instead of list

---

### 4. TagThresholdViewSet (Threshold Configuration)
**Location**: `roams_api/views.py` (lines 531-569)

**Type**: `viewsets.ModelViewSet` (inherits from OPCUANodeViewSet)

**Queryable Fields**: OPCUANode fields with computed breach statistics

**Custom Actions**:
1. **breaches_24h** (GET `/api/thresholds/{id}/breaches_24h/`)
   - Returns breakdown: `total`, `critical`, `warning`
   - Last 24 hours only

---

## Serializers

### 1. ThresholdBreachSerializer
**Location**: `roams_api/serializers.py` (lines 116-137)

```python
class ThresholdBreachSerializer(serializers.ModelSerializer):
    node_tag_name = serializers.CharField(source="node.tag_name", read_only=True)
    
    fields = [
        'id',
        'node',
        'node_tag_name',
        'value',
        'level',
        'acknowledged',
        'acknowledged_by',
        'acknowledged_at',
        'timestamp',
    ]
    read_only_fields = ['timestamp', 'acknowledged_at']
```

---

### 2. AlarmLogSerializer
**Location**: `roams_api/serializers.py` (lines 250-267)

```python
class AlarmLogSerializer(serializers.ModelSerializer):
    node_tag_name = serializers.CharField(source="node.tag_name", read_only=True)
    
    fields = [
        'id',
        'node',
        'node_tag_name',
        'station_name',
        'message',
        'severity',
        'timestamp',
        'acknowledged',
    ]
    read_only_fields = ['timestamp']
```

---

### 3. AlarmRetentionPolicySerializer
**Location**: `roams_api/serializers.py` (lines 269-285)

```python
class AlarmRetentionPolicySerializer(serializers.ModelSerializer):
    fields = [
        'id',
        'alarm_log_retention_days',
        'breach_retention_days',
        'keep_unacknowledged',
        'auto_cleanup_enabled',
        'last_cleanup_at',
        'created_at',
        'updated_at',
    ]
    read_only_fields = ['last_cleanup_at', 'created_at', 'updated_at']
```

---

### 4. TagThresholdSerializer
**Location**: `roams_api/serializers.py` (lines 140-195)

Includes computed fields:
- `breaches_24h`: Total breaches in last 24 hours
- `breaches_critical_24h`: Critical breaches in last 24 hours
- `breaches_warning_24h`: Warning breaches in last 24 hours
- `unacknowledged_breaches`: Count of unacknowledged breaches

---

## Available Endpoints

### Threshold Breach Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/breaches/` | List all breaches | Yes |
| GET | `/api/breaches/?acknowledged=false` | List unacknowledged breaches | Yes |
| GET | `/api/breaches/?level=Critical` | Filter by level | Yes |
| GET | `/api/breaches/?station=Station-01` | Filter by station | Yes |
| GET | `/api/breaches/?ordering=-timestamp` | Order by timestamp | Yes |
| GET | `/api/breaches/{id}/` | Get specific breach | Yes |
| POST | `/api/breaches/{id}/acknowledge/` | Mark as acknowledged | Yes |
| GET | `/api/breaches/unacknowledged/` | List unacknowledged | Yes |
| GET | `/api/breaches/recent/` | Get last 50 breaches | Yes |
| GET | `/api/breaches/recent/?hours=7` | Get breaches from last N hours | Yes |

### Alarm Log Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/alarms/` | List all alarms | Yes |
| GET | `/api/alarms/?severity=Critical` | Filter by severity | Yes |
| GET | `/api/alarms/?acknowledged=false` | Unacknowledged alarms | Yes |
| GET | `/api/alarms/?from_date=2025-01-01&to_date=2025-01-31` | Date range filter | Yes |
| GET | `/api/alarms/?search=pump` | Search in message, tag name, station | Yes |
| GET | `/api/alarms/{id}/` | Get specific alarm | Yes |
| GET | `/api/alarms/?ordering=-timestamp` | Order by timestamp | Yes |

### Threshold Configuration Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/thresholds/` | List all thresholds | Yes |
| GET | `/api/thresholds/{id}/` | Get threshold details | Yes |
| GET | `/api/thresholds/{id}/breaches_24h/` | Get 24h breach stats | Yes |
| PATCH | `/api/thresholds/{id}/` | Update threshold settings | Yes |
| DELETE | `/api/thresholds/{id}/` | Delete threshold | Yes |

### Alarm Retention Policy Endpoints

| Method | Endpoint | Description | Auth | Admin |
|--------|----------|-------------|------|-------|
| GET | `/api/alarm-retention-policy/` | Get retention policy | Yes | Yes |
| POST | `/api/alarm-retention-policy/` | Create policy | Yes | Yes |
| PATCH | `/api/alarm-retention-policy/1/` | Update policy | Yes | Yes |
| DELETE | `/api/alarm-retention-policy/1/` | Delete policy | Yes | Yes |

---

## Missing Endpoints & Improvements

### ❌ Critical Missing Features

#### 1. **AlarmLogViewSet lacks write operations**
- ❌ No POST/PATCH/DELETE methods
- ❌ No custom action to acknowledge alarms
- ⚠️ AlarmLog model doesn't track `acknowledged_by` and `acknowledged_at`

**Recommendation**: 
```python
# Add to AlarmLogViewSet
@action(detail=True, methods=['post'])
def acknowledge(self, request, pk=None):
    """Mark alarm as acknowledged"""
    alarm = self.get_object()
    alarm.acknowledged = True
    alarm.save()
    return Response(self.get_serializer(alarm).data)
```

#### 2. **AlarmLog model missing audit fields**
- ❌ No `acknowledged_by` field
- ❌ No `acknowledged_at` timestamp
- ❌ No formal severity choices (uses CharField with free-text)

**Recommendation**:
```python
# Update AlarmLog model
acknowledged_by = models.CharField(max_length=255, null=True, blank=True)
acknowledged_at = models.DateTimeField(null=True, blank=True)

SEVERITY_CHOICES = [
    ('Warning', 'Warning'),
    ('Critical', 'Critical'),
]
severity = models.CharField(
    max_length=20, 
    choices=SEVERITY_CHOICES, 
    default='Warning'
)
```

#### 3. **ThresholdBreachViewSet is ReadOnly**
- ✅ Correctly uses `ReadOnlyModelViewSet`
- ✅ Has acknowledge action
- ❌ No bulk acknowledge for multiple breaches
- ❌ No dismiss/ignore functionality

#### 4. **AlarmLogViewSet missing custom actions**
Available in ThresholdBreachViewSet:
- ✅ `acknowledge` - Mark single as acknowledged
- ✅ `unacknowledged` - List unacknowledged
- ✅ `recent` - Get last 50

Missing in AlarmLogViewSet:
- ❌ `acknowledge` action
- ❌ `unacknowledged` action
- ❌ `recent` action

#### 5. **No bulk operations**
- ❌ No bulk acknowledge endpoint
- ❌ No bulk delete endpoint
- ❌ No mass delete for acknowledged items

**Recommendation**:
```python
@action(detail=False, methods=['post'])
def bulk_acknowledge(self, request):
    """Acknowledge multiple breaches at once"""
    ids = request.data.get('ids', [])
    updated = ThresholdBreach.objects.filter(id__in=ids).update(
        acknowledged=True,
        acknowledged_by=request.user.username,
        acknowledged_at=timezone.now()
    )
    return Response({'acknowledged': updated})
```

#### 6. **No severity/level statistics endpoints**
- ❌ No endpoint to get counts by severity
- ❌ No endpoint for trend analysis

**Recommendation**:
```python
@action(detail=False, methods=['get'])
def summary(self, request):
    """Get alarm/breach summary stats"""
    from django.db.models import Count, Q
    from django.utils.timezone import now, timedelta
    
    cutoff = now() - timedelta(hours=24)
    
    return Response({
        'total_24h': self.get_queryset().filter(timestamp__gte=cutoff).count(),
        'unacknowledged': self.get_queryset().filter(acknowledged=False).count(),
        'critical': self.get_queryset().filter(level='Critical').count(),
        'warning': self.get_queryset().filter(level='Warning').count(),
    })
```

#### 7. **Missing export/download functionality**
- ❌ No CSV export endpoint
- ❌ No PDF report generation

---

## Action Methods

### ThresholdBreachViewSet Actions

#### 1. **acknowledge** (line 612)
```
POST /api/breaches/{id}/acknowledge/

Response:
{
    "message": "Breach acknowledged",
    "breach": {
        "id": 1,
        "node": 5,
        "node_tag_name": "Flow Rate",
        "value": 150.5,
        "level": "Critical",
        "acknowledged": true,
        "acknowledged_by": "john.doe",
        "acknowledged_at": "2025-01-04T10:30:00Z",
        "timestamp": "2025-01-04T09:15:00Z"
    }
}
```

#### 2. **unacknowledged** (line 633)
```
GET /api/breaches/unacknowledged/

Response: (paginated list)
[
    { breach object 1 },
    { breach object 2 },
    ...
]
```

#### 3. **recent** (line 649)
```
GET /api/breaches/recent/?hours=24

Response:
[
    { breach object 1 },
    { breach object 2 },
    ...
]
(max 50 items)
```

### TagThresholdViewSet Actions

#### 1. **breaches_24h** (line 549)
```
GET /api/thresholds/{id}/breaches_24h/

Response:
{
    "total": 12,
    "critical": 3,
    "warning": 9
}
```

---

## Summary Table: HTTP Methods Support

| Endpoint | GET | POST | PATCH | DELETE | Custom Actions |
|----------|-----|------|-------|--------|-----------------|
| /breaches/ | ✅ | ❌ | ❌ | ❌ | acknowledge, unacknowledged, recent |
| /breaches/{id}/ | ✅ | ❌ | ❌ | ❌ | acknowledge |
| /alarms/ | ✅ | ❌ | ❌ | ❌ | ❌ Missing: acknowledge, recent |
| /alarms/{id}/ | ✅ | ❌ | ❌ | ❌ | ❌ Missing: acknowledge |
| /thresholds/ | ✅ | ✅ | ✅ | ✅ | breaches_24h |
| /thresholds/{id}/ | ✅ | ✅ | ✅ | ✅ | breaches_24h |
| /alarm-retention-policy/ | ✅ | ✅ | ✅ | ✅ | (none) |

---

## API Response Examples

### GET /api/breaches/?acknowledged=false
```json
{
    "count": 45,
    "next": "http://api.example.com/breaches/?acknowledged=false&page=2",
    "previous": null,
    "results": [
        {
            "id": 125,
            "node": 5,
            "node_tag_name": "Pressure Gauge A1",
            "value": 2850.5,
            "level": "Critical",
            "acknowledged": false,
            "acknowledged_by": null,
            "acknowledged_at": null,
            "timestamp": "2025-01-04T14:32:10Z"
        },
        {
            "id": 124,
            "node": 3,
            "node_tag_name": "Temperature B2",
            "value": 125.3,
            "level": "Warning",
            "acknowledged": false,
            "acknowledged_by": null,
            "acknowledged_at": null,
            "timestamp": "2025-01-04T13:15:45Z"
        }
    ]
}
```

### GET /api/alarms/?severity=Critical&from_date=2025-01-01&to_date=2025-01-31
```json
{
    "count": 8,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 542,
            "node": 7,
            "node_tag_name": "Flow Rate Main",
            "station_name": "Station-Alpha",
            "message": "Flow rate exceeded critical threshold: 950 m³/h",
            "severity": "Critical",
            "timestamp": "2025-01-28T16:45:00Z",
            "acknowledged": true
        }
    ]
}
```

---

## Database Indexes

### ThresholdBreach Indexes
```
- (node, timestamp) - Fast lookup by node + time range
- (level, acknowledged, timestamp) - Fast filtering by severity + status
- (timestamp) - Fast time-based queries
```

### Recommended Additional Indexes
```
- (acknowledged, timestamp) - For unacknowledged lists
- (node__client_config__station_name) - For station filtering
```

---

## Security Considerations

✅ **Current Security**:
- All endpoints require `IsAuthenticated`
- AlarmRetentionPolicy requires `IsAdminUser`
- Proper permission checks in place

⚠️ **Recommendations**:
- Add role-based access control (viewer vs technician vs operator)
- Implement audit logging for acknowledge actions
- Consider read-only access for certain user roles
- Add rate limiting to prevent abuse
- Validate date ranges to prevent excessive database queries

---

## Testing Checklist

- [ ] Test GET /api/breaches/ with no filters
- [ ] Test GET /api/breaches/?acknowledged=false
- [ ] Test GET /api/breaches/?station=Station-01
- [ ] Test POST /api/breaches/{id}/acknowledge/
- [ ] Test GET /api/breaches/unacknowledged/
- [ ] Test GET /api/breaches/recent/?hours=7
- [ ] Test GET /api/alarms/ with date range
- [ ] Test GET /api/alarms/?search=pump
- [ ] Test GET /api/thresholds/{id}/breaches_24h/
- [ ] Test PATCH /api/thresholds/{id}/
- [ ] Test GET /api/alarm-retention-policy/
- [ ] Test PATCH /api/alarm-retention-policy/1/

---

## Files Referenced
- `roams_api/views.py` - ViewSet implementations
- `roams_api/urls.py` - URL routing
- `roams_api/serializers.py` - Data serialization
- `roams_opcua_mgr/models/node_config_model.py` - ThresholdBreach & AlarmLog models
- `roams_opcua_mgr/models/alarm_retention_model.py` - AlarmRetentionPolicy model
