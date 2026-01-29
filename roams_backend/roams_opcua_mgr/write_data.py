import logging
from opcua import Client, ua
from django.utils.timezone import now
from colorama import Fore, Style
from roams_opcua_mgr.models import OpcUaWriteLog

# Set up logger
logger = logging.getLogger(__name__)

def write_station_node(client: Client, node, value, command=None):
    """
    Write a value to an OPC UA node using proper DataValue and Variant types (like UA Expert).

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
        
        # Convert value to proper OPC UA type based on node data type
        if node.data_type == "Boolean":
            write_value = bool(int(value)) if not isinstance(value, bool) else value
        elif node.data_type in ["Int16", "Int32", "Int64", "UInt16", "UInt32", "UInt64", "Integer"]:
            write_value = int(value) if not isinstance(value, int) else value
        elif node.data_type in ["Float", "Double"]:
            write_value = float(value) if not isinstance(value, float) else value
        else:
            # For unknown types, use value as-is
            write_value = value
        
        # Create DataValue with Variant (UA Expert method)
        dv = ua.DataValue(ua.Variant(write_value))
        opc_node.set_value(dv)

        # Log success
        logger.info(f"{Fore.BLUE}✅ Written '{write_value}' to {node.node_id} ({node.tag_name}){Style.RESET_ALL}")

        # Update node model state
        node.last_value = str(write_value)
        node.last_updated = now()
        node.save(update_fields=["last_value", "last_updated"])

        # Save write log
        OpcUaWriteLog.objects.create(
            client_config=node.client_config,
            node=node,
            value=str(write_value),
            command=command,
            timestamp=now()
        )

        return True

    except Exception as e:
        logger.error(f"{Fore.RED}❌ Write failed: {e} [Node: {node.node_id}]{Style.RESET_ALL}")
        return False
