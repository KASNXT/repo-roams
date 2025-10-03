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
        client_config_id = request.POST.get("client_config_id")
        batch_size = int(request.POST.get("batch_size", 1000))
        
        try:
            client_config = OpcUaClientConfig.objects.get(id=client_config_id)
        except OpcUaClientConfig.DoesNotExist:
            return JsonResponse({"error": "Client config not found"}, status=404)

        total_read = OpcUaReadLog.objects.filter(client_config=client_config).count()
        total_write = OpcUaWriteLog.objects.filter(client_config=client_config).count()
        total = total_read + total_write or 1  # avoid zero division

        deleted = 0
        while True:
            read_ids = list(
                OpcUaReadLog.objects.filter(client_config=client_config)
                .order_by('id')[:batch_size].values_list('id', flat=True)
            )
            write_ids = list(
                OpcUaWriteLog.objects.filter(client_config=client_config)
                .order_by('id')[:batch_size].values_list('id', flat=True)
            )

            if not read_ids and not write_ids:
                break

            OpcUaReadLog.objects.filter(id__in=read_ids).delete()
            deleted += len(read_ids)
            OpcUaWriteLog.objects.filter(id__in=write_ids).delete()
            deleted += len(write_ids)

            # Update progress
            progress_status[str(client_config_id)] = int((deleted / total) * 100)

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
