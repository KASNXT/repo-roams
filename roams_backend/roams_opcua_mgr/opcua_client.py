# Version: 0.0.0.1
# opcua_client.py
import threading
import logging
import time
from typing import TYPE_CHECKING, Optional
from django.utils.timezone import now
from django.apps import apps
from .auth_ua import authenticate_client  # Import authentication
from opcua import Client
from colorama import Fore, Style 
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction,DatabaseError
from django.db import connection
from django.utils import timezone

if TYPE_CHECKING:
    from .models import OpcUaClientConfig



active_clients = {}  # Dictionary to store active client handlers

logger = logging.getLogger(__name__)

def get_opcua_client_config():
    """Dynamically fetch OpcUaClientConfig model after Django is ready."""
    return apps.get_model("roams_opcua_mgr", "OpcUaClientConfig")


class OPCUAClientHandler:
    """Handles the connection to an OPC UA server and keeps it alive."""

    def __init__(self, client_config: "OpcUaClientConfig") -> None:
        self.config: "OpcUaClientConfig" = client_config
        self.client: Optional[Client] = None
        self.connected: bool = False
        self.username: Optional[str] = getattr(client_config, "username", None)
        self.password: Optional[str] = getattr(client_config, "password", None)

   
    def update_connection_status(self, status):
        """Update the connection status in the database safely with retry logic."""
        
        OpcUaClientConfig = get_opcua_client_config()
        if not isinstance(self.config, OpcUaClientConfig):
            logger.error(f"{Fore.RED}❌ Error: self.config is not a valid OpcUaClientConfig instance.{Style.RESET_ALL}")
            return

        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Refresh instance to get the latest DB values
                self.config.refresh_from_db()

                # Ensure the status is not None
                self.config.connection_status = status if status else "Disconnected"

                # Use a transaction to ensure consistency
                with transaction.atomic():
                    self.config.save(update_fields=["connection_status"])
                    
                    # Log the update with timestamp
                    log_msg = f"{Fore.CYAN}✅ {self.config.station_name}: Status updated to '{status}'{Style.RESET_ALL}"
                    logger.info(log_msg)
                    
                    # Return success
                    return True

            except ObjectDoesNotExist:
                logger.error(f"{Fore.RED}❌ Error: Config object does not exist in the database.{Style.RESET_ALL}")
                return False

            except DatabaseError as db_err:
                logger.warning(f"{Fore.YELLOW}⚠️ Database error (attempt {attempt + 1}/{max_retries}): {db_err}{Style.RESET_ALL}")
                if attempt < max_retries - 1:
                    time.sleep(1)  # Wait before retry
                    continue
                else:
                    logger.error(f"{Fore.RED}❌ Failed to update status after {max_retries} attempts{Style.RESET_ALL}")
                    return False

            except Exception as e:
                logger.error(f"{Fore.RED}❌ Unexpected error updating connection status: {e}{Style.RESET_ALL}")
                return False


    def connect(self):
        """Connect to the OPC UA server with exponential backoff retry."""
        if not self.config.active:
            logger.warning(f"🚫 {self.config.station_name} is not active. Skipping connection.")
            return

        max_retries = 3
        retry_delay = 1  # Start with 1 second
        
        for attempt in range(max_retries):
            try:
                # 🧹 Clean up any previous client
                if self.client:
                    try:
                        self.client.disconnect()
                        time.sleep(1)  # Give server time to close session
                    except Exception as e:
                        logger.debug(f"⚠️ {self.config.station_name}: Failed to disconnect stale client: {e}")
                    self.client = None

                self.client = Client(self.config.endpoint_url)
                
                # Set session timeout to 5 minutes (prevents BadTooManySessions)
                self.client.session_timeout = 300000  # 5 minutes in milliseconds

                # Authenticate client (handle None values for credentials)
                auth_type = authenticate_client(
                    self.client, 
                    self.username or "", 
                    self.password or ""
                )
                logger.info(f"{Fore.CYAN}🔐 Using {auth_type} for {self.config.station_name}{Style.RESET_ALL}")

                self.client.connect()
                self.connected = True

                # Update connection metadata
                self.config.last_connected = timezone.now()
                self.config.save(update_fields=["last_connected"])
                self.update_connection_status("Connected")
                logger.info(f"{Fore.GREEN}✅ Connected to {self.config.station_name} ({self.config.endpoint_url}){Style.RESET_ALL}")
                return  # Success, exit retry loop

            except Exception as e:
                self.connected = False
                error_msg = str(e)
                
                if attempt < max_retries - 1:
                    logger.warning(f"{Fore.YELLOW}⚠️ Connection attempt {attempt + 1}/{max_retries} failed for {self.config.station_name}: {error_msg}. Retrying in {retry_delay}s...{Style.RESET_ALL}")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    # Final attempt failed
                    self.update_connection_status("Faulty")
                    logger.error(f"{Fore.RED}❌ Failed to connect to {self.config.station_name} after {max_retries} attempts: {error_msg}{Style.RESET_ALL}")

    
        
    def disconnect(self):
        """Gracefully disconnect the client when the server is inactive."""
        if self.client:
            try:
                self.client.disconnect()
            except Exception:
                 pass
            self.client = None
            logger.error(f"{Fore.RED} Error disconnecting from {self.config.station_name}{Style.RESET_ALL}")
            self.connected = False
            self.update_connection_status("Disconnected")
            logger.info(f"{Fore.RED}🔴 Disconnected from {self.config.station_name}{Style.RESET_ALL}")

    def monitor_connection(self):
        """Continuously check the connection status and attempt reconnection if lost."""
        logger.info(f"{Fore.CYAN}📡 Monitor started for {self.config.station_name}{Style.RESET_ALL}")
        
        while True:
            try:
                # Refresh server status from the database
                self.config.refresh_from_db()
                
                # Check if server should be active
                if not self.config.active and self.connected:
                    logger.warning(f"{Fore.YELLOW}⚠️ {self.config.station_name} is no longer active. Disconnecting...{Style.RESET_ALL}")
                    self.disconnect()
                    return  # Stop monitoring this server
                
                # If server is active but not connected, attempt reconnection
                if self.config.active and not self.connected:
                    logger.info(f"{Fore.YELLOW}🔄 {self.config.station_name} is active but disconnected. Reconnecting...{Style.RESET_ALL}")
                    self.reconnect()
                
                # ✅ HEALTH CHECK: Verify connection is still alive
                if self.connected and self.client:
                    try:
                        # Try to read server node to verify connection is still active
                        server_node = self.client.get_node("i=20")  # Server node
                        _ = server_node.get_display_name()
                        
                        # Connection is healthy
                        current_status = self.config.connection_status
                        if current_status != "Connected":
                            logger.info(f"{Fore.GREEN}✅ {self.config.station_name}: Connection verified as healthy{Style.RESET_ALL}")
                            self.update_connection_status("Connected")
                    
                    except Exception as e:
                        # Connection is broken, update status and reconnect
                        logger.warning(f"{Fore.YELLOW}⚠️ {self.config.station_name}: Connection health check failed: {str(e)}{Style.RESET_ALL}")
                        self.connected = False
                        self.update_connection_status("Disconnected")
                        self.reconnect()
                
            except Exception as e:
                logger.error(f"{Fore.RED}❌ Error in monitor_connection: {str(e)}{Style.RESET_ALL}")
            
            # Wait before next check (⚠️ MUST be less than session_time_out!)
            time.sleep(25)  # Check connection every 25 seconds (less than session timeout)

    def reconnect(self):
        """Reconnect using an exponential backoff strategy."""
        retry_attempts = 0

        # 🔧 Always cleanup old client (stale/closed sessions)
        if self.client:
            try:
                self.client.disconnect()
                time.sleep(2)  # Wait for server to properly close session
            except Exception as e:
                logger.warning(f"⚠️ {self.config.station_name}: Failed to disconnect old client: {e}")
            self.client = None

        while not self.connected:
            try:
                self.connect()
                if self.connected:
                    logger.info(f"✅ {self.config.station_name}: Reconnection successful!")
                    return

            except Exception as e:
                logger.error(f" {self.config.station_name}: Reconnection failed: {e}")

            retry_delay = min(60, 2 ** retry_attempts)  # Exponential backoff (max 60 sec)
            logger.warning(f"🔄 Retrying {self.config.station_name} in {retry_delay} seconds...")
            time.sleep(retry_delay)
            retry_attempts += 1


    def ensure_keep_alive(self):
        """
        Creates an explicit keep-alive subscription to ensure session stays alive.
        This is a safety net: even if no nodes are configured, this keeps connection alive.
        Subscribes to server node (i=20) with 15-second interval (half session timeout).
        """
        if not self.client:
            logger.warning(f"{Fore.YELLOW}⚠️ {self.config.station_name}: Client not initialized for keep-alive{Style.RESET_ALL}")
            return None
        
        try:
            # Create subscription with 15-second interval
            subscription = self.client.create_subscription(
                period=15000,  # 15 seconds in milliseconds
                handler=self
            )
            
            # Subscribe to server node (always exists, safe to monitor)
            server_node = self.client.get_node("i=20")
            subscription.subscribe_data_change(server_node)
            
            logger.info(f"{Fore.GREEN}✅ {self.config.station_name}: Keep-alive subscription created (15s interval){Style.RESET_ALL}")
            return subscription
            
        except Exception as e:
            logger.warning(f"{Fore.YELLOW}⚠️ {self.config.station_name}: Keep-alive subscription failed: {e}{Style.RESET_ALL}")
            return None
    
    def validate_connection_ready(self):
        """
        Validates that connection is ready for operations before critical reads/writes.
        Returns True if healthy, False otherwise.
        Triggers reconnection automatically if validation fails.
        """
        if not self.connected or not self.client:
            logger.error(f"{Fore.RED}❌ {self.config.station_name}: Connection not established{Style.RESET_ALL}")
            self.reconnect()
            return False
        
        try:
            # Quick validation: read server node
            server_node = self.client.get_node("i=20")
            _ = server_node.get_browse_name()
            return True
        except Exception as e:
            logger.error(f"{Fore.RED}❌ {self.config.station_name}: Connection validation failed: {e}{Style.RESET_ALL}")
            self.connected = False
            self.reconnect()
            return False

    def run(self):
        """Start the client and keep it running with continuous monitoring."""
        # Initial connection attempt
        self.connect()
        
        # Retry connection if initial attempt fails
        while not self.connected:
            logger.warning(f"{Fore.YELLOW}🔄 Retrying connection to {self.config.station_name}...{Style.RESET_ALL}")
            time.sleep(30)
            self.connect()
        
        # ✅ ENSURE KEEP-ALIVE SUBSCRIPTION (safety net even if no data nodes)
        keep_alive_subscription = self.ensure_keep_alive()
        
        # ✅ START MONITORING THREAD to continuously check connection health
        logger.info(f"{Fore.CYAN}🔄 Starting connection monitor for {self.config.station_name}...{Style.RESET_ALL}")
        monitor_thread = threading.Thread(target=self.monitor_connection, daemon=True)
        monitor_thread.start()
        logger.info(f"{Fore.GREEN}✅ Connection monitor started for {self.config.station_name}{Style.RESET_ALL}")
        
        # Keep main thread alive
        while True:
            time.sleep(60)

    def write_node_value(self, node, value):
        """
        Write a value to an OPC UA node (for boolean controls).
        
        Args:
            node: OPCUANode instance
            value: Boolean or numeric value to write
        
        Returns:
            Tuple: (success: bool, message: str)
        """
        if not self.connected or not self.client:
            msg = f"❌ Not connected to {self.config.station_name}, cannot write"
            logger.error(msg)
            return False, msg
        
        if not node.node_id:
            msg = "❌ Node has no node_id configured"
            logger.error(msg)
            return False, msg
        
        # Check access level
        if node.access_level not in ["Write_only", "Read_write"]:
            msg = f"❌ Node '{node.tag_name}' is not writable (access_level: {node.access_level})"
            logger.error(msg)
            return False, msg
        
        try:
            # Get the OPC UA node object
            ua_node = self.client.get_node(node.node_id)
            
            # Write the value
            logger.info(f"✍️ Writing {node.tag_name} = {value}")
            ua_node.set_value(value)
            
            # Update local record
            node.last_value = str(value)
            node.last_updated = timezone.now()
            node.save(update_fields=['last_value', 'last_updated'])
            
            msg = f"✅ Successfully wrote {node.tag_name} = {value}"
            logger.info(msg)
            return True, msg
            
        except AttributeError:
            msg = f"❌ Node '{node.node_id}' not found on server"
            logger.error(msg)
            return False, msg
        except Exception as e:
            msg = f"❌ Failed to write {node.tag_name}: {str(e)}"
            logger.error(msg)
            return False, msg


