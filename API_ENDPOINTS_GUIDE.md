# API Endpoints for Dashboard & Reporting

This file shows how to extend the existing ViewSets with new endpoints for dashboard analytics and reporting.

## Add to roams_api/views.py

```python
# Add these imports at the top
from roams_opcua_mgr.dashboard_analytics import (
    get_top_breached_parameters,
    get_breach_statistics,
    get_breach_trend,
    get_unacknowledged_critical_breaches,
    get_parameter_breach_history,
    get_daily_breach_report,
    get_breach_frequency_trend,
)
from datetime import datetime, timedelta

# Add these methods to ThresholdBreachViewSet class

class ThresholdBreachViewSet(viewsets.ReadOnlyModelViewSet):
    # ... existing code ...
    
    @action(detail=False, methods=['get'])
    def dashboard_statistics(self, request):
        """
        Get comprehensive dashboard statistics.
        
        Query Parameters:
        - station: Filter by station name
        - hours: Look back this many hours (default: 24)
        
        Example: GET /api/breaches/dashboard_statistics/?hours=24
        
        Response:
        {
            "total_breaches": 42,
            "critical_breaches": 8,
            "warning_breaches": 34,
            "unacknowledged_breaches": 15,
            "acknowledged_breaches": 27,
            "affected_parameters": 12,
            "affected_stations": 3
        }
        """
        hours = int(request.query_params.get('hours', 24))
        station = request.query_params.get('station', None)
        
        stats = get_breach_statistics(station=station, hours=hours)
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def top_parameters(self, request):
        """
        Get top parameters with most breaches.
        
        Query Parameters:
        - station: Filter by station name
        - hours: Look back this many hours (default: 24)
        - limit: Number of top parameters (default: 10)
        
        Example: GET /api/breaches/top_parameters/?hours=24&limit=10
        
        Response:
        [
            {
                "node__tag_name": "Well Pressure",
                "node__tag_units": "psi",
                "node__id": 42,
                "count": 12,
                "critical_count": 3,
                "warning_count": 9,
                "last_breach": "2025-01-22T14:30:00Z"
            },
            ...
        ]
        """
        hours = int(request.query_params.get('hours', 24))
        limit = int(request.query_params.get('limit', 10))
        station = request.query_params.get('station', None)
        
        params = get_top_breached_parameters(station=station, hours=hours, limit=limit)
        return Response(params)
    
    @action(detail=False, methods=['get'])
    def critical_alerts(self, request):
        """
        Get all unacknowledged critical breaches (urgent).
        
        Example: GET /api/breaches/critical_alerts/
        
        Response:
        [
            {
                "id": 1,
                "node": 42,
                "node_parameter": "Well Pressure",
                "station": "Station-01",
                "value": 3500.5,
                "timestamp": "2025-01-22T14:30:00Z",
                "acknowledged": false
            },
            ...
        ]
        """
        breaches = get_unacknowledged_critical_breaches()
        
        page = self.paginate_queryset(breaches)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(breaches, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def trend(self, request):
        """
        Get breach trend data for time-series visualization.
        
        Query Parameters:
        - hours: Look back this many hours (default: 24)
        - interval_minutes: Bucket size in minutes (default: 60)
        
        Example: GET /api/breaches/trend/?hours=24&interval_minutes=60
        
        Response:
        [
            {
                "time_bucket": "2025-01-22T13:00:00Z",
                "total": 5,
                "critical": 2,
                "warning": 3
            },
            ...
        ]
        """
        hours = int(request.query_params.get('hours', 24))
        interval_minutes = int(request.query_params.get('interval_minutes', 60))
        
        trend = get_breach_trend(hours=hours, interval_minutes=interval_minutes)
        return Response(trend)
    
    @action(detail=False, methods=['get'])
    def severity_distribution(self, request):
        """
        Get distribution of breaches by severity level.
        
        Query Parameters:
        - station: Filter by station name
        - hours: Look back this many hours (default: 24)
        
        Example: GET /api/breaches/severity_distribution/?hours=24
        
        Response:
        {
            "Critical": 8,
            "Warning": 34
        }
        """
        hours = int(request.query_params.get('hours', 24))
        station = request.query_params.get('station', None)
        
        from roams_opcua_mgr.dashboard_analytics import get_breach_severity_distribution
        distribution = get_breach_severity_distribution(station=station, hours=hours)
        return Response(distribution)
    
    @action(detail=False, methods=['get'])
    def daily_report(self, request):
        """
        Get daily breach report for a specific date.
        
        Query Parameters:
        - date: YYYY-MM-DD format (default: today)
        
        Example: GET /api/breaches/daily_report/?date=2025-01-22
        
        Response:
        {
            "date": "2025-01-22",
            "total_breaches": 42,
            "critical_breaches": 8,
            "warning_breaches": 34,
            "acknowledged": 27,
            "unacknowledged": 15,
            "affected_parameters": 12,
            "top_parameters": [
                {"node__tag_name": "Well Pressure", "count": 12},
                ...
            ]
        }
        """
        date_str = request.query_params.get('date', None)
        
        if date_str:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            date = None
        
        report = get_daily_breach_report(date_=date)
        return Response(report)


# Add new endpoint to TagThresholdViewSet

class TagThresholdViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    @action(detail=True, methods=['get'])
    def frequency_trend(self, request, pk=None):
        """
        Analyze breach frequency trend for a specific parameter.
        Shows if breaches are increasing or decreasing.
        
        Query Parameters:
        - days: Look back this many days (default: 90)
        
        Example: GET /api/thresholds/42/frequency_trend/?days=90
        
        Response:
        {
            "trend": "increasing|decreasing|stable",
            "percent_change": 25.5,
            "daily_data": [
                {
                    "day": "2025-01-01",
                    "count": 5
                },
                ...
            ]
        }
        """
        node = self.get_object()
        days = int(request.query_params.get('days', 90))
        
        trend = get_breach_frequency_trend(node.id, days=days)
        return Response(trend)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Get breach history for a specific parameter.
        
        Query Parameters:
        - days: Look back this many days (default: 30)
        
        Example: GET /api/thresholds/42/history/?days=30
        
        Response:
        [
            {
                "id": 123,
                "value": 3500.5,
                "level": "Critical",
                "timestamp": "2025-01-22T14:30:00Z",
                "acknowledged": true,
                "acknowledged_by": "operator1"
            },
            ...
        ]
        """
        node = self.get_object()
        days = int(request.query_params.get('days', 30))
        
        breaches = get_parameter_breach_history(node.id, days=days)
        
        page = self.paginate_queryset(breaches)
        if page is not None:
            serializer = ThresholdBreachSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ThresholdBreachSerializer(breaches, many=True)
        return Response(serializer.data)
```

