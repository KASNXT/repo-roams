from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.utils import timezone
from datetime import timedelta
import secrets
import string


class UserProfile(models.Model):
    """
    Extended user profile to store additional contact information and role.
    Links to Django's built-in User model.
    """
    ROLE_CHOICES = [
        ('viewer', 'Viewer (Read-only access)'),
        ('technician', 'Technician (Equipment control)'),
        ('operator', 'Operator (Full access to equipment)'),
        ('admin', 'Admin (System admin)'),
        ('superuser', 'Superuser (Full system access)'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        help_text="Link to Django user account"
    )
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='viewer',
        help_text="User's role in the system"
    )
    
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message='Phone number must be between 9-15 digits, optionally starting with +',
            )
        ],
        help_text="User's phone number for SMS notifications (format: +1234567890)"
    )
    
    email_notifications = models.BooleanField(
        default=True,
        help_text="User wants to receive email notifications"
    )
    
    sms_notifications = models.BooleanField(
        default=False,
        help_text="User wants to receive SMS notifications"
    )
    
    critical_alerts_only = models.BooleanField(
        default=False,
        help_text="Only receive critical level alerts (ignore warnings)"
    )
    
    last_login_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last login timestamp"
    )
    
    last_login_ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of last login"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
    
    def __str__(self):
        return f"{self.user.username} - Profile"
    
    def get_contact_info(self):
        """Return user's contact info based on preferences"""
        contacts = {}
        if self.email_notifications and self.user.email:
            contacts['email'] = self.user.email
        if self.sms_notifications and self.phone_number:
            contacts['sms'] = self.phone_number
        return contacts


class L2TPVPNClient(models.Model):
    """
    L2TP/IPsec VPN client credentials management
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('revoked', 'Revoked'),
    ]
    
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Client name (e.g., Bombo_BH, Nakasongola)"
    )

    station = models.ForeignKey(
        'roams_opcua_mgr.OpcUaClientConfig',
        on_delete=models.PROTECT,
        related_name='l2tp_vpn_clients',
        help_text="Associated station for this VPN client"
    )
    
    username = models.CharField(
        max_length=50,
        unique=True,
        help_text="L2TP username for authentication"
    )
    
    password = models.CharField(
        max_length=255,
        help_text="Encrypted password"
    )
    
    preshared_key = models.CharField(
        max_length=255,
        help_text="Encrypted IPsec Pre-Shared Key (PSK)"
    )
    
    vpn_ip = models.GenericIPAddressField(
        help_text="Assigned VPN IP address (10.99.0.x)"
    )
    
    server_ip = models.GenericIPAddressField(
        help_text="VPN server IP address"
    )
    
    max_connections = models.IntegerField(
        default=1,
        help_text="Maximum concurrent connections allowed"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    expires_at = models.DateTimeField(
        help_text="Certificate expiration date (1 year from creation)"
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='l2tp_clients_created'
    )
    
    class Meta:
        verbose_name = "L2TP VPN Client"
        verbose_name_plural = "L2TP VPN Clients"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.username})"
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=365)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        return timezone.now() > self.expires_at


class OpenVPNClient(models.Model):
    """
    OpenVPN client certificate management
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('revoked', 'Revoked'),
    ]
    
    PROTOCOL_CHOICES = [
        ('tcp', 'TCP'),
        ('udp', 'UDP'),
    ]
    
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Client name (e.g., admin_laptop, station_control)"
    )

    station = models.ForeignKey(
        'roams_opcua_mgr.OpcUaClientConfig',
        on_delete=models.PROTECT,
        related_name='openvpn_clients',
        help_text="Associated station for this VPN client"
    )
    
    common_name = models.CharField(
        max_length=64,
        unique=True,
        help_text="OpenVPN Certificate Common Name"
    )
    
    certificate = models.TextField(
        help_text="Client certificate (PEM format)"
    )
    
    private_key = models.TextField(
        help_text="Client private key (PEM format, encrypted)"
    )
    
    vpn_ip = models.GenericIPAddressField(
        help_text="Assigned VPN IP address (10.8.0.x)"
    )
    
    protocol = models.CharField(
        max_length=10,
        choices=PROTOCOL_CHOICES,
        default='udp'
    )
    
    port = models.IntegerField(
        default=1194,
        help_text="OpenVPN server port"
    )
    
    compression_enabled = models.BooleanField(
        default=True,
        help_text="Enable LZ4 compression"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    expires_at = models.DateTimeField(
        help_text="Certificate expiration date (1 year from creation)"
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='openvpn_clients_created'
    )
    
    class Meta:
        verbose_name = "OpenVPN Client"
        verbose_name_plural = "OpenVPN Clients"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.common_name})"
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=365)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        return timezone.now() > self.expires_at


class VPNAuditLog(models.Model):
    """
    Audit trail for VPN client operations
    Logs all CRUD operations and important events
    """
    ACTION_CHOICES = [
        ('create', 'Create Client'),
        ('update', 'Update Client'),
        ('delete', 'Delete Client'),
        ('revoke', 'Revoke Client'),
        ('download', 'Download Config'),
        ('activate', 'Activate Client'),
        ('deactivate', 'Deactivate Client'),
    ]
    
    VPN_TYPE_CHOICES = [
        ('l2tp', 'L2TP/IPsec'),
        ('openvpn', 'OpenVPN'),
    ]
    
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES
    )
    
    vpn_type = models.CharField(
        max_length=20,
        choices=VPN_TYPE_CHOICES
    )
    
    client_name = models.CharField(
        max_length=100,
        help_text="Name of the VPN client"
    )
    
    client_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="ID of the VPN client (if known)"
    )
    
    admin_user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='vpn_audit_logs'
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address from which action was performed"
    )
    
    details = models.TextField(
        blank=True,
        help_text="Additional details about the action"
    )
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "VPN Audit Log"
        verbose_name_plural = "VPN Audit Logs"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['admin_user', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.action} - {self.client_name} by {self.admin_user.username}"


def generate_secure_password(length=16):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for i in range(length))


def generate_vpn_username(prefix='vpn'):
    """Generate unique VPN username"""
    random_str = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
    return f"{prefix}_{random_str}"
