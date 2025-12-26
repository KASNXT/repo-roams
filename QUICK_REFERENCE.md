# 🚀 Quick Reference: Threshold System

## API Endpoints Cheat Sheet

### Thresholds (Configuration)
```bash
# List all thresholds
GET /api/thresholds/

# Filter by station
GET /api/thresholds/?station=Station-01

# Get specific threshold
GET /api/thresholds/5/

# Create new threshold
POST /api/thresholds/
Body: {
  "node": 42,
  "min_value": 100.0,
  "max_value": 500.0,
  "warning_level": 450.0,
  "critical_level": 480.0,
  "severity": "Critical",
  "active": true
}

# Update threshold
PATCH /api/thresholds/5/
Body: {
  "warning_level": 460.0,
  "critical_level": 490.0
}

# Delete threshold
DELETE /api/thresholds/5/

# Get breaches for this threshold
GET /api/thresholds/5/breaches/

# Get 24h breach counts
GET /api/thresholds/5/breaches_24h/
Response: {
  "total": 15,
  "critical": 3,
  "warning": 12
}
```

### Breaches (Events Log)
```bash
# List all breaches
GET /api/breaches/

# Get unacknowledged breaches
GET /api/breaches/unacknowledged/

# Get recent breaches (last 24 hours)
GET /api/breaches/recent/?hours=24

# Filter by level
GET /api/breaches/?level=Critical

# Filter by node
GET /api/breaches/?node=42

# Filter by station
GET /api/breaches/?station=Station-01

# Acknowledge a breach
POST /api/breaches/5/acknowledge/
Response: {
  "message": "Breach acknowledged",
  "breach": {...}
}
```

## Backend Code Reference

### Models
```python
# TagThreshold - stores configured limits
from roams_opcua_mgr.models import TagThreshold
threshold = TagThreshold.objects.get(node=node_config)
print(threshold.warning_level, threshold.critical_level)

# ThresholdBreach - event log
from roams_opcua_mgr.models import ThresholdBreach
breaches = ThresholdBreach.objects.filter(
    node=node_config,
    level="Critical"
).order_by('-timestamp')
```

### Services
```python
from roams_opcua_mgr.services import (
    evaluate_threshold,
    get_breach_count_24h,
    acknowledge_breach,
    get_unacknowledged_breaches
)

# Evaluate a value
breach = evaluate_threshold(node_config, 475.0)
if breach:
    print(f"Breach detected: {breach.level}")

# Get 24h count
count = get_breach_count_24h(node_config)
print(f"Breaches in 24h: {count}")

# Acknowledge
acknowledge_breach(breach_id=5, username="john")

# Get unacknowledged
unack = get_unacknowledged_breaches()
```

## Frontend Usage

### Component Props
```tsx
<ThresholdsTab />
// Loads stations automatically
// Allows station selection via dropdown
// Fetches and displays thresholds for selected station
// Shows breach statistics (from API)
// Allows editing and saving threshold limits
```

### Data Flow in Component
```tsx
1. On mount: Load stations from /api/clients/
2. When station selected: Load thresholds from /api/thresholds/?station=X
3. User edits: Update local state, mark as unsaved
4. User clicks Save: PATCH each changed threshold
5. Display: Show breaches_24h from API response
```

## Database Queries

### Common Queries
```python
# All unacknowledged breaches
ThresholdBreach.objects.filter(acknowledged=False)

# Breaches in last 24 hours
from django.utils.timezone import now, timedelta
ThresholdBreach.objects.filter(
    timestamp__gte=now() - timedelta(hours=24)
)

# Critical breaches by station
ThresholdBreach.objects.filter(
    level="Critical",
    node__client_config__station_name="Station-01"
)

# Threshold with most breaches
from django.db.models import Count
TagThreshold.objects.annotate(
    breach_count=Count('breach_events')
).order_by('-breach_count').first()

# Average breaches per threshold
ThresholdBreach.objects.values('threshold').annotate(
    count=Count('id')
).aggregate(Avg('count'))['count__avg']
```

## Integration Points

### In read_data.py
```python
from .services import evaluate_threshold

# Inside read loop for each node:
value = opc_node.get_value()
breach = evaluate_threshold(node_config, value)
if breach:
    logger.warning(f"Breach: {node_config.tag_name} = {value}")
```

