from django.shortcuts import render

# Create your views here.
# roams_opcua_mgr/views.py
from django.shortcuts import render,redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.timezone import now
from .models.logging_model import OpcUaReadLog, OpcUaWriteLog
from .models import OpcUaClientConfig

from django.contrib.auth import logout
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST
from django.urls import reverse
from django.contrib.auth.views import LoginView


# Global progress tracker (you can move to Redis or cache later)
progress_status = {}

from django.template.response import TemplateResponse

@csrf_exempt
def delete_logs_view(request):
    if request.method == "POST":
        from django.db import connection
        
        client_config_id = request.POST.get("client_config_id")
        batch_size = int(request.POST.get("batch_size", 5000))
        
        try:
            client_config = OpcUaClientConfig.objects.get(id=client_config_id)
        except OpcUaClientConfig.DoesNotExist:
            return JsonResponse({"error": "Client config not found"}, status=404)

        # Get total count more efficiently using raw SQL
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM roams_opcua_mgr_opcuareadlog WHERE client_config_id = %s",
                [client_config_id]
            )
            total_read = cursor.fetchone()[0]
            
            cursor.execute(
                "SELECT COUNT(*) FROM roams_opcua_mgr_opcuawritelog WHERE client_config_id = %s",
                [client_config_id]
            )
            total_write = cursor.fetchone()[0]
        
        total = total_read + total_write or 1
        deleted = 0
        
        # Use raw SQL bulk delete for speed (10-100x faster than ORM)
        while True:
            with connection.cursor() as cursor:
                # Delete read logs in batch
                cursor.execute(
                    f"DELETE FROM roams_opcua_mgr_opcuareadlog "
                    f"WHERE client_config_id = %s LIMIT %s",
                    [client_config_id, batch_size]
                )
                read_count = cursor.rowcount
                deleted += read_count
                
                # Delete write logs in batch
                cursor.execute(
                    f"DELETE FROM roams_opcua_mgr_opcuawritelog "
                    f"WHERE client_config_id = %s LIMIT %s",
                    [client_config_id, batch_size]
                )
                write_count = cursor.rowcount
                deleted += write_count
            
            if read_count == 0 and write_count == 0:
                break
            
            # Update progress (avoid division by zero)
            progress_status[str(client_config_id)] = min(100, int((deleted / total) * 100))

        progress_status[str(client_config_id)] = 100
        return JsonResponse({"status": "complete"})

    elif request.method == "GET":
        client_config_id = request.GET.get("client_config_id")
        return TemplateResponse(request, "admin/roams_opcua_mgr/delete_logs.html", {
            "client_config_id": client_config_id
        })

    return JsonResponse({"error": "Invalid request"}, status=400)

def progress_status_view(request, client_config_id):
    percent = progress_status.get(str(client_config_id), 0)
    return JsonResponse({"percent": percent})

# =================== ✅ ROOT URL REDIRECT ===================
def root_redirect_view(request):
    return redirect("login")


# =================== ✅ SECURE LOGOUT ===================
@require_POST
@csrf_protect
def roams_logout_view(request):
    logout(request)
    return redirect(reverse("login"))

# =================== ✅ CUSTOM LOGIN VIEW ===================
class ForceDashboardLoginView(LoginView):
    template_name = "auth_roams/login.html"

    def get_success_url(self):
        return "/admin/"  # Redirect to the main dashboard after login
