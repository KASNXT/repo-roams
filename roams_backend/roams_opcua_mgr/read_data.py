# read_data.py
import threading
import time
import logging
from django.utils.timezone import now
from django.apps import apps
from opcua import ua
from django.db import close_old_connections, transaction, OperationalError
from roams_opcua_mgr.services import evaluate_threshold

logger = logging.getLogger(__name__)
logger.debug("📡 read_data.py started reading OPC UA nodes")


def get_opcua_models():
    OPCUANode = apps.get_model("roams_opcua_mgr", "OPCUANode")
    OpcUaReadLog = apps.get_model("roams_opcua_mgr", "OpcUaReadLog")
    AlarmLog = apps.get_model("roams_opcua_mgr", "AlarmLog")  # 👈 optional: new model for alarms
    return OPCUANode, OpcUaReadLog, AlarmLog



def should_log_reading(node_config, value):
    """
    Determine if we should log this reading based on sampling configuration.
    
    Returns True if:
    - sample_on_whole_number_change is False (always log), OR
    - The whole number part of the value differs from last_whole_number
    """
    if not getattr(node_config, "sample_on_whole_number_change", True):
        # If disabled, always log
        return True
    
    try:
        numeric_value = float(value)
        current_whole = int(numeric_value)
        last_whole = node_config.last_whole_number
        
        # Log if we don't have a previous value OR if whole number changed
        return last_whole is None or current_whole != last_whole
    except (TypeError, ValueError):
        # Non-numeric values always get logged
        return True


def read_and_log_nodes(active_clients):
    """
    Read values from all nodes in all active clients and log them.
    Distinguish alarm nodes (is_alarm=True) from parameter nodes.
    Evaluate thresholds and log breaches.
    Only log parameter nodes if their whole number value changes (if configured).
    """
    close_old_connections()
    OPCUANode, OpcUaReadLog, AlarmLog = get_opcua_models()

    while True:
        for station_name, client_handler in active_clients.items():
            if not client_handler.connected:
                continue

            try:
                nodes = OPCUANode.objects.filter(
                    client_config=client_handler.config
                ).only("id", "node_id", "tag_name", "is_alarm", "sample_on_whole_number_change", "last_whole_number")

                if not nodes.exists():
                    logger.info(f"ℹ️ No nodes configured for {station_name}.")
                    continue

                for node_config in nodes:
                    try:
                        opc_node = client_handler.client.get_node(node_config.node_id)
                        value = opc_node.get_value()

                        max_retries = 3
                        retry_delay = 5  # seconds

                        for attempt in range(max_retries):
                            try:
                                with transaction.atomic():
                                    # ✅ Round numeric values to 2 decimal places
                                    try:
                                        if isinstance(value, (int, float)):
                                            value = round(float(value), 2)
                                    except (TypeError, ValueError):
                                        pass  # Keep non-numeric values as-is
                                    
                                    # ✅ Update last value and time
                                    node_config.last_value = value
                                    node_config.last_updated = now()
                                    
                                    # 🚨 If it's an alarm node, log differently
                                    if getattr(node_config, "is_alarm", False):
                                        # Always log alarm nodes
                                        AlarmLog.objects.create(
                                            node=node_config,
                                            station_name=station_name,
                                            message=f"{node_config.tag_name or node_config.node_id} triggered",
                                            severity="High" if value else "Normal",
                                            timestamp=now(),
                                            acknowledged=False,
                                        )
                                        logger.warning(
                                            f"🚨 [ALARM] {station_name} | {node_config.tag_name} = {value}"
                                        )
                                        node_config.save(update_fields=["last_value", "last_updated"])
                                    else:
                                        # 🧾 For parameter nodes, check if we should log based on whole number changes
                                        should_log = should_log_reading(node_config, value)
                                        
                                        if should_log:
                                            OpcUaReadLog.objects.create(
                                                client_config=client_handler.config,
                                                node=node_config,
                                                value=str(value),
                                                timestamp=now(),
                                            )
                                            logger.info(
                                                f"📥 [READ] {station_name} | {node_config.tag_name} = {value}"
                                            )
                                            
                                            # Update the last whole number value
                                            try:
                                                numeric_value = float(value)
                                                node_config.last_whole_number = int(numeric_value)
                                            except (TypeError, ValueError):
                                                pass
                                        
                                        # 🚨 Always evaluate thresholds (regardless of logging)
                                        breach = evaluate_threshold(node_config, value)
                                        if breach:
                                            logger.warning(
                                                f"⚠️ {breach.level} breach for {node_config.tag_name}: "
                                                f"value={value}"
                                            )
                                        
                                        node_config.save(update_fields=["last_value", "last_updated", "last_whole_number"])

                                break  # ✅ Success, exit retry loop

                            except OperationalError as e:
                                if attempt < max_retries - 1:
                                    time.sleep(retry_delay)
                                    continue
                                else:
                                    logger.error(
                                        f"🧨 DB write failed after retries for {node_config.node_id}: {e}"
                                    )

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

        # 🕒 Pause before next read cycle
        time.sleep(20)


def start_station_monitoring():
    """
    Starts background thread to monitor all station nodes.
    Called from opcua_client.py after connections are established.
    """
    from .opcua_client import active_clients  # Import the live active_clients dictionary
    read_thread = threading.Thread(
        target=read_and_log_nodes, args=(active_clients,), daemon=True
    )
    read_thread.start()
    logger.info("🚀 Node reading thread started.")
