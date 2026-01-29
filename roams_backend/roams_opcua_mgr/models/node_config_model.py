from django.db import models
from django.core.exceptions import ValidationError
from .client_config_model import OpcUaClientConfig


#node config model.py
# Validate Node ID format
def validate_node_id(value):
    """
    Validate that the node ID follows the format: 'ns=<number>;i=<number>'
    Example: 'ns=2;i=12345'
    """
    if not value.startswith("ns=") or ";i=" not in value:
        raise ValidationError("The node ID must start with 'ns=<number>;i=<number>'.", code="invalid_node_id")

    try:
        ns_part, i_part = value.split(";i=")
        ns_value = ns_part.split("=")[1]
        i_value = i_part
        
        # Ensure both parts are numeric
        if not ns_value.isdigit() or not i_value.isdigit():
            raise ValueError
    except (IndexError, ValueError):
        raise ValidationError("The node ID must be in the format 'ns=<number>;i=<number>'.", code="invalid_node_id")


# Model for storing OPC UA Node Configuration
class OPCUANode(models.Model):
    """Model for configuring OPC UA Node fields and units """
    
    client_config = models.ForeignKey(
        OpcUaClientConfig,
        on_delete=models.CASCADE,
        db_index=True,
        help_text="Link to the OPC UA client configuration."
    )
    
    # Foreign key to the TagName model
    tag_name = models.ForeignKey(
        'TagName',  # Linking to the external TagName model
        on_delete=models.CASCADE,
        db_index=True,
        blank=True,
        null=True,
        help_text="Choose from predefined tags or add a custom tag."
    )

    # Field for adding a new tag name (if not already in the list)
    add_new_tag_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Enter a new tag name (if not already in the list)."
    )

    tag_units = models.CharField(
        max_length=50,
        blank=True,
        default="",
        null=True,
        help_text="Engineering units for the tag (e.g., 'm³/h', 'm³',°C, bars etc.)."
    )
    
    # Data type for proper UI representation
    DATA_TYPE_CHOICES = [
        ("Float", "Float (32-bit)"),
        ("Double", "Double (64-bit)"),
        ("Int16", "Int16 (Signed 16-bit)"),
        ("UInt16", "UInt16 (Unsigned 16-bit)"),
        ("Int32", "Int32 (Signed 32-bit)"),
        ("UInt32", "UInt32 (Unsigned 32-bit)"),
        ("Boolean", "Boolean (True/False)"),
        ("String", "String"),
    ]
    data_type = models.CharField(
        max_length=20,
        choices=DATA_TYPE_CHOICES,
        default="Float",
        help_text="OPC UA node data type"
    )
    
    # Display representation type
    DISPLAY_TYPE_CHOICES = [
        ("numeric", "📊 Numeric Display"),
        ("gauge", "🎯 Gauge (Linear)"),
        ("gauge-circular", "🎡 Gauge (Circular)"),
        ("progress", "📈 Progress Bar"),
        ("switch", "🔘 Toggle Switch (Boolean)"),
        ("status-indicator", "🟢 Status Indicator"),
        ("chart", "📉 Mini Chart"),
    ]
    display_type = models.CharField(
        max_length=20,
        choices=DISPLAY_TYPE_CHOICES,
        default="numeric",
        help_text="How to display this node in the UI"
    )
    
    # Display precision
    decimal_places = models.IntegerField(
        default=2,
        help_text="Number of decimal places to display (0 for integers)"
    )
    
    # Display range (for gauges and progress bars)
    display_min = models.FloatField(
        blank=True,
        null=True,
        help_text="Minimum value for gauge/chart display (auto-scale if blank)"
    )
    display_max = models.FloatField(
        blank=True,
        null=True,
        help_text="Maximum value for gauge/chart display (auto-scale if blank)"
    )
    
    # Operational limits
    min_value = models.FloatField(
        blank=True,
        null=True,
        help_text="Minimum acceptable value"
    )
    max_value = models.FloatField(
        blank=True,
        null=True,
        help_text="Maximum acceptable value"
    )
    
    # Icon/Category for UI grouping
    ICON_CHOICES = [
        ("zap", "⚡ Power"),
        ("droplet", "💧 Flow/Liquid"),
        ("gauge", "📏 Pressure/Level"),
        ("thermometer", "🌡️ Temperature"),
        ("battery", "🔋 Battery"),
        ("wind", "💨 Air Flow"),
        ("settings", "⚙️ Status"),
        ("alert", "⚠️ Alert"),
        ("check-circle", "✓ Operational"),
        ("x-circle", "✗ Fault"),
    ]
    icon = models.CharField(
        max_length=20,
        choices=ICON_CHOICES,
        blank=True,
        default="",
        help_text="Icon category for UI grouping"
    )
    
    # Boolean control flag
    is_boolean_control = models.BooleanField(
        default=False,
        help_text="Enable for boolean nodes that should be switchable (toggle controls)"
    )
    
    # Alert thresholds (combined from TagThreshold model)
    warning_level = models.FloatField(
        null=True,
        blank=True,
        help_text="Value at which a warning is triggered"
    )
    critical_level = models.FloatField(
        null=True,
        blank=True,
        help_text="Value at which a critical alert is triggered"
    )
    
    SEVERITY_CHOICES = [
        ("Warning", "Warning"),
        ("Critical", "Critical"),
    ]
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        default="Warning",
        help_text="Default severity level for breaches"
    )
    
    # Threshold control
    threshold_active = models.BooleanField(
        default=True,
        help_text="Whether threshold monitoring is active for this node"
    )
    
    # Sampling configuration
    sampling_interval = models.IntegerField(
        default=60,
        help_text="Sampling interval in seconds (e.g., 60 for standard 1-minute intervals)"
    )
    last_whole_number = models.IntegerField(
        null=True,
        blank=True,
        help_text="Last recorded whole number value for change detection"
    )
    sample_on_whole_number_change = models.BooleanField(
        default=True,
        help_text="Only log data when whole number part changes (e.g., 47.6 -> 48)"
    )
    
    # Field for specifying the access level of the tag
    # Choices for access level
     # Choices for access level
    ACCESS_LEVEL_CHOICES = [
        ("Read_only", "🔒Read Only"),
        ("Write_only", "✍️Write Only"),
        ("Read_write", "🔓Read/Write"),
    ]
    
    # Other fields in your model...
    access_level = models.CharField(
        max_length=10,
        choices=ACCESS_LEVEL_CHOICES,
        default="Read_only",  # Default choice
        help_text="Specify the access level of the tag."
    )
       

    # Node ID and last value of the node
    node_id = models.CharField(
        max_length=255, validators=[validate_node_id],
        help_text="Enter the Node ID in the format 'ns=<number>;i=<number>'."
    )
    
    last_value = models.TextField(blank=True, null=True)  # TextField for larger values
    last_updated = models.DateTimeField(auto_now=True)
    is_alarm = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def is_active(self):
        return self.client_config.active  # Fetch 'active' from OpcUaClientConfig

    is_active.short_description = "Active"
    is_active.boolean = True  # Show as a checkbox in Django Admin
   
    # Enforcing uniqueness of node_id per client_config and allowing duplicate tag names across different stations
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['client_config', 'node_id'], name='unique_node_id_per_client'),
            models.UniqueConstraint(fields=["client_config", "tag_name"], name="unique_tag_per_client"),  # New constraint
         ]
        indexes = [
            models.Index(fields=["node_id"]),  # Index for fast lookup
            models.Index(fields=['threshold_active', 'updated_at']),  # Index for threshold queries
        ]

    def __str__(self):
        icon_display = f"[{self.icon}]" if self.icon else ""
        data_type_short = self.data_type.split("(")[0].strip()
        display_info = f"{self.get_display_type_display()}"
        return f"{self.tag_name or 'No Tag'} - {self.node_id} | {data_type_short} | {self.tag_units} | {display_info} {icon_display}"


