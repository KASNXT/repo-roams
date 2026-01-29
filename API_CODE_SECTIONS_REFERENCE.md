# API Code Sections: Breaches, Alarms & Thresholds

## ViewSet Code Sections

### ThresholdBreachViewSet (READ-ONLY)
**File**: [roams_api/views.py](roams_api/views.py#L584-L668)

```python
class ThresholdBreachViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing and managing threshold breach events.
    
    Examples:
    - GET /api/breaches/ - List all breaches
    - GET /api/breaches/?acknowledged=false - List unacknowledged
    - PATCH /api/breaches/1/acknowledge/ - Mark as acknowledged
    """
    queryset = ThresholdBreach.objects.select_related('node').order_by('-timestamp')
    serializer_class = ThresholdBreachSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['node', 'level', 'acknowledged']
    ordering_fields = ['timestamp', 'level']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """
        Optionally filter by station via query parameter.
        Example: /api/breaches/?station=Station-01
        """
        queryset = super().get_queryset()
        station = self.request.query_params.get('station', None)
        if station:
            queryset = queryset.filter(node__client_config__station_name=station)
        return queryset
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """
        Mark a breach as acknowledged.
        Example: POST /api/breaches/1/acknowledge/
        """
        breach = self.get_object()
        breach.acknowledged = True
        breach.acknowledged_by = request.user.username
        breach.acknowledged_at = timezone.now()
        breach.save()
        
        serializer = self.get_serializer(breach)
        return Response(
            {
                'message': 'Breach acknowledged',
                'breach': serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def unacknowledged(self, request):
        """
        Get all unacknowledged breaches.
        Example: GET /api/breaches/unacknowledged/
        """
        breaches = self.get_queryset().filter(acknowledged=False)
        
        page = self.paginate_queryset(breaches)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(breaches, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Get recent breaches (last 50).
        Example: GET /api/breaches/recent/
        """
        hours = int(request.query_params.get('hours', 24))
        from django.utils.timezone import now, timedelta
        
        cutoff = now() - timedelta(hours=hours)
        breaches = self.get_queryset().filter(timestamp__gte=cutoff)[:50]
        
        serializer = self.get_serializer(breaches, many=True)
        return Response(serializer.data)
```

---

### AlarmLogViewSet (READ-ONLY)
**File**: [roams_api/views.py](roams_api/views.py#L725-L768)

```python
class AlarmLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for reading alarm logs.
    Provides filtering by station, severity, and date range.
    """
    serializer_class = AlarmLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['station_name', 'severity', 'acknowledged', 'timestamp']
    search_fields = ['node__tag_name__name', 'message', 'station_name']
    ordering_fields = ['timestamp', 'severity']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Get alarm logs, optionally filtered by date range"""
        queryset = AlarmLog.objects.select_related('node').order_by('-timestamp')
        
        # Optional date filtering
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        
        if from_date:
            try:
                from_dt = parser.parse(from_date)
                queryset = queryset.filter(timestamp__gte=from_dt)
            except ValueError:
                pass
        
        if to_date:
            try:
                to_dt = parser.parse(to_date)
                queryset = queryset.filter(timestamp__lte=to_dt)
            except ValueError:
                pass
        
        return queryset
```

**⚠️ LIMITATION**: No write operations, acknowledge action, or custom actions!

---

### AlarmRetentionPolicyViewSet (ADMIN ONLY)
**File**: [roams_api/views.py](roams_api/views.py#L770-L790)

```python
class AlarmRetentionPolicyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing alarm retention policy.
    Only staff users can view and modify retention settings.
    """
    queryset = AlarmRetentionPolicy.objects.all()
    serializer_class = AlarmRetentionPolicySerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_object(self):
        """Always return the default retention policy (id=1)"""
        return AlarmRetentionPolicy.get_policy()
    
    def list(self, request, *args, **kwargs):
        """Override list to return single object"""
        policy = self.get_object()
        serializer = self.get_serializer(policy)
        return Response(serializer.data)
```

---

### TagThresholdViewSet (with breaches_24h action)
**File**: [roams_api/views.py](roams_api/views.py#L531-L569)

```python
@action(detail=True, methods=['get'])
def breaches_24h(self, request, pk=None):
    """
    Get breach count for last 24 hours broken down by level.
    Example: /api/thresholds/1/breaches_24h/
    """
    from django.utils.timezone import now, timedelta
    
    node = self.get_object()
    cutoff = now() - timedelta(hours=24)
    
    total = ThresholdBreach.objects.filter(
        node=node,
        timestamp__gte=cutoff
    ).count()
    
    critical = ThresholdBreach.objects.filter(
        node=node,
        level="Critical",
        timestamp__gte=cutoff
    ).count()
    
    warning = ThresholdBreach.objects.filter(
        node=node,
        level="Warning",
        timestamp__gte=cutoff
    ).count()
    
    return Response({
        'total': total,
        'critical': critical,
        'warning': warning,
    })
```

---

## Model Code Sections

### ThresholdBreach Model
**File**: [roams_opcua_mgr/models/node_config_model.py](roams_opcua_mgr/models/node_config_model.py#L289-L351)

```python
class ThresholdBreach(models.Model):
    """
    Event log model for recording when values breach thresholds.
    One row per breach event - provides full audit trail of threshold violations.
    """
    
    node = models.ForeignKey(
        OPCUANode,
        on_delete=models.CASCADE,
        related_name="breaches",
        help_text="The node that breached"
    )
    
    # The breach details
    value = models.FloatField(
        help_text="The value that triggered the breach"
    )
    
    LEVEL_CHOICES = [
        ("Warning", "Warning"),
        ("Critical", "Critical"),
    ]
    level = models.CharField(
        max_length=10,
        choices=LEVEL_CHOICES,
        help_text="Whether this was a warning or critical breach"
    )
    
    # Acknowledgement tracking
    acknowledged = models.BooleanField(
        default=False,
        help_text="Whether an operator has acknowledged this breach"
    )
    acknowledged_by = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Username of who acknowledged this breach"
    )
    acknowledged_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this breach was acknowledged"
    )
    
    # Timestamps
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When the breach occurred"
    )
    
    class Meta:
        db_table = 'roams_opcua_mgr_threshold_breach'
        indexes = [
            models.Index(fields=['node', 'timestamp']),
            models.Index(fields=['level', 'acknowledged', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.level} Breach: {self.node.tag_name} = {self.value} at {self.timestamp}"
```

✅ **Strengths**:
- Full audit trail with `acknowledged_by` and `acknowledged_at`
- Formal LEVEL_CHOICES
- Multiple database indexes for performance
- Reverse relation via `related_name="breaches"`

---

### AlarmLog Model
**File**: [roams_opcua_mgr/models/node_config_model.py](roams_opcua_mgr/models/node_config_model.py#L278-L287)

```python
class AlarmLog(models.Model):
    node = models.ForeignKey("OPCUANode", on_delete=models.CASCADE)
    station_name = models.CharField(max_length=100)
    message = models.TextField()
    severity = models.CharField(max_length=20, default="Warning")
    timestamp = models.DateTimeField(auto_now_add=True)
    acknowledged = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.station_name} - {self.message}"
```

❌ **Issues**:
- No `acknowledged_by` field (can't track who acknowledged)
- No `acknowledged_at` timestamp (can't track when)
- No formal severity choices (free-text field)
- No database indexes (poor performance)
- Missing docstring/help_text

---

### AlarmRetentionPolicy Model
**File**: [roams_opcua_mgr/models/alarm_retention_model.py](roams_opcua_mgr/models/alarm_retention_model.py#L1-L75)

```python
class AlarmRetentionPolicy(models.Model):
    """
    Global settings for alarm data retention and cleanup.
    Controls automatic deletion of old alarm logs and threshold breaches.
    """
    
    # Alarm log retention in days
    alarm_log_retention_days = models.IntegerField(
        default=90,
        validators=[MinValueValidator(7), MaxValueValidator(365)],
        help_text="Delete alarm logs older than this many days (7-365)"
    )
    
    # Threshold breach retention in days
    breach_retention_days = models.IntegerField(
        default=90,
        validators=[MinValueValidator(7), MaxValueValidator(365)],
        help_text="Delete acknowledged threshold breaches older than this many days (7-365)"
    )
    
    # Whether to keep unacknowledged breaches indefinitely
    keep_unacknowledged = models.BooleanField(
        default=True,
        help_text="If True, never delete unacknowledged threshold breaches"
    )
    
    # Automatic cleanup enabled/disabled
    auto_cleanup_enabled = models.BooleanField(
        default=True,
        help_text="Enable automatic deletion of old records"
    )
    
    # Last cleanup timestamp
    last_cleanup_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the last cleanup job ran"
    )
    
    # Creation and update timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Alarm Retention Policy"
        verbose_name_plural = "Alarm Retention Policies"
    
    def __str__(self):
        return f"Alarm Retention: {self.alarm_log_retention_days} days (alarms), {self.breach_retention_days} days (breaches)"
    
    @classmethod
    def get_policy(cls):
        """Get or create the default retention policy."""
        policy, created = cls.objects.get_or_create(
            id=1,
            defaults={
                'alarm_log_retention_days': 90,
                'breach_retention_days': 90,
                'keep_unacknowledged': True,
                'auto_cleanup_enabled': True,
            }
        )
        return policy
```

---

## Serializer Code Sections

### ThresholdBreachSerializer
**File**: [roams_api/serializers.py](roams_api/serializers.py#L116-L137)

```python
class ThresholdBreachSerializer(serializers.ModelSerializer):
    """Serializer for individual threshold breach events"""
    node_tag_name = serializers.CharField(source="node.tag_name", read_only=True)
    
    class Meta:
        model = ThresholdBreach
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

### AlarmLogSerializer
**File**: [roams_api/serializers.py](roams_api/serializers.py#L250-L267)

```python
class AlarmLogSerializer(serializers.ModelSerializer):
    """Serializer for alarm log events"""
    node_tag_name = serializers.CharField(source="node.tag_name", read_only=True)
    
    class Meta:
        model = AlarmLog
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

### AlarmRetentionPolicySerializer
**File**: [roams_api/serializers.py](roams_api/serializers.py#L269-L285)

```python
class AlarmRetentionPolicySerializer(serializers.ModelSerializer):
    """Serializer for alarm retention policy settings"""
    
    class Meta:
        model = AlarmRetentionPolicy
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

### TagThresholdSerializer (with computed fields)
**File**: [roams_api/serializers.py](roams_api/serializers.py#L140-L195)

```python
class TagThresholdSerializer(serializers.ModelSerializer):
    """Serializer for OPC UA node thresholds with computed breach counts"""
    node_id = serializers.IntegerField(source="id", read_only=True)
    station_name = serializers.CharField(source="client_config.station_name", read_only=True)
    parameter = serializers.SerializerMethodField()
    unit = serializers.CharField(source="tag_units", read_only=True)
    
    # Computed fields - never stored
    breaches_24h = serializers.SerializerMethodField()
    breaches_critical_24h = serializers.SerializerMethodField()
    breaches_warning_24h = serializers.SerializerMethodField()
    unacknowledged_breaches = serializers.SerializerMethodField()
    
    class Meta:
        model = OPCUANode
        fields = [
            'id',
            'node_id',
            'station_name',
            'parameter',
            'add_new_tag_name',
            'unit',
            'access_level',
            'min_value',
            'max_value',
            'warning_level',
            'critical_level',
            'severity',
            'threshold_active',
            'breaches_24h',
            'breaches_critical_24h',
            'breaches_warning_24h',
            'unacknowledged_breaches',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_parameter(self, obj):
        """Return tag name or add_new_tag_name"""
        return str(obj.tag_name) if obj.tag_name else obj.add_new_tag_name or "Unnamed"
    
    def get_breaches_24h(self, obj):
        """Total breaches in last 24 hours"""
        return ThresholdBreach.objects.filter(
            node=obj,
            timestamp__gte=now() - timedelta(hours=24)
        ).count()
    
    def get_breaches_critical_24h(self, obj):
        """Critical breaches in last 24 hours"""
        return ThresholdBreach.objects.filter(
            node=obj,
            level="Critical",
            timestamp__gte=now() - timedelta(hours=24)
        ).count()
    
    def get_breaches_warning_24h(self, obj):
        """Warning breaches in last 24 hours"""
        return ThresholdBreach.objects.filter(
            node=obj,
            level="Warning",
            timestamp__gte=now() - timedelta(hours=24)
        ).count()
    
    def get_unacknowledged_breaches(self, obj):
        """Count of unacknowledged breaches"""
        return ThresholdBreach.objects.filter(
            node=obj,
            acknowledged=False
        ).count()
```

---

## URL Routing
**File**: [roams_api/urls.py](roams_api/urls.py#L1-L50)

```python
router = DefaultRouter()
# ... other routes ...
router.register(r'thresholds', TagThresholdViewSet, basename='threshold')
router.register(r'breaches', ThresholdBreachViewSet, basename='breach')
router.register(r'alarms', AlarmLogViewSet, basename='alarm')
router.register(r'alarm-retention-policy', AlarmRetentionPolicyViewSet, basename='alarm-retention-policy')
```

---

## Quick Reference: Missing Methods

### AlarmLogViewSet - Add These Actions
```python
# Add acknowledge action
@action(detail=True, methods=['post'])
def acknowledge(self, request, pk=None):
    alarm = self.get_object()
    alarm.acknowledged = True
    alarm.save()
    return Response(self.get_serializer(alarm).data)

# Add unacknowledged list
@action(detail=False, methods=['get'])
def unacknowledged(self, request):
    alarms = self.get_queryset().filter(acknowledged=False)
    page = self.paginate_queryset(alarms)
    if page is not None:
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    serializer = self.get_serializer(alarms, many=True)
    return Response(serializer.data)

# Add recent action
@action(detail=False, methods=['get'])
def recent(self, request):
    hours = int(request.query_params.get('hours', 24))
    cutoff = now() - timedelta(hours=hours)
    alarms = self.get_queryset().filter(timestamp__gte=cutoff)[:50]
    serializer = self.get_serializer(alarms, many=True)
    return Response(serializer.data)
```

### AlarmLog Model - Add These Fields
```python
acknowledged_by = models.CharField(max_length=255, null=True, blank=True)
acknowledged_at = models.DateTimeField(null=True, blank=True)

# Add SEVERITY_CHOICES
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