### In Admin Site (optional)
```python
# roams_opcua_mgr/admin.py
from django.contrib import admin
from .models import TagThreshold, ThresholdBreach

@admin.register(TagThreshold)
class TagThresholdAdmin(admin.ModelAdmin):
    list_display = ['node', 'warning_level', 'critical_level', 'active']
    list_filter = ['active', 'severity']
    search_fields = ['node__tag_name']

@admin.register(ThresholdBreach)
class ThresholdBreachAdmin(admin.ModelAdmin):
    list_display = ['node', 'value', 'level', 'timestamp', 'acknowledged']
    list_filter = ['level', 'acknowledged', 'timestamp']
    readonly_fields = ['timestamp', 'node', 'value', 'level']
```

## Useful Management Commands

### Create test thresholds
```python
# management/commands/create_test_thresholds.py
from roams_opcua_mgr.models import OPCUANode, TagThreshold

for node in OPCUANode.objects.all()[:5]:
    TagThreshold.objects.get_or_create(
        node=node,
        defaults={
            'min_value': 0,
            'max_value': 100,
            'warning_level': 80,
            'critical_level': 95,
            'severity': 'Critical',
            'active': True
        }
    )
```

### Archive old breaches
```python
# management/commands/archive_breaches.py
from roams_opcua_mgr.models import ThresholdBreach
from django.utils.timezone import now, timedelta

cutoff = now() - timedelta(days=90)
count, _ = ThresholdBreach.objects.filter(
    timestamp__lt=cutoff,
    acknowledged=True
).delete()
print(f"Archived {count} breaches")
```

## Response Examples

### Threshold Response
```json
{
  "id": 5,
  "node_id": 42,
  "parameter": "Well Pressure",
  "add_new_tag_name": "",
  "unit": "psi",
  "access_level": "Read_only",
  "min_value": 2000.0,
  "max_value": 3500.0,
  "warning_level": 3200.0,
  "critical_level": 3400.0,
  "severity": "Critical",
  "active": true,
  "breaches_24h": 15,
  "breaches_critical_24h": 3,
  "breaches_warning_24h": 12,
  "unacknowledged_breaches": 2,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-22T14:45:00Z"
}
```

### Breach Response
```json
{
  "id": 1042,
  "node": 42,
  "node_tag_name": "Well Pressure",
  "threshold": 5,
  "value": 3450.5,
  "level": "Critical",
  "acknowledged": false,
  "acknowledged_by": null,
  "acknowledged_at": null,
  "timestamp": "2025-01-22T14:35:12Z"
}
```

## Permissions

All endpoints require authentication (`IsAuthenticated`).

To restrict editing to admin:
```python
class TagThresholdViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
```

## Filtering Examples

```bash
# Unacknowledged critical breaches
GET /api/breaches/?level=Critical&acknowledged=false

# Breaches for specific station in last 7 days
GET /api/breaches/?station=Station-01
# Then filter timestamp in frontend

# Active thresholds for station
GET /api/thresholds/?station=Station-01&active=true

# All thresholds, search by parameter name
GET /api/thresholds/?search=pressure
```

## Troubleshooting

### No breaches being logged
1. Check if threshold is active: `threshold.active == True`
2. Check if values match expected type: `isinstance(value, (int, float))`
3. Verify levels are set: `threshold.warning_level is not None`
4. Check logs: `python manage.py tail` or check `debug.log`

### Stale breach counts
- This shouldn't happen - counts are computed from database
- If it does, check database connectivity
- Verify ThresholdBreach records exist: `ThresholdBreach.objects.count()`

### Threshold not found in API
1. Check node exists: `OPCUANode.objects.get(id=42)`
2. Check threshold exists: `TagThreshold.objects.get(node=42)`
3. Try station filter: `/api/thresholds/?station=Station-01`

## Performance Tips

1. **Breach queries**: Always filter by `timestamp` for large tables
2. **Breach cleanup**: Archive breaches older than 90 days
3. **Index usage**: System has indexes on common filters
4. **Pagination**: API paginates by default, use `?limit=100&offset=200`
5. **Serialization**: Computed fields are slightly slower, cache if needed

## Environment Variables

```bash
# .env or settings.py
BREACH_RETENTION_DAYS=90    # Delete acknowledged breaches after
EVAL_THRESHOLD_ENABLED=True  # Enable/disable threshold evaluation
LOG_BREACHES=True            # Log breaches to logger
```

## Monitoring

Monitor these metrics:
- Total unacknowledged breaches
- Breaches by level (critical vs warning)
- Breach trends (increasing/decreasing)
- Mean time to acknowledge
- Threshold coverage (% of nodes with thresholds)
