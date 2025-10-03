from django.db import models
from django.core.exceptions import ValidationError
from .client_config_model import OpcUaClientConfig

class AuthenticationSetting(models.Model):
    """
    Model for storing OPC UA authentication settings.
    """
    client_config = models.OneToOneField(
        OpcUaClientConfig,
        on_delete=models.CASCADE,
        help_text="Link to the OPCUA Client Configuration."
    )

    Anonymous = models.BooleanField(
        default=True,
        help_text='Allow anonymous connections. If checked, username and password fields will be disabled.'
    )

    username = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Enter the username for authentication. This field is ignored for anonymous connections."
    )

    password = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Enter the password for authentication. This field is ignored for anonymous connections.",
        verbose_name="Password"
    )

    class Meta:
        verbose_name = "Authentication Setting"
        verbose_name_plural = "Authentication Settings"

    def clean(self):
        """
        Validate authentication settings before saving.
        Ensures either anonymous authentication is enabled or both username and password are provided.
        """
        if not self.Anonymous and (not self.username or not self.password):
            raise ValidationError("You must either enable 'Anonymous' or provide both a username and password.")

    def save(self, *args, **kwargs):
        """
        Ensure validation before saving.
        Automatically sets username and password to None if anonymous authentication is enabled.
        """
        self.full_clean()
        if self.Anonymous:
            self.username = None
            self.password = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.client_config.station_name}: {'Anonymous' if self.Anonymous else 'Authenticated'} Connection"
