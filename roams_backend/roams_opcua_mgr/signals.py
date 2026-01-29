#signals.py

from django.db.models.signals import post_migrate
from django.core.cache import cache
from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from .models import OpcUaClientConfig, OPCUANode, ThresholdBreach
import logging

logger = logging.getLogger(__name__)

@receiver(post_migrate)
def update_cache(sender, **kwargs):
    """Run after migrations to check active OPC UA clients."""
    if sender.name == "roams_opcua_mgr":  # Ensure it only runs for this app
        active_exists = OpcUaClientConfig.objects.filter(active=True).exists()
        cache.set("active_opcua", active_exists)

@receiver(post_save, sender=OpcUaClientConfig)
@receiver(post_delete, sender=OpcUaClientConfig)
def refresh_clients(sender, instance, **kwargs):
    """
    Refresh clients when a server is added or removed.
    ✅ NOW NON-BLOCKING: Uses background thread instead of synchronous operation
    """
    import threading
    logger.info(f"🔄 Server '{instance.station_name}' changed. Restarting OPC UA clients in background...")
    
    # Run restart in background thread to avoid blocking the request
    def restart_in_background():
        try:
            from roams_opcua_mgr.opcua_client import start_opcua_clients
            start_opcua_clients()
            logger.info("✅ OPC UA clients restart completed")
        except Exception as e:
            logger.error(f"❌ Error restarting OPC UA clients: {e}")
    
    thread = threading.Thread(target=restart_in_background, daemon=True)
    thread.start()

@receiver(post_save, sender=OPCUANode)
@receiver(post_delete, sender=OPCUANode)
def refresh_nodes(sender, instance, **kwargs):
    """Automatically refresh nodes when a new node is added or removed."""
    pass

@receiver(pre_delete, sender=OpcUaClientConfig)
def handle_client_config_deletion(sender, instance, **kwargs):
    """
    Handle deletion of OpcUaClientConfig by efficiently deleting related data.
    This prevents timeout issues when CASCADE delete is triggered.
    """
    from django.db import connection
    
    config_id = instance.id
    
    try:
        with connection.cursor() as cursor:
            # Delete AuthenticationSetting
            cursor.execute(
                "DELETE FROM roams_opcua_mgr_authenticationsetting WHERE client_config_id = %s",
                [config_id]
            )
            logger.info(f"Deleted authentication settings for config {config_id}")
    except Exception as e:
        logger.warning(f"Error deleting authentication settings for config {config_id}: {e}")
    logger.info("🔄 Node list changed. Updating node configuration...")
    # You can reload node-related tasks or notify clients


@receiver(post_save, sender=ThresholdBreach)
def on_threshold_breach_created(sender, instance, created, **kwargs):
    """
    Signal handler to trigger notifications when a ThresholdBreach is created.
    This ensures notifications are sent even if the service layer fails.
    """
    if created:
        try:
            from .notifications import notify_threshold_breach
            logger.info(f"📢 Signal triggered for new breach: {instance.node.tag_name}")
            notify_threshold_breach(instance.node, instance)
        except Exception as e:
            logger.error(f"Signal handler failed to send notifications for breach {instance.id}: {e}")

