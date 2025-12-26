
# Register your models here.
from django.contrib import admin
from .models import OpcUaClientConfig, OPCUANode, AuthenticationSetting, TagName, AlarmLog, ThresholdBreach, NotificationRecipient
from django.utils.html import format_html
from roams_opcua_mgr.models.logging_model import OpcUaReadLog, OpcUaWriteLog
from django.http import JsonResponse
from django.template.response import TemplateResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.urls import path
from .views import delete_logs_view, progress_status_view
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.db.models import Q




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

class AlarmInline(admin.TabularInline):
    model = AlarmLog
    extra = 0
    readonly_fields = ("message", "severity", "timestamp", "acknowledged")    

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
    inlines = [AlarmInline]
    def last_value(self, obj):
        return obj.last_value if obj.last_value is not None else "No Data"
    last_value.short_description = "Last Read Value"

# Register Tag Names
@admin.register(TagName)
class TagNameAdmin(admin.ModelAdmin):
    list_display = ("name", "tag_units")
    search_fields = ("name",)

# Model for logging alarms
@admin.register(AlarmLog)
class AlarmLogAdmin(admin.ModelAdmin):
    list_display = (
        "station_name",
        "node",
        "severity",
        "message",
        "acknowledged",
        "timestamp",
    )
    list_filter = ("severity", "acknowledged", "station_name")
    search_fields = ("station_name", "message", "node__tag_name")
    ordering = ("-timestamp",)
    list_per_page = 25

    # Optional: colorize severity levels (requires custom CSS)
    def severity_colored(self, obj):
        color_map = {
            "Critical": "red",
            "Warning": "orange",
            "Info": "green",
        }
        color = color_map.get(obj.severity, "black")
        return format_html('<span style="color: {};">{}</span>', color, obj.severity)
    severity_colored.short_description = "Severity"


# ==================== THRESHOLD BREACH ADMIN ====================

@admin.action(description="Mark selected breaches as acknowledged")
def acknowledge_breaches(modeladmin, request, queryset):
    """Mark multiple breaches as acknowledged by the requesting user"""
    username = request.user.username if request.user else "admin"
    count = queryset.update(
        acknowledged=True,
        acknowledged_by=username,
        acknowledged_at=now()
    )
    modeladmin.message_user(request, f"✅ {count} breach(es) marked as acknowledged")


@admin.register(ThresholdBreach)
class ThresholdBreachAdmin(admin.ModelAdmin):
    """Admin interface for threshold breaches with filtering and bulk actions"""
    
    list_display = (
        'colored_level',
        'node_parameter',
        'value_display',
        'timestamp',
        'acknowledged_status',
        'acknowledged_by'
    )
    
    list_filter = (
        'level',
        'acknowledged',
        ('timestamp', admin.DateFieldListFilter),
        'node__client_config',
    )
    
    search_fields = (
        'node__tag_name__name',
        'node__client_config__station_name',
        'acknowledged_by'
    )
    
    readonly_fields = (
        'node',
        'value',
        'timestamp',
        'acknowledged_at'
    )
    
    fieldsets = (
        ('Breach Details', {
            'fields': ('node', 'value', 'level', 'timestamp')
        }),
        ('Acknowledgement', {
            'fields': ('acknowledged', 'acknowledged_by', 'acknowledged_at'),
            'classes': ('collapse',)
        }),
    )
    
    ordering = ('-timestamp',)
    date_hierarchy = 'timestamp'
    list_per_page = 50
    actions = [acknowledge_breaches]
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('node', 'node__client_config', 'node__tag_name')
    
    def colored_level(self, obj):
        """Display breach level with color coding"""
        color_map = {
            'Critical': '#d32f2f',  # Red
            'Warning': '#f57c00',   # Orange
        }
        color = color_map.get(obj.level, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">🚨 {}</span>',
            color,
            obj.level
        )
    colored_level.short_description = 'Level'
    colored_level.admin_order_field = 'level'
    
    def node_parameter(self, obj):
        """Display node parameter with station"""
        return format_html(
            '<strong>{}</strong><br/><small style="color: #666;">{}</small>',
            obj.node.tag_name,
            obj.node.client_config.station_name
        )
    node_parameter.short_description = 'Parameter (Station)'
    
    def value_display(self, obj):
        """Display breach value with units"""
        unit = obj.node.tag_units or ''
        return f'{obj.value} {unit}'
    value_display.short_description = 'Value'
    
    def acknowledged_status(self, obj):
        """Display acknowledgement status with icon"""
        if obj.acknowledged:
            return format_html(
                '<span style="color: green;">✓ Acknowledged</span>'
            )
        return format_html(
            '<span style="color: red;">✗ Unacknowledged</span>'
        )
    acknowledged_status.short_description = 'Status'
    acknowledged_status.admin_order_field = 'acknowledged'
    
    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete breaches"""
        return request.user.is_superuser
    
    def get_actions(self, request):
        """Only show acknowledge action to staff"""
        actions = super().get_actions(request)
        if not request.user.is_staff:
            del actions['acknowledge_breaches']
        return actions


# ==================== NOTIFICATION RECIPIENT ADMIN ====================

@admin.register(NotificationRecipient)
class NotificationRecipientAdmin(admin.ModelAdmin):
    """Admin interface for managing notification subscriptions"""
    
    list_display = (
        'user_info',
        'node_parameter',
        'alert_level',
        'notification_methods',
        'created_at'
    )
    
    list_filter = (
        'alert_level',
        'email_enabled',
        'sms_enabled',
        'created_at',
        'node__client_config'
    )
    
    search_fields = (
        'user__username',
        'user__email',
        'node__tag_name__name',
        'node__client_config__station_name'
    )
    
    readonly_fields = (
        'created_at',
        'updated_at'
    )
    
    fieldsets = (
        ('Subscription', {
            'fields': ('node', 'user', 'alert_level')
        }),
        ('Notification Methods', {
            'fields': ('email_enabled', 'sms_enabled')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_info(self, obj):
        """Display user with email"""
        return format_html(
            '<strong>{}</strong><br/><small style="color: #666;">{}</small>',
            obj.user.username,
            obj.user.email
        )
    user_info.short_description = 'User'
    user_info.admin_order_field = 'user__username'
    
    def node_parameter(self, obj):
        """Display node parameter with station"""
        return format_html(
            '<strong>{}</strong><br/><small style="color: #666;">{}</small>',
            obj.node.tag_name,
            obj.node.client_config.station_name
        )
    node_parameter.short_description = 'Parameter (Station)'
    
    def notification_methods(self, obj):
        """Display enabled notification methods"""
        methods = []
        if obj.email_enabled:
            methods.append('📧 Email')
        if obj.sms_enabled:
            methods.append('📱 SMS')
        
        if not methods:
            return format_html('<span style="color: #ccc;">None enabled</span>')
        
        return format_html('<br/>'.join(methods))
    notification_methods.short_description = 'Methods'
    
    def has_delete_permission(self, request, obj=None):
        """Only staff can delete notification subscriptions"""
        return request.user.is_staff
    
    def has_add_permission(self, request):
        """Only staff can add notification subscriptions"""
        return request.user.is_staff
    
    def has_change_permission(self, request, obj=None):
        """Only staff can change notification subscriptions"""
        return request.user.is_staff
