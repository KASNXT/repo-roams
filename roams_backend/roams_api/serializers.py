from django.contrib.auth.models import User
from rest_framework import serializers
from roams_opcua_mgr.models import (
    OPCUANode, OpcUaClientConfig, OpcUaReadLog, ThresholdBreach, 
    NotificationRecipient, AlarmLog, AlarmRetentionPolicy, StationDeviceSpecifications
)
from rest_framework import viewsets, permissions
from django.utils.timezone import now, timedelta
from roams_api.models import UserProfile

# Serializer for OPC UA Nodes
class OPCUANodeSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source="client_config.station_name", read_only=True)
    tag_name = serializers.StringRelatedField()  # <-- Use string instead of ID

    class Meta:
        model = OPCUANode
        fields = [
            'id',
            'tag_name',       # Now returns the tag name string
            'node_id',
            'last_value',
            'last_updated',
            "tag_units",
            "add_new_tag_name",
            "access_level",
            "station_name",
            "min_value",
            "max_value"
        ]

# Serializer for OPC UA Client Configs
class OpcUaClientConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcUaClientConfig
        fields = [
            'id',
            "station_name",
            "endpoint_url",
            "active",
            "last_connected",
            "created_at",
            "connection_status",
            "security_policy",
            "latitude",
            "longitude"
        ]

# Serializer for OpcUaReadLog
class OpcUaReadLogSerializer(serializers.ModelSerializer):
    station_name = serializers.SerializerMethodField()
    node_tag_name = serializers.CharField(source="node.tag_name", read_only=True)
    node_type = serializers.CharField(source="node.node_type", read_only=True)
    node_details = serializers.SerializerMethodField()
    nodes_count = serializers.IntegerField(source="opcuanode_set.count", read_only=True)
    value = serializers.SerializerMethodField()
    
    class Meta:
        model = OpcUaReadLog
        fields = [
            'id', 
            'client_config',
            'node',
            'station_name', 
            'node_tag_name',
            'node_type',
            'node_details',
            'nodes_count', 
            'value', 
            'timestamp'
        ]

    def get_station_name(self, obj):
        return obj.client_config.station_name
    
    def get_value(self, obj):
        """Round numeric values to 2 decimal places"""
        try:
            numeric_value = float(obj.value)
            return round(numeric_value, 2)
        except (TypeError, ValueError):
            return obj.value
    
    def get_node_details(self, obj):
        return {
            'tag_name': str(obj.node.tag_name) if obj.node and obj.node.tag_name else None,
            'node_id': obj.node.node_id if obj.node else None,
            'tag_units': obj.node.tag_units if obj.node else None,
        }

# Serializer for User model
class UserSerializer(serializers.ModelSerializer):
    """Serializer for user accounts with role information"""
    role = serializers.SerializerMethodField(read_only=True)
    role_choices = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = User
        fields = ["id", "username", "email", "is_active", "is_staff", "last_login", "date_joined", "role", "role_choices"]
    
    def get_role(self, obj):
        """Get user's role from profile"""
        if hasattr(obj, 'profile'):
            return obj.profile.role
        return 'viewer'
    
    def get_role_choices(self, obj):
        """Return available role choices"""
        from roams_api.models import UserProfile
        return UserProfile.ROLE_CHOICES

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


# ============== THRESHOLD SERIALIZERS ==============

class ThresholdBreachSerializer(serializers.ModelSerializer):
    """Serializer for individual threshold breach events with full threshold details"""
    node_tag_name = serializers.CharField(source="node.tag_name", read_only=True)
    node_id = serializers.IntegerField(source="node.id", read_only=True)
    station_name = serializers.CharField(source="node.client_config.station_name", read_only=True)
    
    # Threshold info fields
    min_value = serializers.FloatField(source="node.min_value", read_only=True)
    max_value = serializers.FloatField(source="node.max_value", read_only=True)
    warning_level = serializers.FloatField(source="node.warning_level", read_only=True)
    critical_level = serializers.FloatField(source="node.critical_level", read_only=True)
    
    class Meta:
        model = ThresholdBreach
        fields = [
            'id',
            'node',
            'node_id',
            'node_tag_name',
            'station_name',
            'value',
            'level',
            'acknowledged',
            'acknowledged_by',
            'acknowledged_at',
            'timestamp',
            # Threshold info
            'min_value',
            'max_value',
            'warning_level',
            'critical_level',
        ]
        read_only_fields = ['timestamp', 'acknowledged_at']


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

# Serializers for User Profiles and Notification Settings

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'email',
            'phone_number',
            'email_notifications',
            'sms_notifications',
            'critical_alerts_only',
            'created_at',
            'updated_at'
        ]


class NotificationRecipientSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    node_name = serializers.CharField(source='node.tag_name', read_only=True)
    station_name = serializers.CharField(source='node.client_config.station_name', read_only=True)
    
    class Meta:
        model = NotificationRecipient
        fields = [
            'id',
            'node',
            'node_name',
            'station_name',
            'user',
            'username',
            'user_email',
            'alert_level',
            'email_enabled',
            'sms_enabled',
            'created_at',
            'updated_at'
        ]


# ============== ALARM SERIALIZERS ==============

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


# Serializer for Station Device Specifications (nameplate data)
class StationDeviceSpecificationsSerializer(serializers.ModelSerializer):
    """
    Serializer for device specifications (motor power rating, rated current, flow, head/pressure).
    Used for comparing rated vs actual performance metrics in analysis.
    
    Supports both head (m) and pressure (bar) measurements:
    - rated_head: Direct head measurement in meters
    - rated_pressure_bar: Pressure measurement (auto-converts to head for comparison)
    
    Conversion: 1 bar = 10.197 meters of head (for water at sea level)
    """
    station_name = serializers.CharField(source="station.station_name", read_only=True)
    effective_rated_head = serializers.SerializerMethodField()
    
    class Meta:
        model = StationDeviceSpecifications
        fields = [
            'id',
            'station',
            'station_name',
            'motor_power_rating',
            'rated_current',
            'rated_flow_rate',
            'rated_head',
            'rated_pressure_bar',
            'effective_rated_head',
            'device_model',
            'manufacturer',
            'serial_number',
            'installation_date',
            'last_maintenance',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'effective_rated_head']
    
    def get_effective_rated_head(self, obj):
        """Return effective rated head, converting from pressure if needed"""
        return obj.get_effective_rated_head()


# Enhanced OpcUaClientConfigSerializer to include device specs
class OpcUaClientConfigDetailedSerializer(serializers.ModelSerializer):
    """Extended version of OpcUaClientConfigSerializer that includes device specifications."""
    device_specs = StationDeviceSpecificationsSerializer(read_only=True)
    
    class Meta:
        model = OpcUaClientConfig
        fields = [
            'id',
            "station_name",
            "endpoint_url",
            "active",
            "last_connected",
            "created_at",
            "connection_status",
            "security_policy",
            "latitude",
            "longitude",
            "device_specs"
        ]
