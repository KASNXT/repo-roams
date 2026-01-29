"""Serializers for Control State functionality"""

from rest_framework import serializers
from roams_opcua_mgr.models import (
    ControlState, ControlStateHistory, ControlPermission, ControlStateRequest
)
from roams_api.serializers import UserSerializer


class ControlStateSerializer(serializers.ModelSerializer):
    """Serialize ControlState with related fields"""
    
    node_tag_name = serializers.CharField(source='node.tag_name', read_only=True)
    node_id = serializers.IntegerField(source='node.id', read_only=True)
    last_changed_by_username = serializers.CharField(
        source='last_changed_by.username', 
        read_only=True
    )
    can_user_change = serializers.SerializerMethodField()
    is_rate_limited = serializers.SerializerMethodField()
    time_until_allowed = serializers.SerializerMethodField()
    danger_display = serializers.CharField(source='get_danger_level_display', read_only=True)
    tag_type_display = serializers.CharField(source='get_tag_type_display', read_only=True)
    
    class Meta:
        model = ControlState
        fields = [
            'id', 'node', 'node_tag_name', 'node_id', 'tag_type', 'tag_type_display',
            'current_value', 'plc_value', 'is_synced_with_plc',
            'last_changed_at', 'last_changed_by', 'last_changed_by_username',
            'requires_confirmation', 'confirmation_timeout', 'rate_limit_seconds',
            'sync_error_message', 'description', 'danger_level', 'danger_display',
            'can_user_change', 'is_rate_limited', 'time_until_allowed',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'plc_value', 'is_synced_with_plc', 'sync_error_message',
            'last_changed_at', 'last_changed_by', 'created_at', 'updated_at'
        ]
    
    def get_can_user_change(self, obj):
        """Check if requesting user can change this control"""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return obj.can_change_state(request.user)
    
    def get_is_rate_limited(self, obj):
        """Check if control is currently rate-limited"""
        return obj.is_rate_limited()
    
    def get_time_until_allowed(self, obj):
        """Get seconds until next change allowed"""
        return round(obj.get_time_until_allowed(), 1)


class ControlStateHistorySerializer(serializers.ModelSerializer):
    """Serialize ControlStateHistory with user info"""
    
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    confirmed_by_username = serializers.CharField(source='confirmed_by.username', read_only=True)
    control_state_name = serializers.CharField(source='control_state.node.tag_name', read_only=True)
    change_type_display = serializers.CharField(source='get_change_type_display', read_only=True)
    
    class Meta:
        model = ControlStateHistory
        fields = [
            'id', 'control_state', 'control_state_name', 'change_type', 'change_type_display',
            'requested_by', 'requested_by_username', 'confirmed_by', 'confirmed_by_username',
            'previous_value', 'requested_value', 'final_value',
            'reason', 'error_message', 'ip_address', 'timestamp'
        ]
        read_only_fields = [
            'id', 'timestamp', 'change_type', 'requested_by', 'confirmed_by', 
            'final_value', 'error_message'
        ]


class ControlPermissionSerializer(serializers.ModelSerializer):
    """Serialize ControlPermission with user and control info"""
    
    username = serializers.CharField(source='user.username', read_only=True)
    control_state_name = serializers.CharField(source='control_state.node.tag_name', read_only=True)
    granted_by_username = serializers.CharField(source='granted_by.username', read_only=True)
    permission_level_display = serializers.CharField(source='get_permission_level_display', read_only=True)
    is_expired = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = ControlPermission
        fields = [
            'id', 'user', 'username', 'control_state', 'control_state_name',
            'permission_level', 'permission_level_display', 'is_active',
            'granted_at', 'granted_by', 'granted_by_username',
            'expires_at', 'is_expired', 'is_valid'
        ]
        read_only_fields = ['id', 'granted_at', 'granted_by', 'is_expired', 'is_valid']
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_is_valid(self, obj):
        return obj.is_valid()


class ControlStateRequestSerializer(serializers.ModelSerializer):
    """Serialize ControlStateRequest with user and timing info"""
    
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    confirmed_by_username = serializers.CharField(source='confirmed_by.username', read_only=True)
    control_state_name = serializers.CharField(source='control_state.node.tag_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_expired = serializers.SerializerMethodField()
    time_until_expiry = serializers.SerializerMethodField()
    requested_value_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ControlStateRequest
        fields = [
            'id', 'control_state', 'control_state_name', 'requested_by', 'requested_by_username',
            'requested_value', 'requested_value_display', 'reason', 'status', 'status_display',
            'confirmation_token', 'expires_at', 'is_expired', 'time_until_expiry',
            'confirmed_by', 'confirmed_by_username', 'confirmed_at',
            'ip_address', 'created_at'
        ]
        read_only_fields = [
            'id', 'confirmation_token', 'is_expired', 'time_until_expiry',
            'confirmed_by', 'confirmed_at', 'created_at'
        ]
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_time_until_expiry(self, obj):
        return round(obj.time_until_expiry(), 1)
    
    def get_requested_value_display(self, obj):
        return "ON" if obj.requested_value else "OFF"


class ControlStateChangeRequestSerializer(serializers.Serializer):
    """Serializer for requesting a control state change"""
    
    control_state_id = serializers.IntegerField()
    requested_value = serializers.BooleanField()
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    def validate_control_state_id(self, value):
        try:
            ControlState.objects.get(id=value)
        except ControlState.DoesNotExist:
            raise serializers.ValidationError("Control state not found")
        return value


class ControlStateConfirmationSerializer(serializers.Serializer):
    """Serializer for confirming a pending control request"""
    
    confirmation_token = serializers.CharField(max_length=100)
    
    def validate_confirmation_token(self, value):
        try:
            request_obj = ControlStateRequest.objects.get(confirmation_token=value)
            if request_obj.status != 'pending':
                raise serializers.ValidationError(
                    f"Request is not pending (current status: {request_obj.get_status_display()})"
                )
            if request_obj.is_expired():
                raise serializers.ValidationError("Confirmation request has expired")
        except ControlStateRequest.DoesNotExist:
            raise serializers.ValidationError("Invalid confirmation token")
        return value
