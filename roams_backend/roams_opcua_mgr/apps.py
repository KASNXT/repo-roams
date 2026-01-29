# roams_backend/roams_opcua_mgr/apps.py
from django.apps import AppConfig
import threading
from django.db import transaction

class OpcuaMgrConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'roams_opcua_mgr'
    label = 'roams_opcua_mgr'
    verbose_name = "ROAMS communication manager"

    def ready(self):
        """Ensure signals are connected and OPC UA clients start when Django is ready."""
        import roams_opcua_mgr.signals  # ✅ Import signals safely
        
        # ✅ Start OPC UA clients in background thread after Django is fully loaded
        from roams_opcua_mgr.opcua_client import start_opcua_clients
        thread = threading.Thread(target=start_opcua_clients, daemon=True)
        thread.start()

