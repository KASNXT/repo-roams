"""
VPN Client Serializers for L2TP and OpenVPN
"""
from rest_framework import serializers
from .models import L2TPVPNClient, OpenVPNClient, VPNAuditLog, generate_secure_password, generate_vpn_username
from django.utils import timezone
from datetime import timedelta
from cryptography.fernet import Fernet
import os


class L2TPVPNClientSerializer(serializers.ModelSerializer):
    """Serializer for L2TP VPN Client"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    is_expired = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = L2TPVPNClient
        fields = [
            'id', 'name', 'username', 'vpn_ip', 'server_ip',
            'max_connections', 'status', 'created_at', 'updated_at',
            'expires_at', 'is_expired', 'days_until_expiry',
            'created_by_username'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'expires_at', 'created_by_username']
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_days_until_expiry(self, obj):
        delta = obj.expires_at - timezone.now()
        return max(0, delta.days)


class L2TPVPNClientCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating L2TP VPN Client with auto-generated credentials"""
    auto_generate = serializers.BooleanField(default=True, write_only=True)
    
    class Meta:
        model = L2TPVPNClient
        fields = [
            'name', 'username', 'password', 'preshared_key',
            'vpn_ip', 'server_ip', 'max_connections', 'auto_generate'
        ]
    
    def create(self, validated_data):
        auto_generate = validated_data.pop('auto_generate', True)
        
        if auto_generate:
            validated_data['username'] = generate_vpn_username('l2tp')
            validated_data['password'] = generate_secure_password(16)
            validated_data['preshared_key'] = generate_secure_password(24)
        
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class OpenVPNClientSerializer(serializers.ModelSerializer):
    """Serializer for OpenVPN Client"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    is_expired = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = OpenVPNClient
        fields = [
            'id', 'name', 'common_name', 'vpn_ip', 'protocol', 'port',
            'compression_enabled', 'status', 'created_at', 'updated_at',
            'expires_at', 'is_expired', 'days_until_expiry',
            'created_by_username'
        ]
        read_only_fields = [
            'id', 'certificate', 'private_key', 'created_at',
            'updated_at', 'expires_at', 'created_by_username'
        ]
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_days_until_expiry(self, obj):
        delta = obj.expires_at - timezone.now()
        return max(0, delta.days)


class OpenVPNClientCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating OpenVPN Client"""
    certificate = serializers.CharField(write_only=True, required=False)
    private_key = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = OpenVPNClient
        fields = [
            'name', 'common_name', 'vpn_ip', 'protocol', 'port',
            'compression_enabled', 'certificate', 'private_key'
        ]
    
    def create(self, validated_data):
        # Certificate and private key should be generated server-side
        # or provided by user - for now use placeholders
        validated_data['created_by'] = self.context['request'].user
        
        if 'certificate' not in validated_data:
            validated_data['certificate'] = "# Certificate placeholder - generate via OpenVPN CA"
        if 'private_key' not in validated_data:
            validated_data['private_key'] = "# Private key placeholder - generate via OpenVPN CA"
        
        return super().create(validated_data)


class VPNAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for VPN Audit Log"""
    admin_username = serializers.CharField(source='admin_user.username', read_only=True)
    
    class Meta:
        model = VPNAuditLog
        fields = [
            'id', 'action', 'vpn_type', 'client_name', 'client_id',
            'admin_username', 'ip_address', 'details', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp', 'admin_username']


class UserProfileLoginSerializer(serializers.Serializer):
    """Serializer for user last login information"""
    username = serializers.CharField(read_only=True)
    last_login_time = serializers.DateTimeField(read_only=True)
    last_login_ip = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
