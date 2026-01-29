from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator


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
