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
        """Ensure signals are connected when Django starts."""
        import roams_opcua_mgr.signals  # ✅ Import signals safely

        # ✅ Use `apps.get_model()` to avoid premature model access
        from django.apps import apps
        OpcUAClientConfig = apps.get_model("roams_opcua_mgr", "OpcUaClientConfig")

        # ✅ Delay starting clients until Django is fully ready
        transaction.on_commit(self.start_clients)

    def start_clients(self):
        """Start OPC UA clients **after** Django is fully loaded."""
        from roams_opcua_mgr.opcua_client import start_opcua_clients  # ✅ Safe import inside function
        thread = threading.Thread(target=start_opcua_clients, daemon=True)
        thread.start()
