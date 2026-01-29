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

    # 🗺️ Geographic coordinates for mapping
    latitude = models.FloatField(
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
        null=True, blank=True,
        help_text="Latitude of the station."
    )

    longitude = models.FloatField(
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
        null=True, blank=True,
        help_text="Longitude of the station."
    )
    # OPC UA Endpoint URL
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
        default=60000,  # 60 seconds (increased from 30s for stability)
        validators=[MinValueValidator(5000), MaxValueValidator(600000)],  # Updated: 5s-10min
        help_text="⏱️ Session timeout in milliseconds. Server keeps session alive this long with no activity. "
                  "Typical: 30000-60000ms (30-60s). Increase if frequent disconnects. Range: 5000-600000ms"
    )

    secure_time_out = models.IntegerField(
        default=10000,  # 10 seconds
        validators=[MinValueValidator(5000), MaxValueValidator(30000)],  # Updated: 5s-30s min for secure
        help_text="🔒 Secure channel timeout in milliseconds. For encrypted connections only. "
                  "Minimum 5000ms recommended for secure channels. Range: 5000-30000ms"
    )

    connection_time_out = models.IntegerField(
        default=5000,  # 5 seconds (fails fast on unreachable hosts)
        validators=[MinValueValidator(1000), MaxValueValidator(30000)],  # Updated: 1s-30s
        help_text="🔌 Connection timeout in milliseconds. How long to wait for server to respond to connection. "
                  "Local: 3000-5000ms | Remote: 10000-15000ms | Slow: 20000-30000ms. Range: 1000-30000ms"
    )

    request_time_out = models.IntegerField(
        default=10000,  # 10 seconds
        validators=[MinValueValidator(1000), MaxValueValidator(60000)],  # Updated: up to 60s
        help_text="📝 Request timeout in milliseconds. Time to wait for OPC UA server to respond to read/write requests. "
                  "Typical: 5000-10000ms. Range: 1000-60000ms"
    )

    acknowledge_time_out = models.IntegerField(
        default=5000,  # 5 seconds
        validators=[MinValueValidator(1000), MaxValueValidator(30000)],  # Updated: up to 30s
        help_text="✓ Acknowledge timeout in milliseconds. Wait time for write operations to complete. "
                  "Typical: 3000-5000ms. Range: 1000-30000ms"
    )

    subscription_interval = models.IntegerField(
        default=5000,  # 5 seconds (BALANCED: Fast enough for alerts, slow enough for stability)
        validators=[MinValueValidator(1000), MaxValueValidator(60000)],  # GOOD: 1s-60s
        help_text="📈 Subscription interval in milliseconds. How often to read values from OPC UA server. "
                  "Fast sensors: 1000ms | General: 5000ms | Slow sensors: 30000ms. "
                  "⚠️ MUST MATCH other SCADA systems for accurate data comparison. Range: 1000-60000ms"
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
        return OpcUaClientConfig.objects.filter(active=True, station_name=self.station_name).first()  # ✅ Returns the connected client

    def clean(self):
        """
        Validates security policies, modes, and timeout configurations for consistency.
        Prevents invalid timeout combinations that would cause connection issues.
        """
        errors = {}
        
        # ✅ Security policy/mode validation
        if self.security_policy != "None" and self.security_mode == "None":
            errors['security_mode'] = "A security mode must be selected if a security policy is applied."

        if self.security_mode != "None" and self.security_policy == "None":
            errors['security_policy'] = "A security policy must be selected if a security mode is applied."
        
        # ✅ TIMEOUT RELATIONSHIP VALIDATION
        # Rule 1: Session timeout should be greater than connection timeout
        # (Session timeout is how long server keeps connection alive; connection_timeout is how long to wait for initial connection)
        if self.session_time_out <= self.connection_time_out:
            errors['session_time_out'] = (
                f"Session timeout ({self.session_time_out}ms) should be > "
                f"connection timeout ({self.connection_time_out}ms). "
                f"Increase session_time_out or decrease connection_time_out."
            )
        
        # Rule 2: Request timeout should not exceed session timeout
        # (Can't wait longer for a request than the session lasts)
        if self.request_time_out > self.session_time_out:
            errors['request_time_out'] = (
                f"Request timeout ({self.request_time_out}ms) should be < "
                f"session timeout ({self.session_time_out}ms). "
                f"Increase session_time_out or decrease request_time_out."
            )
        
        # Rule 3: Secure timeout should be reasonable for encrypted channels
        # If using security, secure_time_out should be at least as large as connection_time_out
        if self.security_policy != "None" and self.security_mode != "None":
            if self.secure_time_out < self.connection_time_out:
                errors['secure_time_out'] = (
                    f"Secure channel timeout ({self.secure_time_out}ms) should be >= "
                    f"connection timeout ({self.connection_time_out}ms) since secure connections take longer. "
                    f"Consider increasing secure_time_out."
                )
        
        # Raise all errors together if any exist
        if errors:
            raise ValidationError(errors)
    
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

class ConnectionLog(models.Model):
    station = models.ForeignKey(OpcUaClientConfig, on_delete=models.CASCADE)
    status = models.CharField(
        max_length=10,
        choices=[('online', 'Online'), ('offline', 'Offline')]
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.station.station_name} - {self.status} at {self.timestamp}"