opcua_client_lock = threading.Lock()

def start_opcua_clients():
    """Start OPC UA clients for all active servers and monitor for status changes."""
    from .read_data import start_station_monitoring
    
    if not opcua_client_lock.acquire(blocking=False):
        logger.warning("⚠️ OPC UA client check already running. Skipping duplicate execution.")
        return

    try:
        OpcUaClientConfig = get_opcua_client_config()
        logger.info("⏳ Waiting for database to be ready...")
        time.sleep(10)  # Delay before first database interaction

        while True:  # Continuously check for active servers
            try:
                total_servers = OpcUaClientConfig.objects.count()
                logger.info(f"🔎 Total server configs found: {total_servers}")
            except Exception as e:
                logger.error(f" Could not query OpcUaClientConfig: {e}")
                time.sleep(30)
                continue

            
            active_servers = OpcUaClientConfig.objects.filter(active=True)

            if not active_servers.exists():
                logger.warning("⚠️ No active OPC UA servers found. Checking again in 60 seconds...")
                time.sleep(120)
                continue

            logger.info(f"🟢 Found {active_servers.count()} active servers:")

            for config in active_servers:  # type: ignore[attr-defined]
                station_name: str = config.station_name  # type: ignore[attr-defined]
                endpoint_url: str = config.endpoint_url  # type: ignore[attr-defined]
                
                if station_name not in active_clients:
                    logger.info(f"   📡 {station_name} ({endpoint_url})")
                    client_handler = OPCUAClientHandler(config)  # type: ignore[arg-type]
                    active_clients[station_name] = client_handler
                    thread = threading.Thread(target=client_handler.run, daemon=True)
                    thread.start()

            logger.info("🔄 Next server status check in 30 seconds...")
            # ✅ START NODE READING PROCESS AFTER CONNECTIONS ARE ESTABLISHED
            start_station_monitoring()  # 🚀 Ensure node reading starts
            time.sleep(60)  # Wait for the next check

    finally:
        opcua_client_lock.release()  # Release lock so another check can run

