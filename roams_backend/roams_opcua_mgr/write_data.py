import logging
from opcua import Client
from django.utils.timezone import now
from colorama import Fore, Style
from opcua_mgr.models.logging_model import OpcUaWriteLog  # Adjust import if necessary

# Set up logger
logger = logging.getLogger(__name__)

def write_station_node(client: Client, node, value, command=None):
    """
    Write a value to an OPC UA node and log the operation.

    Args:
        client (Client): Connected OPC UA client.
        node (OPCUANode): The node to write to (model instance).
        value (any): The value to write.
        command (str): Optional command label, like 'START' or 'STOP'.

    Returns:
        bool: True if successful, False otherwise.
    """
    try:
        opc_node = client.get_node(node.node_id)
        opc_node.set_value(value)

        # Log success
        logger.info(f"{Fore.BLUE}✅ Written '{value}' to {node.node_id} ({node.tag_name}){Style.RESET_ALL}")

        # Update node model state (optional but useful)
        node.last_value = value
        node.last_updated = now()
        node.save(update_fields=["last_value", "last_updated"])

        # Save write log
        OpcUaWriteLog.objects.create(
            client_config=node.client_config,
            node=node,
            value=value,
            command=command,
            timestamp=now()
        )

        return True

    except Exception as e:
        logger.error(f"{Fore.RED}❌ Write failed: {e} [Node: {node.node_id}]{Style.RESET_ALL}")
        return False
