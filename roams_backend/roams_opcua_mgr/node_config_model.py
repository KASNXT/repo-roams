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
    
    last_value = models.CharField(blank=True, null=True)  # Changed to TextField for larger values
    last_updated = models.DateTimeField(auto_now=True)
    
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
        ]

    def __str__(self):
        return f"{self.tag_name or 'No Tag'} - {self.node_id} [{self.tag_units}]"


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
