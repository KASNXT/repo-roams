"""
Threshold evaluation service - evaluates node values against thresholds and logs breaches.
This is where all alarm logic lives - NOT in the frontend.
"""

import logging
from django.utils.timezone import now
from django.apps import apps
from .notifications import notify_threshold_breach

logger = logging.getLogger(__name__)


def evaluate_threshold(node_config, value):
    """
    Evaluate a node's value against its threshold.
    Creates a ThresholdBreach record if the value triggers an alarm.
    
    Args:
        node_config: OPCUANode instance with threshold fields
        value: The current value from OPC UA
    
    Returns:
        ThresholdBreach instance if breach occurred, None otherwise
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        
        # Check if thresholds are enabled for this node
        if not node_config.threshold_active:
            return None
        
        # Try to convert value to float
        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
            # Can't compare non-numeric values
            return None
        
        # Determine if there's a breach
        breach_level = None
        
        # Check critical level first (highest priority)
        if node_config.critical_level is not None and numeric_value >= node_config.critical_level:
            breach_level = "Critical"
        # Then check warning level
        elif node_config.warning_level is not None and numeric_value >= node_config.warning_level:
            breach_level = "Warning"
        # Check min value
        elif node_config.min_value is not None and numeric_value < node_config.min_value:
            breach_level = "Warning"
        # Check max value
        elif node_config.max_value is not None and numeric_value > node_config.max_value:
            breach_level = "Warning"
        
        # If we found a breach, log it
        if breach_level:
            breach = ThresholdBreach.objects.create(
                node=node_config,
                value=numeric_value,
                level=breach_level
            )
            
            logger.warning(
                f"🚨 [{breach_level}] Threshold breach for {node_config.tag_name}: "
                f"value={numeric_value}"
            )
            
            # Send notifications (email/SMS)
            try:
                notify_threshold_breach(node_config, breach)
            except Exception as e:
                logger.error(f"Failed to send notifications for breach {breach.id}: {e}")
            
            return breach
        
        return None
        
    except Exception as e:
        logger.error(f"Error evaluating threshold for node {node_config.id}: {e}")
        return None


def get_breach_count_24h(node_config, level=None):
    """
    Count breaches for a node in the last 24 hours.
    Computed dynamically - never stored.
    
    Args:
        node_config: OPCUANode instance
        level: Optional - filter by "Warning" or "Critical"
    
    Returns:
        Integer count of breaches
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        from django.utils.timezone import timedelta
        
        query = ThresholdBreach.objects.filter(
            node=node_config,
            timestamp__gte=now() - timedelta(hours=24)
        )
        
        if level:
            query = query.filter(level=level)
        
        return query.count()
        
    except Exception as e:
        logger.error(f"Error counting breaches for node {node_config.id}: {e}")
        return 0


def get_unacknowledged_breaches(node_config=None):
    """
    Get all unacknowledged breaches.
    
    Args:
        node_config: Optional - filter to specific node
    
    Returns:
        QuerySet of unacknowledged ThresholdBreach records
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        
        query = ThresholdBreach.objects.filter(acknowledged=False).order_by('-timestamp')
        
        if node_config:
            query = query.filter(node=node_config)
        
        return query
        
    except Exception as e:
        logger.error(f"Error getting unacknowledged breaches: {e}")
        return []


def acknowledge_breach(breach_id, username=None):
    """
    Mark a breach as acknowledged by an operator.
    
    Args:
        breach_id: ThresholdBreach ID
        username: Optional username of who acknowledged
    
    Returns:
        Updated ThresholdBreach instance or None
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        
        breach = ThresholdBreach.objects.get(id=breach_id)
        breach.acknowledged = True
        breach.acknowledged_by = username or "system"
        breach.acknowledged_at = now()
        breach.save()
        
        logger.info(f"✅ Breach {breach_id} acknowledged by {breach.acknowledged_by}")
        
        return breach
        
    except ThresholdBreach.DoesNotExist:
        logger.error(f"Breach {breach_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error acknowledging breach {breach_id}: {e}")
        return None
