"""
Alarm Retention Policy Model
Manages automatic cleanup of old alarm logs and threshold breaches
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


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
