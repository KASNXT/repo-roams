from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import transaction, IntegrityError, DatabaseError
from django.utils.html import format_html
from django.utils import timezone

def validate_opcua_url(value):
    """Ensure that the endpoint URL starts with 'opc.tcp://'."""
    if not value.startswith("opc.tcp://"):
        raise ValidationError("The Endpoint URL must start with 'opc.tcp://'", code="invalid_url")


class OpcUaClientConfig(models.Model):
    """
    Model representing an OPC UA Client configuration.
    """
    
    station_name = models.CharField(
        max_length=100,
        help_text="Name of the station."
    )

    endpoint_url = models.CharField(
        max_length=2048,
        validators=[validate_opcua_url],  
        verbose_name="OPC UA Endpoint URL",
        help_text="Example: opc.tcp://kasmic.ddns.net:4840"
    )

    active = models.BooleanField(
        default=False,
        help_text="Indicates whether this configuration is active."
    )
    last_connected = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the last successful connection."
    )

    created_at = models.DateTimeField(
       
        auto_now_add=True,
        help_text="Timestamp when the configuration was created."
    )

    # Connection status choices
    CONNECTION_STATUS_CHOICES = [
        ("Connected", "Connected"),
        ("Disconnected", "Disconnected"),
        ("Faulty", "Faulty"),
    ]
    
    connection_status = models.CharField(
        max_length=20,
        choices=CONNECTION_STATUS_CHOICES,
        default="Disconnected"
    )
    connection_status = models.CharField(max_length=20, choices=CONNECTION_STATUS_CHOICES, default="Disconnected")
    
    # Security policies
    SECURITY_POLICY_CHOICES = [
        ("None", "None"),
        ("Basic128Rsa15", "Basic128Rsa15"), 
        ("Basic256", "Basic256"),
        ("Basic256sha256", "Basic256sha256"),
    ]
    
    security_policy = models.CharField(
        max_length=20,
        choices=SECURITY_POLICY_CHOICES,
        default="None",
        verbose_name="Security Policy",
        help_text="The security policy for the OPC UA client."
    )

    # Security modes
    SECURITY_MODE_CHOICES = [
        ("None", "None"),
        ("Sign", "Sign"),
        ("Sign_and_Encrypt", "Sign & Encrypt"),
    ]

    security_mode = models.CharField(
        max_length=20,
        choices=SECURITY_MODE_CHOICES,
        default="None",
        verbose_name="Security Mode",
        help_text="The security mode for message exchange."
    )

    # Advanced connection settings
    show_advanced_properties = models.BooleanField(
        default=False,
        help_text="Enable this to show advanced connection properties such as timeouts and intervals."
    )

    session_time_out = models.IntegerField(
        default=30000,  # 30 seconds
        validators=[MinValueValidator(1000), MaxValueValidator(3600000)],
        help_text="Session timeout in milliseconds (1000ms to 3600000ms)."
    )

    secure_time_out = models.IntegerField(
        default=10000,  # 10 seconds
        validators=[MinValueValidator(1000), MaxValueValidator(30000)],
        help_text="Secure timeout in milliseconds (1000ms to 30000ms)."
    )

    connection_time_out = models.IntegerField(
        default=30000,  # 30 seconds
        validators=[MinValueValidator(1000), MaxValueValidator(60000)],
        help_text="Connection timeout in milliseconds (1000ms to 60000ms)."
    )

    request_time_out = models.IntegerField(
        default=10000,  # 10 seconds
        validators=[MinValueValidator(1000), MaxValueValidator(30000)],
        help_text="Request timeout in milliseconds (1000ms to 30000ms)."
    )

    acknowledge_time_out = models.IntegerField(
        default=5000,  # 5 seconds
        validators=[MinValueValidator(1000), MaxValueValidator(10000)],
        help_text="Acknowledge timeout in milliseconds (1000ms to 10000ms)."
    )

    subscription_interval = models.IntegerField(
        default=5000,  # 5 seconds
        validators=[MinValueValidator(1000), MaxValueValidator(60000)],
        help_text="Subscription interval in milliseconds (1000ms to 60000ms)."
    )

    class Meta:
        verbose_name = "OPC UA Client Configuration"
        verbose_name_plural = "OPC UA Client Configurations"
        constraints = [
            models.UniqueConstraint(
                fields=["station_name", "endpoint_url"], 
                name="unique_station_name_endpoint_per_client"
            )
        ]
    def get_client_instance(self):
        
        """Retrieve the active OPC UA client instance for this configuration."""
        active_servers = OpcUaClientConfig.objects.filter(active=True)
        return active_servers.get(self.station_name)  # ✅ Returns the connected client

    def clean(self):
        """
        Ensures that security policies and modes are valid.
        """
        if self.security_policy != "None" and self.security_mode == "None":
            raise ValidationError("A security mode must be selected if a security policy is applied.")

        if self.security_mode != "None" and self.security_policy == "None":
            raise ValidationError("A security policy must be selected if a security mode is applied.")
    from django.db import IntegrityError, DatabaseError
    
    def safe_save(self):
        """Attempts to save the instance and handles potential errors."""
        try:
            with transaction.atomic():
                self.full_clean()  # Ensures model field validation
                super(OpcUaClientConfig, self).save()  # Calls your overridden save() safely
            print("Saved successfully:", self)
            return True
        except ValidationError as e:
            print(f"Validation Error: {e}")  # Captures field validation errors
        except IntegrityError as e:
            print(f"Integrity Error: {e}")  # Captures duplicate constraints
        except DatabaseError as e:
            print(f"Database Error: {e}")  # Captures database-related issues
        except Exception as e:
            print(f"Unexpected Error: {e}")  # Catch-all for unknown errors
        return False

    def __str__(self):
        return f"{self.station_name} ({self.endpoint_url})"
    def get_connection_status(self):
        """Return connection status with color formatting."""
        colors = {"Connected": "green", "Faulty": "red", "Disconnected": "orange"}
        return format_html(f'<span style="color: {colors[self.connection_status]};">{self.connection_status}</span>')
    
    def save(self, *args, **kwargs):
        if not self.pk and OpcUaClientConfig.objects.filter(station_name=self.station_name).exists():
            raise ValueError("Duplicate station name is not allowed.")
        super().save(*args, **kwargs)

   