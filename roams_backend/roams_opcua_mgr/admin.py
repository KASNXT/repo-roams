
# Register your models here.
from django.contrib import admin
from .models import OpcUaClientConfig, OPCUANode, AuthenticationSetting, TagName
from django.utils.html import format_html
from roams_opcua_mgr.models.logging_model import OpcUaReadLog, OpcUaWriteLog
from django.http import JsonResponse
from django.template.response import TemplateResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.urls import path
from .views import delete_logs_view, progress_status_view
from django.shortcuts import get_object_or_404




# Delete logs in chunks to avoid memory issues
def delete_logs_in_chunks(client_config, batch_size=1000):
    while True:
        read_ids = list(
            OpcUaReadLog.objects.filter(client_config=client_config)
            .order_by('id')[:batch_size]
            .values_list('pk', flat=True)
        )
        write_ids = list(
            OpcUaWriteLog.objects.filter(client_config=client_config)
            .order_by('id')[:batch_size]
            .values_list('pk', flat=True)
        )

        if not read_ids and not write_ids:
            break

        OpcUaReadLog.objects.filter(pk__in=read_ids).delete()
        OpcUaWriteLog.objects.filter(pk__in=write_ids).delete()


@admin.action(description="Delete logs in chunks for selected configs")
def delete_logs_action(modeladmin, request, queryset):
    for config in queryset:
        delete_logs_in_chunks(config)

# Register OPCUAClientConfig with enhanced display and delete action
@admin.register(OpcUaClientConfig)
class OpcUaClientConfigAdmin(admin.ModelAdmin):
    list_display = ("station_name", "endpoint_url", "active", "colored_status", "last_connected")
    list_filter = ("active", "connection_status", "security_policy")
    search_fields = ("station_name", "endpoint_url")
    ordering = ("station_name",)
    actions = [delete_logs_action]

    def colored_status(self, obj):
        """Return connection status with colored formatting in Django Admin."""
        color_map = {
            "Connected": "green",
            "Disconnected": "red",
            "Faulty": "orange",
        }
        color = color_map.get(obj.connection_status, "black")
        return format_html(
            '<span style="color: {};"><strong>{}</strong></span>',
            color,
            obj.connection_status,
        )

    colored_status.admin_order_field = "connection_status"
    colored_status.short_description = "Connection Status"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("delete-logs/", self.admin_site.admin_view(delete_logs_view), name="delete_logs"),
            path("progress-status/<str:client_config_id>/", self.admin_site.admin_view(self.progress_status_view)),
        ]
        return custom_urls + urls

    def progress_status_view(self, request, client_config_id):
        percent = progress_status_view.get(str(client_config_id), 0)
        return JsonResponse({"percent": percent})

# Register Authentication Settings
@admin.register(AuthenticationSetting)
class AuthenticationsettingAdmin(admin.ModelAdmin):
    list_display = ("client_config", "Anonymous", "username")
    list_filter = ("Anonymous",)
    search_fields = ("client_config__station_name", "username")

# Register OPC UA Node Configuration
@admin.register(OPCUANode)
class OPCUANodeAdmin(admin.ModelAdmin):
    list_display = (
        "client_config", "is_active", "node_id", "tag_name", 
        "access_level", "last_value", "tag_units", "last_updated"
    )
    search_fields = ("node_id", "tag_name__name")
    list_filter = ("client_config",)
    ordering = ("client_config", "tag_name")

    def last_value(self, obj):
        return obj.last_value if obj.last_value is not None else "No Data"
    last_value.short_description = "Last Read Value"

# Register Tag Names
@admin.register(TagName)
class TagNameAdmin(admin.ModelAdmin):
    list_display = ("name", "tag_units")
    search_fields = ("name",)