# Model for storing Tag Names (Predefined and Custom Tags)
class TagName(models.Model):
    """
    Model to store tag names (both predefined and custom tags).
    """
    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="Tag name for OPC UA Node configuration."
    )
    tag_units = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        default="",
        help_text="Engineering units (e.g., m³/h, °C, bars,m³ etc.)."
    )
   
    def __str__(self):
        return self.name
# Model for logging alarms
class AlarmLog(models.Model):
    node = models.ForeignKey("OPCUANode", on_delete=models.CASCADE)
    station_name = models.CharField(max_length=100)
    message = models.TextField()
    severity = models.CharField(max_length=20, default="Warning")
    timestamp = models.DateTimeField(auto_now_add=True)
    acknowledged = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.station_name} - {self.message}"

class ThresholdBreach(models.Model):
    """
    Event log model for recording when values breach thresholds.
    One row per breach event - provides full audit trail of threshold violations.
    """
    
    node = models.ForeignKey(
        OPCUANode,
        on_delete=models.CASCADE,
        related_name="breaches",
        help_text="The node that breached"
    )
    
    # The breach details
    value = models.FloatField(
        help_text="The value that triggered the breach"
    )
    
    LEVEL_CHOICES = [
        ("Warning", "Warning"),
        ("Critical", "Critical"),
    ]
    level = models.CharField(
        max_length=10,
        choices=LEVEL_CHOICES,
        help_text="Whether this was a warning or critical breach"
    )
    
    # Acknowledgement tracking
    acknowledged = models.BooleanField(
        default=False,
        help_text="Whether an operator has acknowledged this breach"
    )
    acknowledged_by = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Username of who acknowledged this breach"
    )
    acknowledged_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this breach was acknowledged"
    )
    
    # Timestamps
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When the breach occurred"
    )
    
    class Meta:
        db_table = 'roams_opcua_mgr_threshold_breach'
        indexes = [
            models.Index(fields=['node', 'timestamp']),
            models.Index(fields=['level', 'acknowledged', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.level} Breach: {self.node.tag_name} = {self.value} at {self.timestamp}"