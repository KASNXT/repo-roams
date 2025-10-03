#signals.py

from django.db.models.signals import post_migrate
from django.core.cache import cache
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import OpcUaClientConfig, OPCUANode
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
    """Automatically refresh clients when a server is added or removed."""
    logger.info("🔄 Server list changed. Restarting OPC UA clients...")
    from roams_opcua_mgr.opcua_client import start_opcua_clients  # Import here to avoid circular imports
    start_opcua_clients()

@receiver(post_save, sender=OPCUANode)
@receiver(post_delete, sender=OPCUANode)
def refresh_nodes(sender, instance, **kwargs):
    """Automatically refresh nodes when a new node is added or removed."""
    logger.info("🔄 Node list changed. Updating node configuration...")
    # You can reload node-related tasks or notify clients