# ----------------------------------------------------------------------------------
# 🔹 Utility Functions for Dashboard
# ----------------------------------------------------------------------------------

def get_total_active_stations():
    from .models import OpcUaClientConfig
    try:
        return OpcUaClientConfig.objects.filter(active=True).count()
    except Exception as e:
        logger.error(f"Error fetching total active stations: {e}")
        return 0
def get_total_connected_stations():
    from .models import OpcUaClientConfig
    try:
        return OpcUaClientConfig.objects.filter(connection_status="Connected", active=True).count()
    except Exception as e:
        logger.error(f"Error fetching total connected stations: {e}")
        return 0

def get_active_client(client_config):
    """
    Get the active OPC UA Client for a given OpcUaClientConfig.
    
    Args:
        client_config: OpcUaClientConfig instance
        
    Returns:
        opcua.Client or None: The connected client, or None if not available
    """
    try:
        station_name = client_config.station_name
        logger.info(f"🔍 Looking for station '{station_name}' in active_clients")
        logger.info(f"🔍 Active clients keys: {list(active_clients.keys())}")
        logger.info(f"🔍 Total active clients: {len(active_clients)}")
        
        if station_name in active_clients:
            handler = active_clients[station_name]
            logger.info(f"✅ Found handler for {station_name}")
            logger.info(f"🔍 Handler.client exists: {handler.client is not None}")
            logger.info(f"🔍 Handler.connected: {handler.connected}")
            if handler.client and handler.connected:
                return handler.client
            else:
                logger.warning(f"⚠️ Handler exists but client={handler.client is not None}, connected={handler.connected}")
        else:
            logger.warning(f"⚠️ Station '{station_name}' not in active_clients. Available: {list(active_clients.keys())}")
        logger.warning(f"⚠️ No active client for station {station_name}")
        return None
    except Exception as e:
        logger.error(f"❌ Error getting active client: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None
