from celery import shared_task
from roams_opcua_mgr.opcua_client import OPCUAClientHandler  # Import OPC UA client handler
from roams_opcua_mgr.models import OPCUANode  # Import OPC UA node model
import logging

logger = logging.getLogger(__name__)

@shared_task
def scheduled_read():
    """Read from OPC UA nodes at a different interval."""
    nodes = OPCUANode.objects.all()
    for node in nodes:
        client_handler = OPCUAClientHandler(node.client_config)
        value = client_handler.read_node_value(node)
        logger.info(f"📖 Read Task: Node {node.node_id} -> Value: {value}")