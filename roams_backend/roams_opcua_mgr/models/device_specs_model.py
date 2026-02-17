from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from roams_opcua_mgr.models.client_config_model import OpcUaClientConfig


class StationDeviceSpecifications(models.Model):
    """
    Model for storing nameplate specifications for pumping/motor stations.
    Linked to OpcUaClientConfig for comparing rated vs actual performance metrics.
    
    Used for performance analysis:
    - Compare current motor current (A) vs rated current
    - Compare current flow rate vs rated flow rate
    - Compare current head vs rated head
    - Calculate efficiency % = (current power / rated power)
    """
    station = models.OneToOneField(
        OpcUaClientConfig,
        on_delete=models.CASCADE,
        related_name="device_specs",
        help_text="The station this device belongs to"
    )

    # Motor/Pump Nameplate Data
    motor_power_rating = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.1)],
        help_text="Motor power rating in kW. From device nameplate.",
        verbose_name="Motor Power Rating (kW)"
    )

    rated_current = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.1)],
        help_text="Rated motor current in Amperes (A). From device nameplate.",
        verbose_name="Rated Current (A)"
    )

    rated_flow_rate = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.1)],
        help_text="Pump rated flow rate in m³/h (cubic meters per hour). From device nameplate.",
        verbose_name="Rated Flow Rate (m³/h)"
    )

    rated_head = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.1)],
        help_text="Pump rated head in meters (m). From device nameplate.",
        verbose_name="Rated Head (m)"
    )

    # Alternative pressure field for systems measuring in Pressure instead of Head
    # Conversion factor: 1 bar = 10.197 meters of head (for water at sea level)
    # If you have pressure readings, use: head = pressure_bar * 10.197
    rated_pressure_bar = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.1)],
        help_text="Pump rated pressure in bar. If using this instead of head, it will be converted (1 bar = 10.197 m head).",
        verbose_name="Rated Pressure (Bar)"
    )

    # Additional device information
    device_model = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Motor/pump model number from nameplate"
    )

    manufacturer = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Device manufacturer name"
    )

    serial_number = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Device serial number"
    )

    installation_date = models.DateField(
        null=True,
        blank=True,
        help_text="When the device was installed"
    )

    last_maintenance = models.DateField(
        null=True,
        blank=True,
        help_text="Date of last maintenance"
    )

    # Tagging for performance analysis
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="Additional notes about the device or performance expectations"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Station Device Specifications"
        verbose_name_plural = "Station Device Specifications"
        indexes = [
            models.Index(fields=['station']),
        ]

    def __str__(self):
        return f"{self.station.station_name} - Device Specs"

    def get_performance_metrics(self, current_current=None, current_flow=None, 
                                current_head=None, current_pressure_bar=None, current_power=None):
        """
        Calculate performance metrics comparing current values with rated specifications.
        Returns dict with percentage of rated for each metric.
        
        Supports both head and pressure measurements. If pressure is provided, it's converted to head.
        Conversion: Head (m) = Pressure (bar) × 10.197
        
        Args:
            current_current: Current motor current in Amperes
            current_flow: Current flow rate in m³/h  
            current_head: Current head in meters
            current_pressure_bar: Current pressure in bar (auto-converts to head if provided)
            current_power: Current power consumption in kW
            
        Returns:
            dict with metrics and percentage of rated values
        """
        metrics = {}
        
        # Get effective rated head (from either head or pressure field)
        rated_head = self.rated_head
        if not rated_head and self.rated_pressure_bar:
            rated_head = self.rated_pressure_bar * 10.197
        
        # Convert current pressure to head if provided
        effective_current_head = current_head
        if current_pressure_bar is not None and current_head is None:
            effective_current_head = current_pressure_bar * 10.197
        
        if current_current is not None and self.rated_current:
            metrics['current_percent'] = round((current_current / self.rated_current) * 100, 2)
            metrics['current_above_rated'] = current_current > self.rated_current
            
        if current_flow is not None and self.rated_flow_rate:
            metrics['flow_percent'] = round((current_flow / self.rated_flow_rate) * 100, 2)
            metrics['flow_above_rated'] = current_flow > self.rated_flow_rate
            
        if effective_current_head is not None and rated_head:
            metrics['head_percent'] = round((effective_current_head / rated_head) * 100, 2)
            metrics['head_above_rated'] = effective_current_head > rated_head
            metrics['current_head_meters'] = round(effective_current_head, 2)  # For display
            
        if current_power is not None and self.motor_power_rating:
            metrics['power_efficiency'] = round((current_power / self.motor_power_rating) * 100, 2)
            metrics['power_above_rated'] = current_power > self.motor_power_rating
        
        return metrics
    
    def get_effective_rated_head(self):
        """Get rated head, converting from pressure if necessary"""
        if self.rated_head:
            return self.rated_head
        if self.rated_pressure_bar:
            return round(self.rated_pressure_bar * 10.197, 2)
        return None