## Frontend Usage Examples

### Dashboard Statistics
```typescript
// Get overall dashboard stats
const response = await fetch('/api/breaches/dashboard_statistics/?hours=24');
const stats = await response.json();
console.log(`Critical: ${stats.critical_breaches}, Warning: ${stats.warning_breaches}`);
```

### Top Parameters
```typescript
// Get top 5 breached parameters
const response = await fetch('/api/breaches/top_parameters/?limit=5&hours=24');
const params = await response.json();
params.forEach(p => {
    console.log(`${p.node__tag_name}: ${p.count} breaches`);
});
```

### Critical Alerts
```typescript
// Get all unacknowledged critical breaches
const response = await fetch('/api/breaches/critical_alerts/');
const alerts = await response.json();
```

### Trend Data (for charts)
```typescript
// Get hourly trend for the last 24 hours
const response = await fetch('/api/breaches/trend/?hours=24&interval_minutes=60');
const trend = await response.json();

// Use with Chart.js
const labels = trend.map(t => new Date(t.time_bucket).toLocaleTimeString());
const critical = trend.map(t => t.critical);
const warning = trend.map(t => t.warning);
```

### Daily Report
```typescript
// Get report for specific date
const response = await fetch('/api/breaches/daily_report/?date=2025-01-22');
const report = await response.json();
console.log(`${report.date}: ${report.total_breaches} breaches`);
```

### Parameter History & Trend
```typescript
// Get breach history for parameter 42
const response = await fetch('/api/thresholds/42/history/?days=30');
const history = await response.json();

// Get frequency trend for parameter 42
const trendResponse = await fetch('/api/thresholds/42/frequency_trend/?days=90');
const trend = await trendResponse.json();
console.log(`Trend: ${trend.trend} (${trend.percent_change}% change)`);
```

## Database Query Performance Notes

All functions use optimized Django ORM queries with:
- Proper indexing on `timestamp`, `node`, `level`, and `acknowledged` fields
- `select_related()` for foreign key optimization
- Aggregation at database level (COUNT, not in Python)
- Date-based filtering for time-series data

For very large datasets (millions of breaches), consider:
1. Using the cleanup command regularly
2. Archiving old data to separate tables
3. Using Celery for async analytics computation
4. Caching frequently accessed reports

