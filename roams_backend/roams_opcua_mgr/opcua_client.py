# Version: 0.0.0.1
# opcua_client.py
import threading
import logging
import time
from django.utils.timezone import now
from django.apps import apps
from .auth_ua import authenticate_client  # Import authentication
from opcua import Client
from colorama import Fore, Style 
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction,DatabaseError
from django.db import connection
from django.utils import timezone



active_clients = {}  # Dictionary to store active client handlers

logger = logging.getLogger(__name__)

def get_opcua_client_config():
    """Dynamically fetch OpcUaClientConfig model after Django is ready."""
    return apps.get_model("roams_opcua_mgr", "OpcUaClientConfig")


class OPCUAClientHandler:
    """Handles the connection to an OPC UA server and keeps it alive."""

    def __init__(self, client_config):
        self.config = client_config
        self.client = None
        self.connected = False
        self.username = getattr(client_config, "username", None)
        self.password = getattr(client_config, "password", None)

   
    def update_connection_status(self, status):
        """Update the connection status in the database safely."""
        
        OpcUaClientConfig = get_opcua_client_config()
        if not isinstance(self.config, OpcUaClientConfig):
            logger.error(f"{Fore.RED} Error: self.config is not a valid OpcUaClientConfig instance.{Style.RESET_ALL}")
            return

        try:
            # Refresh instance to get the latest DB values
            self.config.refresh_from_db()

            # Ensure the status is not None
            self.config.connection_status = status if status else "Disconnected"

            # Use a transaction to ensure consistency
            with transaction.atomic():
                self.config.save(update_fields=["connection_status"])
                logger.info(f"{Fore.CYAN}🔄 {self.config.station_name} status updated to {self.config.connection_status}{Style.RESET_ALL}")

        except ObjectDoesNotExist:
            logger.error(f"{Fore.RED} Error: Config object does not exist in the database.{Style.RESET_ALL}")

        except DatabaseError as db_err:
            logger.error(f"{Fore.RED} Database error: {db_err}{Style.RESET_ALL}")
            print(f"Total queries: {len(connection.queries)}")

        except Exception as e:
            logger.error(f"{Fore.RED} Unexpected error updating connection status: {e}{Style.RESET_ALL}")


    def connect(self):
        """Connect to the OPC UA server."""
        if not self.config.active:
            logger.warning(f"🚫 {self.config.station_name} is not active. Skipping connection.")
            return

        try:
            # 🧹 Clean up any previous client
            if self.client:
                try:
                    self.client.disconnect()
                except Exception as e:
                    logger.warning(f"⚠️ {self.config.station_name}: Failed to disconnect stale client: {e}")
                self.client = None

            self.client = Client(self.config.endpoint_url)

            # Authenticate client
            auth_type = authenticate_client(self.client, self.username, self.password)
            logger.info(f"{Fore.CYAN}🔐 Using {auth_type} for {self.config.station_name}{Style.RESET_ALL}")

            self.client.connect()
            self.connected = True

            # Update connection metadata
            self.config.last_connected = timezone.now()
            self.config.save(update_fields=["last_connected"])
            self.update_connection_status("Connected")
            logger.info(f"{Fore.GREEN}✅ Connected to {self.config.station_name} ({self.config.endpoint_url}){Style.RESET_ALL}")

        except Exception as e:
            self.connected = False
            self.update_connection_status("faulty")
            logger.error(f"{Fore.RED} Connection failed: {str(e)}{Style.RESET_ALL}")

    
        
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
        while True:
            # Refresh server status from the database
            logger.info(f"Updating status for config: {self.config}")
            self.config.refresh_from_db()
            logger.info(f"🔍 Checking updated status: {self.config.connection_status}")

            if not self.config.active and self.connected:
                logger.warning(f"{Fore.YELLOW} {self.config.station_name} is no longer active. Disconnecting...{Style.RESET_ALL}")
                self.disconnect()
                return  # Stop monitoring this server

            if not self.connected and self.config.active:
                logger.info(f"🔄 {self.config.station_name} is active again. Reconnecting...")
                self.reconnect()

            time.sleep(35)  # Check connection every 35 seconds

    def reconnect(self):
        """Reconnect using an exponential backoff strategy."""
        retry_attempts = 0

        # 🔧 Always cleanup old client (stale/closed sessions)
        if self.client:
            try:
                self.client.disconnect()
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


    def run(self):
        """Start the client and keep it running."""
        self.connect()
        while not self.connected:
            logger.warning(f"{Fore.YELLOW}🔄 Retrying connection to {self.config.station_name}...{Style.RESET_ALL}")
            time.sleep(30)
            self.connect()


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

            for config in active_servers:
                if config.station_name not in active_clients:
                    logger.info(f"   📡 {config.station_name} ({config.endpoint_url})")
                    client_handler = OPCUAClientHandler(config)
                    active_clients[config.station_name] = client_handler
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
