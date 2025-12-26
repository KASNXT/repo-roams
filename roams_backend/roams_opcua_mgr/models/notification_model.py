from django.db import models
from django.contrib.auth.models import User
from .node_config_model import OPCUANode


class NotificationRecipient(models.Model):
    """
    Manages which users receive notifications for which OPC UA nodes.
    """

    ALERT_LEVEL_CHOICES = [
        ('warning', 'Warning Only'),
        ('critical', 'Critical Only'),
        ('both', 'Both Warning & Critical'),
    ]

    node = models.ForeignKey(
        OPCUANode,
        on_delete=models.CASCADE,
        related_name='notification_recipients'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notification_subscriptions'
    )

    alert_level = models.CharField(
        max_length=10,
        choices=ALERT_LEVEL_CHOICES,
        default='both'
    )

    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('node', 'user')
        ordering = ['node', 'user']
        verbose_name = "Notification Recipient"
        verbose_name_plural = "Notification Recipients"

    def __str__(self):
        return f"{self.user.username} → {self.node.tag_name} ({self.alert_level})"

    def can_receive_email(self):
        if not self.email_enabled:
            return False
        if hasattr(self.user, 'profile'):
            return self.user.profile.email_notifications and bool(self.user.email)
        return bool(self.user.email)

    def can_receive_sms(self):
        if not self.sms_enabled:
            return False
        if hasattr(self.user, 'profile'):
            return (
                self.user.profile.sms_notifications
                and bool(self.user.profile.phone_number)
            )
        return False
