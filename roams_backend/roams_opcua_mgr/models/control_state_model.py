"""
Control State Model - Manages boolean tag states for plant control
Features:
- Persistent state across restarts
- Full audit trail of all changes
- Permission-based access control
- Safety features (confirmations, rate limiting)
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class ControlState(models.Model):
    """Represents a boolean control tag and its current state"""
    
    TAG_TYPES = [
        ('pump', 'Pump Control'),
        ('valve', 'Valve Control'),
        ('alarm', 'Alarm Control'),
        ('emergency', 'Emergency Stop'),
        ('mode', 'Mode Selection'),
        ('reset', 'System Reset'),
        ('door', 'Door Control'),
        ('other', 'Other Control'),
    ]
    
    # Link to OPCUANode (for boolean tags)
    node = models.OneToOneField(
        'OPCUANode',
        on_delete=models.CASCADE,
        related_name='control_state',
        help_text="Boolean OPC UA node for this control"
    )
    
    # Control metadata
    tag_type = models.CharField(
        max_length=20,
        choices=TAG_TYPES,
        default='other',
        help_text="Type of control this tag represents"
    )
    
    # Current state
    current_value = models.BooleanField(
        default=False,
        help_text="Current state of the control (True=ON/Active, False=OFF/Inactive)"
    )
    
    # Last known state from PLC
    plc_value = models.BooleanField(
        default=False,
        help_text="Last confirmed state from PLC"
    )
    
    # Timestamps
    last_changed_at = models.DateTimeField(
        auto_now=True,
        help_text="When this state was last modified"
    )
    
    last_changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='control_state_changes',
        help_text="User who last modified this state"
    )
    
    # Safety features
    requires_confirmation = models.BooleanField(
        default=True,
        help_text="Whether changing this state requires admin confirmation"
    )
    
    confirmation_timeout = models.IntegerField(
        default=30,  # 30 seconds
        help_text="Seconds to wait for confirmation before timeout"
    )
    
    rate_limit_seconds = models.IntegerField(
        default=5,
        help_text="Minimum seconds between state changes to prevent rapid toggling"
    )
    
    # Status tracking
    is_synced_with_plc = models.BooleanField(
        default=False,
        help_text="Whether current_value matches PLC state"
    )
    
    sync_error_message = models.TextField(
        blank=True,
        default="",
        help_text="Error message if sync failed"
    )
    
    # Metadata
    description = models.TextField(
        blank=True,
        default="",
        help_text="Description of what this control does"
    )
    
    danger_level = models.IntegerField(
        default=0,
        choices=[
            (0, '🟢 Safe - No safety impact'),
            (1, '🟡 Caution - Minor risk'),
            (2, '🔴 Danger - Major risk'),
            (3, '⛔ Critical - Emergency only'),
        ],
        help_text="Safety risk level of changing this control"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Control State"
        verbose_name_plural = "Control States"
        indexes = [
            models.Index(fields=['node']),
            models.Index(fields=['tag_type']),
            models.Index(fields=['last_changed_at']),
        ]
    
    def __str__(self):
        status = "ON" if self.current_value else "OFF"
        return f"{self.node.tag_name} - {status}"
    
    def can_change_state(self, user):
        """Check if user has permission to change this control"""
        if not user or not user.is_active:
            return False
        
        if user.is_superuser:
            return True
        
        return ControlPermission.objects.filter(
            user=user,
            control_state=self,
            is_active=True
        ).exists()
    
    def is_rate_limited(self):
        """Check if this control is rate-limited"""
        time_since_change = timezone.now() - self.last_changed_at
        return time_since_change.total_seconds() < self.rate_limit_seconds
    
    def get_time_until_allowed(self):
        """Get seconds until next change is allowed"""
        time_since_change = timezone.now() - self.last_changed_at
        elapsed = time_since_change.total_seconds()
        remaining = max(0, self.rate_limit_seconds - elapsed)
        return remaining


class ControlStateHistory(models.Model):
    """Audit trail for all control state changes"""
    
    CHANGE_TYPES = [
        ('requested', 'Change Requested'),
        ('confirmed', 'Change Confirmed'),
        ('executed', 'Change Executed'),
        ('failed', 'Change Failed'),
        ('synced', 'State Synced from PLC'),
        ('timeout', 'Confirmation Timeout'),
        ('cancelled', 'Change Cancelled'),
    ]
    
    control_state = models.ForeignKey(
        ControlState,
        on_delete=models.CASCADE,
        related_name='history'
    )
    
    change_type = models.CharField(
        max_length=20,
        choices=CHANGE_TYPES,
        help_text="Type of change event"
    )
    
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='control_history_requests'
    )
    
    confirmed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='control_history_confirmations'
    )
    
    previous_value = models.BooleanField(
        help_text="Value before change"
    )
    
    requested_value = models.BooleanField(
        help_text="Requested new value"
    )
    
    final_value = models.BooleanField(
        null=True,
        blank=True,
        help_text="Actual final value after execution"
    )
    
    reason = models.TextField(
        blank=True,
        default="",
        help_text="Reason for the change"
    )
    
    error_message = models.TextField(
        blank=True,
        default="",
        help_text="Error details if change failed"
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of requester"
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    
    class Meta:
        verbose_name = "Control State History"
        verbose_name_plural = "Control State Histories"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['control_state', '-timestamp']),
            models.Index(fields=['requested_by', '-timestamp']),
            models.Index(fields=['change_type']),
        ]
    
    def __str__(self):
        return f"{self.control_state.node.tag_name} - {self.change_type} - {self.timestamp}"


class ControlPermission(models.Model):
    """Define who can control which boolean tags"""
    
    PERMISSION_LEVELS = [
        ('view', 'View Only'),
        ('request', 'Request Change (requires confirmation)'),
        ('execute', 'Execute Change (immediate, no confirmation)'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='control_permissions'
    )
    
    control_state = models.ForeignKey(
        ControlState,
        on_delete=models.CASCADE,
        related_name='permissions'
    )
    
    permission_level = models.CharField(
        max_length=20,
        choices=PERMISSION_LEVELS,
        default='request',
        help_text="What this user can do with this control"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this permission is currently active"
    )
    
    granted_at = models.DateTimeField(
        auto_now_add=True
    )
    
    granted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='control_permissions_granted',
        help_text="Admin who granted this permission"
    )
    
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this permission expires (null = never)"
    )
    
    class Meta:
        unique_together = ('user', 'control_state')
        verbose_name = "Control Permission"
        verbose_name_plural = "Control Permissions"
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['control_state']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.control_state.node.tag_name} ({self.permission_level})"
    
    def is_expired(self):
        """Check if permission has expired"""
        if self.expires_at is None:
            return False
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if permission is valid and not expired"""
        return self.is_active and not self.is_expired()


