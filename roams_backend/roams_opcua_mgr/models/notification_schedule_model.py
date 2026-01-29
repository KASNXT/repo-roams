"""
Notification Scheduling Model
Tracks when notifications are sent for breaches to implement standard interval sending
"""

from django.db import models
from django.utils.timezone import now, timedelta
from django.apps import apps


class NotificationSchedule(models.Model):
    """
    Tracks notification sending to implement standard interval notifications.
    Prevents notification spam by sending at standard intervals (e.g., every hour).
    """
    
    breach = models.OneToOneField(
        'roams_opcua_mgr.ThresholdBreach',
        on_delete=models.CASCADE,
        related_name='notification_schedule',
        help_text="The threshold breach this schedule is for"
    )
    
    # First and last notification timestamps
    first_notified_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the first notification was sent"
    )
    last_notified_at = models.DateTimeField(
        help_text="When the last notification was sent"
    )
    
    # Notification interval
    INTERVAL_CHOICES = [
        ('15min', '15 Minutes'),
        ('30min', '30 Minutes'),
        ('1hour', '1 Hour'),
        ('4hours', '4 Hours'),
        ('daily', 'Daily'),
        ('never', 'Never'),
    ]
    interval = models.CharField(
        max_length=20,
        choices=INTERVAL_CHOICES,
        default='1hour',
        help_text="How often to send notifications while breach is active"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether notifications are still being sent"
    )
    
    # Count of notifications sent
    notification_count = models.IntegerField(
        default=1,
        help_text="How many times this breach has been notified"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Notification Schedule"
        verbose_name_plural = "Notification Schedules"
    
    def __str__(self):
        return f"Notifications for breach {self.breach.id} (interval: {self.interval})"
    
    def should_notify_now(self):
        """Check if it's time to send the next notification based on interval"""
        if not self.is_active:
            return False
        
        interval_map = {
            '15min': timedelta(minutes=15),
            '30min': timedelta(minutes=30),
            '1hour': timedelta(hours=1),
            '4hours': timedelta(hours=4),
            'daily': timedelta(days=1),
            'never': timedelta(days=365*10),  # Essentially never
        }
        
        next_notification_time = self.last_notified_at + interval_map.get(self.interval, timedelta(hours=1))
        return now() >= next_notification_time
    
    def record_notification(self):
        """Record that a notification has been sent"""
        self.last_notified_at = now()
        self.notification_count += 1
        self.save(update_fields=['last_notified_at', 'notification_count'])
