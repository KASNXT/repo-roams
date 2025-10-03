# read_data.py
import threading
import time
import logging
from django.utils.timezone import now
from django.apps import apps
from opcua import ua
from django.db import close_old_connections, transaction, OperationalError
from opcua.ua.uaerrors import UaError


logger = logging.getLogger(__name__)
logger.debug("📡 read_data.py started reading OPC UA nodes")

def get_opcua_models():
    OPCUANode = apps.get_model("roams_opcua_mgr", "OPCUANode")
    OpcUaReadLog = apps.get_model("roams_opcua_mgr", "OpcUaReadLog")  # Adjust 'logging_app' to your actual app name
    return OPCUANode, OpcUaReadLog

def read_and_log_nodes(active_clients):
    """
    Read values from all nodes in all active clients and log them.
    """
    close_old_connections()
    OPCUANode, OpcUaReadLog = get_opcua_models()

    while True:
        for station_name, client_handler in active_clients.items():
            if not client_handler.connected:
                continue

            try:
                nodes = OPCUANode.objects.filter(client_config=client_handler.config).only("id", "node_id", "tag_name")

                if not nodes.exists():
                    logger.info(f"ℹ️ No nodes configured for {station_name}.")
                    continue



                for node_config in nodes:
                    try:
                        opc_node = client_handler.client.get_node(node_config.node_id)
                        value = opc_node.get_value()

                        max_retries = 3
                        retry_delay = 0.2  # seconds

                        for attempt in range(max_retries):
                            try:
                                with transaction.atomic():
                                    OpcUaReadLog.objects.create(
                                        client_config=client_handler.config,
                                        node=node_config,
                                        value=str(value),
                                        timestamp=now()
                                    )

                                    node_config.last_value = value
                                    node_config.last_updated = now()
                                    node_config.save(update_fields=["last_value", "last_updated"])
                                break  # ✅ Success, exit retry loop

                            except OperationalError as e:
                                if attempt < max_retries - 1:
                                    time.sleep(retry_delay)
                                    continue
                                else:
                                    logger.error(f"🧨 DB write failed after retries for {node_config.node_id}: {e}")

                        logger.info(f"📥 [READ] {station_name} | {node_config.tag_name} = {value}")

                    except ua.UaStatusCodeError as e:
                        logger.warning(f"⚠️ Node read failed for {node_config.node_id}: {e}")
                    except (ua.uaerrors.BadSessionIdInvalid, ua.uaerrors.BadConnectionClosed) as e:
                        client_handler.connected = False
                        client_handler.update_connection_status("Disconnected")
                        logger.warning(f"🔌 Lost connection while reading {station_name}: {e}")
                    except Exception as e:
                        logger.error(f" Unexpected error reading node {node_config.node_id}: {e}")


            except Exception as e:
                logger.error(f" Error processing station {station_name}: {e}")

        time.sleep(15)
        # Sleep for a while before the next read cycle
        # This is to avoid overwhelming the server with requests
def start_station_monitoring():
    """
    Starts background thread to monitor all station nodes.
    Called from opcua_client.py after connections are established.
    """
    from .opcua_client import active_clients  # Import the live active_clients dictionary
    read_thread = threading.Thread(target=read_and_log_nodes, args=(active_clients,), daemon=True)
    read_thread.start()
    logger.info("🚀 Node reading thread started.")
