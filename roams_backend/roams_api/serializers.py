from django.contrib.auth.models import User
from rest_framework import serializers
from roams_opcua_mgr.models import OPCUANode, OpcUaClientConfig,OpcUaReadLog  # import models

# Serializer for OPC UA Nodes
class OPCUANodeSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source="client_config.station_name", read_only=True)

    class Meta:
        model = OPCUANode
        fields = [
            'id', 
            'tag_name',
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
        fields = ['id', 'username', 'email', 'is_active']