class ControlStateRequest(models.Model):
    """Pending state change requests awaiting confirmation"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Confirmation'),
        ('confirmed', 'Confirmed - Executing'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Confirmation Expired'),
    ]
    
    control_state = models.ForeignKey(
        ControlState,
        on_delete=models.CASCADE,
        related_name='pending_requests'
    )
    
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='control_requests'
    )
    
    requested_value = models.BooleanField(
        help_text="Requested state change to this value"
    )
    
    reason = models.TextField(
        blank=True,
        default="",
        help_text="Reason for requested change"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    
    confirmation_token = models.CharField(
        max_length=100,
        unique=True,
        help_text="Security token for confirming request"
    )
    
    expires_at = models.DateTimeField(
        help_text="When this request expires if not confirmed"
    )
    
    confirmed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='control_confirmations'
    )
    
    confirmed_at = models.DateTimeField(
        null=True,
        blank=True
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Control State Request"
        verbose_name_plural = "Control State Requests"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'expires_at']),
            models.Index(fields=['control_state', 'status']),
        ]
    
    def __str__(self):
        value_str = "ON" if self.requested_value else "OFF"
        return f"{self.control_state.node.tag_name} → {value_str} ({self.status})"
    
    def is_expired(self):
        """Check if request has expired"""
        return timezone.now() > self.expires_at and self.status == 'pending'
    
    def time_until_expiry(self):
        """Get seconds until request expires"""
        remaining = (self.expires_at - timezone.now()).total_seconds()
        return max(0, remaining)
