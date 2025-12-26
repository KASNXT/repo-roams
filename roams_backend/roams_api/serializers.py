from django.contrib.auth.models import User
from rest_framework import serializers
from roams_opcua_mgr.models import OPCUANode, OpcUaClientConfig, OpcUaReadLog, ThresholdBreach, NotificationRecipient
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
            "security_policy"
        ]

# Serializer for OpcUaReadLog
class OpcUaReadLogSerializer(serializers.ModelSerializer):
    station_name = serializers.SerializerMethodField()
    node_tag_name = serializers.CharField(source="node.tag_name", read_only=True)
    nodes_count = serializers.IntegerField(source="opcuanode_set.count", read_only=True)
    class Meta:
        model = OpcUaReadLog
        fields = [
        'id', 'station_name', 
        'node_tag_name','nodes_count', 
        'value', 'timestamp'
        ]

    def get_station_name(self, obj):
        return obj.client_config.station_name

# Serializer for User model
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "is_active", "is_staff", "last_login"]

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


# ============== THRESHOLD SERIALIZERS ==============

class ThresholdBreachSerializer(serializers.ModelSerializer):
    """Serializer for individual threshold breach events"""
    node_tag_name = serializers.CharField(source="node.tag_name", read_only=True)
    
    class Meta:
        model = ThresholdBreach
        fields = [
            'id',
            'node',
            'node_tag_name',
            'threshold',
            'value',
            'level',
            'acknowledged',
            'acknowledged_by',
            'acknowledged_at',
            'timestamp',
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