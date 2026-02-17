
from django.contrib import admin
from .models import OpcUaClientConfig, OPCUANode, AuthenticationSetting, TagName, AlarmLog, ThresholdBreach, NotificationRecipient, StationDeviceSpecifications
from roams_opcua_mgr.models import ControlState, ControlStateHistory, ControlPermission, ControlStateRequest
from roams_opcua_mgr.models.alarm_retention_model import AlarmRetentionPolicy
from django.utils.html import format_html, mark_safe
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
import threading
from django.core.cache import cache




# Global progress tracker for deletion operations
class DeletionProgress:
    """Thread-safe progress tracking for deletion operations"""
    def __init__(self):
        self.progress = {}
    
    def set_progress(self, config_id, stage, percent):
        """Set progress for a specific config deletion"""
        key = f"deletion_progress_{config_id}"
        self.progress[key] = {"stage": stage, "percent": percent}
        cache.set(key, {"stage": stage, "percent": percent}, timeout=3600)
    
    def get_progress(self, config_id):
        """Get progress for a specific config deletion"""
        key = f"deletion_progress_{config_id}"
        return cache.get(key, {"stage": "Not started", "percent": 0})
    
    def clear_progress(self, config_id):
        """Clear progress for a specific config deletion"""
        key = f"deletion_progress_{config_id}"
        cache.delete(key)

deletion_progress = DeletionProgress()

# Delete logs efficiently using bulk database operations
def delete_logs_in_chunks(client_config, batch_size=5000, progress_callback=None):
    """
    Optimized bulk delete using raw queries for speed.
    Deletes logs in chunks to avoid locking tables for too long.
    Compatible with PostgreSQL and MySQL.
    """
    from django.db import connection
    
    while True:
        # Use raw SQL for faster deletion (10-100x faster than ORM)
        with connection.cursor() as cursor:
            # PostgreSQL: Use subquery with LIMIT (LIMIT not allowed in DELETE directly)
            cursor.execute(f"""
                DELETE FROM roams_opcua_mgr_opcuareadlog 
                WHERE id IN (
                    SELECT id FROM roams_opcua_mgr_opcuareadlog 
                    WHERE client_config_id = %s 
                    LIMIT %s
                )
            """, [client_config.id, batch_size])
            read_count = cursor.rowcount
            
            # Delete write logs
            cursor.execute(f"""
                DELETE FROM roams_opcua_mgr_opcuawritelog 
                WHERE id IN (
                    SELECT id FROM roams_opcua_mgr_opcuawritelog 
                    WHERE client_config_id = %s 
                    LIMIT %s
                )
            """, [client_config.id, batch_size])
            write_count = cursor.rowcount
            
            if progress_callback:
                progress_callback(f"Deleted {read_count + write_count} log entries")
        
        if read_count == 0 and write_count == 0:
            break


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
    
    # 🎯 FIELDSETS CONFIGURATION - Organizes advanced properties into collapsible sections
    fieldsets = (
        ("🏢 Basic Information", {
            "fields": ("station_name", "endpoint_url", "active"),
            "description": "Station name and OPC UA server connection details"
        }),
        ("📍 Geographic Location", {
            "fields": ("latitude", "longitude"),
            "classes": ("collapse",),
            "description": "GPS coordinates for mapping (optional)"
        }),
        ("🔐 Security Settings", {
            "fields": ("security_policy", "security_mode"),
            "description": "Configure OPC UA security authentication method"
        }),
        ("⏱️ Connection Timeouts (Advanced)", {
            "fields": (
                "connection_time_out",
                "session_time_out",
                "request_time_out",
                "secure_time_out",
                "acknowledge_time_out",
            ),
            "classes": ("collapse",),
            "description": "All values in milliseconds (ms). Recommended: Local=3000-5000ms, Remote=10000-15000ms, Slow=20000-30000ms"
        }),
        ("📊 Data Collection Settings (Advanced)", {
            "fields": ("subscription_interval",),
            "classes": ("collapse",),
            "description": "How often to read values from OPC UA server (milliseconds). Must match other SCADA systems for data comparison."
        }),
        ("📋 Advanced Display Options", {
            "fields": ("show_advanced_properties",),
            "classes": ("collapse",),
            "description": "Toggle this to show/hide advanced fields in connected dashboard applications"
        }),
        ("📈 Connection Status (Read-Only)", {
            "fields": ("connection_status", "last_connected", "created_at"),
            "classes": ("collapse",),
            "description": "Auto-updated by system - these fields are read-only and show current connection state"
        }),
    )
    
    # Read-only fields prevent accidental manual changes to system-managed values
    readonly_fields = ("connection_status", "last_connected", "created_at")

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
    
    def has_add_permission(self, request):
        """Only admins and superusers can add RTU clients"""
        return request.user.is_superuser or request.user.is_staff
    
    def has_delete_permission(self, request, obj=None):
        """Only admins and superusers can delete RTU clients"""
        return request.user.is_superuser or request.user.is_staff
    
    def has_change_permission(self, request, obj=None):
        """Only admins and superusers can modify RTU clients"""
        return request.user.is_superuser or request.user.is_staff
    
    def has_view_permission(self, request, obj=None):
        """Only admins and superusers can view RTU clients"""
        return request.user.is_superuser or request.user.is_staff

    def delete_model(self, request, obj):
        """
        Optimize deletion of OpcUaClientConfig by handling related data efficiently.
        Prevents timeout when deleting configs with many related records.
        Uses increased statement timeout and batch operations to prevent cancellation.
        Includes progress tracking for user feedback.
        """
        from django.db import connection, transaction
        
        client_config_id = obj.id
        
        # Initialize progress tracking
        def update_progress(stage, percent):
            deletion_progress.set_progress(client_config_id, stage, percent)
        
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    # For PostgreSQL: Increase statement timeout to 10 minutes for deletion
                    try:
                        cursor.execute("SET statement_timeout = '10min'")
                    except:
                        pass  # Fallback for other databases
                
                # Step 1: Delete logs in chunks (already optimized)
                update_progress("Deleting logs...", 10)
                delete_logs_in_chunks(obj, progress_callback=lambda x: update_progress(f"Logs: {x}", 15))
                
                # Step 2: Delete authentication settings with explicit timeout
                update_progress("Deleting authentication settings...", 25)
                with connection.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM roams_opcua_mgr_authenticationsetting WHERE client_config_id = %s",
                        [client_config_id]
                    )
                
                # Step 3: Delete nodes and their related data
                update_progress("Retrieving node data...", 30)
                with connection.cursor() as cursor:
                    # Get all node IDs for this config
                    cursor.execute(
                        "SELECT id FROM roams_opcua_mgr_opcuanode WHERE client_config_id = %s",
                        [client_config_id]
                    )
                    node_ids = [row[0] for row in cursor.fetchall()]
                    total_nodes = len(node_ids)
                
                # Delete in smaller batches to reduce lock contention
                if node_ids:
                    batch_size = 500
                    num_batches = (total_nodes + batch_size - 1) // batch_size
                    
                    for batch_num, i in enumerate(range(0, len(node_ids), batch_size)):
                        batch_ids = node_ids[i:i+batch_size]
                        node_ids_str = ",".join(str(nid) for nid in batch_ids)
                        
                        # Update progress
                        progress_percent = 30 + int((batch_num / num_batches) * 40)
                        update_progress(f"Deleting node data batch {batch_num + 1}/{num_batches}...", progress_percent)
                        
                        # Delete related data with batch-specific timeout
                        with connection.cursor() as batch_cursor:
                            batch_cursor.execute("SET statement_timeout = '5min'")
                            for table in ["roams_opcua_mgr_alarmlog",
                                          "roams_opcua_mgr_tagname",
                                          "roams_opcua_mgr_controlstate",
                                          "roams_opcua_mgr_controlstatehistory"]:
                                try:
                                    batch_cursor.execute(f"DELETE FROM {table} WHERE node_id IN ({node_ids_str})")
                                except Exception as e:
                                    pass  # Skip non-existent tables
                    
                    # Delete nodes in final batches
                    for batch_num, i in enumerate(range(0, len(node_ids), batch_size)):
                        batch_ids = node_ids[i:i+batch_size]
                        node_ids_str = ",".join(str(nid) for nid in batch_ids)
                        update_progress(f"Deleting nodes batch {batch_num + 1}/{num_batches}...", 70 + int((batch_num / num_batches) * 15))
                        with connection.cursor() as batch_cursor:
                            batch_cursor.execute("SET statement_timeout = '5min'")
                            batch_cursor.execute(f"DELETE FROM roams_opcua_mgr_opcuanode WHERE id IN ({node_ids_str})")
                
                # Step 4: Delete the client config itself
                update_progress("Deleting client configuration...", 85)
                with connection.cursor() as cursor:
                    cursor.execute("SET statement_timeout = '5min'")
                    cursor.execute(
                        "DELETE FROM roams_opcua_mgr_opcuaclientconfig WHERE id = %s",
                        [client_config_id]
                    )
                
                # Mark as complete
                update_progress("Deletion completed!", 100)
        except Exception as e:
            update_progress(f"Error: {str(e)}", 0)
            raise
        finally:
            # Reset statement timeout
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET statement_timeout = 0")
            except:
                pass
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("delete-progress/<int:config_id>/", self.admin_site.admin_view(self.get_delete_progress), name="delete_progress"),
        ]
        return custom_urls + urls
    
    def get_delete_progress(self, request, config_id):
        """API endpoint to get deletion progress"""
        progress = deletion_progress.get_progress(config_id)
        return JsonResponse(progress)
    
    def delete_view(self, request, object_id, extra_context=None):
        """
        Override delete view to show progress bar during deletion.
        """
        opts = self.model._meta
        obj = self.get_object(request, object_id)
        
        if obj is None:
            return self._get_obj_does_not_exist_redirect(request, opts, object_id)
        
        # Start deletion in a background thread
        def perform_deletion():
            self.delete_model(request, obj)
        
        if request.method == 'POST':
            # Start the deletion in a background thread
            deletion_thread = threading.Thread(target=perform_deletion)
            deletion_thread.daemon = True
            deletion_thread.start()
            
            # Show progress page
            context = {
                'config_id': obj.id,
                'object_name': str(obj),
                'opts': opts,
            }
            if extra_context:
                context.update(extra_context)
            
            return TemplateResponse(request, 'admin/roams_opcua_mgr/delete_progress.html', context)
        
        # GET request - show normal confirmation page
        return super().delete_view(request, object_id, extra_context)

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
        "access_level", "last_value", "tag_units", "data_type_display", "display_type_display", "last_updated"
    )
    search_fields = ("node_id", "tag_name__name")
    list_filter = ("client_config", "data_type", "display_type", "is_boolean_control")
    ordering = ("client_config", "tag_name")
    inlines = [AlarmInline]
    readonly_fields = ("last_value", "last_updated", "is_alarm")
    
    fieldsets = (
        ("Basic Configuration", {
            "fields": ("client_config", "tag_name", "add_new_tag_name", "node_id", "tag_units")
        }),
        ("Data Type & Display", {
            "fields": ("data_type", "display_type", "decimal_places", "icon", "is_boolean_control"),
            "description": "Configure how this node appears in the UI"
        }),
        ("Display Range", {
            "fields": ("display_min", "display_max"),
            "classes": ("collapse",),
            "description": "For gauges and charts - leave blank for auto-scaling"
        }),
        ("Operational Limits", {
            "fields": ("min_value", "max_value"),
            "classes": ("collapse",),
        }),
        ("Thresholds", {
            "fields": ("threshold_active", "warning_level", "critical_level", "severity"),
            "classes": ("collapse",),
        }),
        ("Sampling Configuration", {
            "fields": ("sampling_interval", "sample_on_whole_number_change", "last_whole_number"),
            "classes": ("collapse",),
        }),
        ("Access Control", {
            "fields": ("access_level",),
        }),
        ("Status", {
            "fields": ("last_value", "last_updated", "is_alarm"),
            "classes": ("collapse",),
        }),
    )
    
    def last_value(self, obj):
        return obj.last_value if obj.last_value is not None else "No Data"
    last_value.short_description = "Last Read Value"
    
    def data_type_display(self, obj):
        """Display data type with color coding"""
        colors = {
            "Float": "#0066cc",
            "Double": "#0066cc",
            "Boolean": "#cc0000",
            "Int16": "#009900",
            "UInt16": "#009900",
            "Int32": "#009900",
            "UInt32": "#009900",
        }
        color = colors.get(obj.data_type, "#666666")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.data_type
        )
    data_type_display.short_description = "Data Type"
    
    def display_type_display(self, obj):
        """Display the UI display type"""
        icons = {
            "numeric": "📊",
            "gauge": "🎯",
            "gauge-circular": "🎡",
            "progress": "📈",
            "switch": "🔘",
            "status-indicator": "🟢",
            "chart": "📉",
        }
        icon = icons.get(obj.display_type, "")
        return format_html(
            '{} {}',
            icon,
            obj.get_display_type_display()
        )
    display_type_display.short_description = "Display Type"

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
    list_max_show_all = 500  # Prevent loading all 126K records at once
    actions = [acknowledge_breaches]
    show_full_result_count = False  # Disable count query for large datasets (slow with 126K records)
    
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
            return format_html('<span style="color: green;">{}</span>', '✓ Acknowledged')
        return format_html('<span style="color: red;">{}</span>', '✗ Unacknowledged')
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
            return format_html('<span style="color: #ccc;">{}</span>', 'None enabled')
        
        # Return safe HTML with joined methods
        return mark_safe('<br/>'.join(methods))
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


# Control State Admin
@admin.register(ControlState)
class ControlStateAdmin(admin.ModelAdmin):
    list_display = ['tag_name_display', 'current_value_display', 'is_synced_display', 'danger_level_display', 'last_changed_by', 'last_changed_at']
    list_filter = ['tag_type', 'current_value', 'is_synced_with_plc', 'danger_level', 'requires_confirmation']
    search_fields = ['node__tag_name', 'description']
    readonly_fields = ['plc_value', 'is_synced_with_plc', 'sync_error_message', 'last_changed_at', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Control Information', {
            'fields': ('node', 'tag_type', 'description')
        }),
        ('Current State', {
            'fields': ('current_value', 'plc_value', 'is_synced_with_plc', 'sync_error_message')
        }),
        ('Safety Settings', {
            'fields': ('danger_level', 'requires_confirmation', 'confirmation_timeout', 'rate_limit_seconds')
        }),
        ('History', {
            'fields': ('last_changed_by', 'last_changed_at'),
            'classes': ('collapse',)
        }),
    )
    
    def tag_name_display(self, obj):
        return obj.node.tag_name if obj.node else 'N/A'
    tag_name_display.short_description = 'Tag Name'
    tag_name_display.admin_order_field = 'node__tag_name'
    
    def current_value_display(self, obj):
        color = 'green' if obj.current_value else 'red'
        status = '✓ ON' if obj.current_value else '✗ OFF'
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, status)
    current_value_display.short_description = 'Current State'
    current_value_display.admin_order_field = 'current_value'
    
    def is_synced_display(self, obj):
        color = 'green' if obj.is_synced_with_plc else 'orange'
        status = '✓ Synced' if obj.is_synced_with_plc else '⚠️ Out of Sync'
        return format_html('<span style="color: {};">{}</span>', color, status)
    is_synced_display.short_description = 'PLC Sync'
    is_synced_display.admin_order_field = 'is_synced_with_plc'
    
    def danger_level_display(self, obj):
        return obj.get_danger_level_display()
    danger_level_display.short_description = 'Danger Level'
    danger_level_display.admin_order_field = 'danger_level'
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(ControlStateHistory)
class ControlStateHistoryAdmin(admin.ModelAdmin):
    list_display = ['control_tag_display', 'change_type_display', 'requested_by', 'confirmed_by', 'value_change_display', 'timestamp']
    list_filter = ['change_type', 'timestamp', 'control_state__node__tag_name']
    search_fields = ['control_state__node__tag_name', 'requested_by__username', 'reason']
    readonly_fields = ['control_state', 'change_type', 'requested_by', 'confirmed_by', 'final_value', 'error_message', 'timestamp']
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Change Information', {
            'fields': ('control_state', 'change_type', 'requested_by', 'confirmed_by')
        }),
        ('Values', {
            'fields': ('previous_value', 'requested_value', 'final_value')
        }),
        ('Details', {
            'fields': ('reason', 'error_message', 'ip_address')
        }),
        ('Timestamp', {
            'fields': ('timestamp',),
            'classes': ('collapse',)
        }),
    )
    
    def control_tag_display(self, obj):
        return obj.control_state.node.tag_name if obj.control_state.node else 'N/A'
    control_tag_display.short_description = 'Control Tag'
    control_tag_display.admin_order_field = 'control_state__node__tag_name'
    
    def change_type_display(self, obj):
        return obj.get_change_type_display()
    change_type_display.short_description = 'Type'
    change_type_display.admin_order_field = 'change_type'
    
    def value_change_display(self, obj):
        prev = 'ON' if obj.previous_value else 'OFF'
        req = 'ON' if obj.requested_value else 'OFF'
        return format_html('{} → {}', prev, req)
    value_change_display.short_description = 'Change'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ControlPermission)
class ControlPermissionAdmin(admin.ModelAdmin):
    list_display = ['user_display', 'control_tag_display', 'permission_level_display', 'is_active_display', 'granted_at']
    list_filter = ['permission_level', 'is_active', 'granted_at', 'control_state__node__tag_name']
    search_fields = ['user__username', 'control_state__node__tag_name']
    readonly_fields = ['granted_at', 'granted_by']
    
    fieldsets = (
        ('User & Control', {
            'fields': ('user', 'control_state')
        }),
        ('Permission', {
            'fields': ('permission_level', 'is_active', 'expires_at')
        }),
        ('Audit', {
            'fields': ('granted_by', 'granted_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_display(self, obj):
        return format_html(
            '<strong>{}</strong><br/><small style="color: #666;">{}</small>',
            obj.user.username,
            obj.user.email
        )
    user_display.short_description = 'User'
    user_display.admin_order_field = 'user__username'
    
    def control_tag_display(self, obj):
        return obj.control_state.node.tag_name if obj.control_state.node else 'N/A'
    control_tag_display.short_description = 'Control'
    control_tag_display.admin_order_field = 'control_state__node__tag_name'
    
    def permission_level_display(self, obj):
        return obj.get_permission_level_display()
    permission_level_display.short_description = 'Level'
    permission_level_display.admin_order_field = 'permission_level'
    
    def is_active_display(self, obj):
        color = 'green' if obj.is_active else 'red'
        status = '✓ Active' if obj.is_active else '✗ Inactive'
        return format_html('<span style="color: {};">{}</span>', color, status)
    is_active_display.short_description = 'Status'
    is_active_display.admin_order_field = 'is_active'
    
    def perform_create(self, request):
        return request.user
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(ControlStateRequest)
class ControlStateRequestAdmin(admin.ModelAdmin):
    list_display = ['control_tag_display', 'requested_by', 'requested_value_display', 'status_display', 'expires_at', 'created_at']
    list_filter = ['status', 'created_at', 'control_state__node__tag_name']
    search_fields = ['control_state__node__tag_name', 'requested_by__username', 'reason']
    readonly_fields = ['confirmation_token', 'control_state', 'requested_by', 'created_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Request Information', {
            'fields': ('control_state', 'requested_by', 'requested_value')
        }),
        ('Confirmation', {
            'fields': ('status', 'confirmation_token', 'expires_at', 'confirmed_by', 'confirmed_at')
        }),
        ('Details', {
            'fields': ('reason', 'ip_address'),
        }),
    )
    
    def control_tag_display(self, obj):
        return obj.control_state.node.tag_name if obj.control_state.node else 'N/A'
    control_tag_display.short_description = 'Control'
    control_tag_display.admin_order_field = 'control_state__node__tag_name'
    
    def requested_value_display(self, obj):
        color = 'green' if obj.requested_value else 'red'
        status = 'ON' if obj.requested_value else 'OFF'
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, status)
    requested_value_display.short_description = 'Requested'
    requested_value_display.admin_order_field = 'requested_value'
    
    def status_display(self, obj):
        colors = {
            'pending': 'orange',
            'confirmed': 'blue',
            'cancelled': 'gray',
            'expired': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, obj.get_status_display())
    status_display.short_description = 'Status'
    status_display.admin_order_field = 'status'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(AlarmRetentionPolicy)
class AlarmRetentionPolicyAdmin(admin.ModelAdmin):
    """
    Admin interface for alarm retention policies.
    Restricted to superuser/admin-only access.
    Controls automatic cleanup of old alarm logs and threshold breaches.
    """
    list_display = ('auto_cleanup_status', 'alarm_log_retention_days', 'breach_retention_days', 'keep_unacknowledged_badge', 'last_cleanup_at', 'created_at')
    list_filter = ('auto_cleanup_enabled', 'keep_unacknowledged', 'created_at')
    readonly_fields = ('last_cleanup_at', 'created_at')
    
    fieldsets = (
        ('Alarm Log Retention', {
            'fields': ('alarm_log_retention_days',),
            'description': 'Configure how many days to keep alarm logs before automatic deletion (7-365 days)'
        }),
        ('Threshold Breach Retention', {
            'fields': ('breach_retention_days', 'keep_unacknowledged'),
            'description': 'Configure how many days to keep acknowledged threshold breaches. Unacknowledged breaches can be kept indefinitely.'
        }),
        ('Automatic Cleanup', {
            'fields': ('auto_cleanup_enabled',),
            'description': 'Enable or disable automatic deletion of old records'
        }),
        ('Cleanup History', {
            'fields': ('last_cleanup_at', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def auto_cleanup_status(self, obj):
        """Display auto cleanup status with color coding"""
        color = 'green' if obj.auto_cleanup_enabled else 'red'
        status = '✓ Enabled' if obj.auto_cleanup_enabled else '✗ Disabled'
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, status)
    auto_cleanup_status.short_description = 'Auto Cleanup'
    auto_cleanup_status.admin_order_field = 'auto_cleanup_enabled'
    
    def keep_unacknowledged_badge(self, obj):
        """Display unacknowledged breach retention status"""
        color = 'green' if obj.keep_unacknowledged else 'orange'
        status = '♾ Keep All' if obj.keep_unacknowledged else '⏱ Delete'
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, status)
    keep_unacknowledged_badge.short_description = 'Unacknowledged'
    keep_unacknowledged_badge.admin_order_field = 'keep_unacknowledged'
    
    def has_add_permission(self, request):
        """Only superuser/admin can add retention policies"""
        return request.user.is_superuser or request.user.is_staff
    
    def has_delete_permission(self, request, obj=None):
        """Only superuser/admin can delete retention policies"""
        return request.user.is_superuser or request.user.is_staff
    
    def has_change_permission(self, request, obj=None):
        """Only superuser/admin can modify retention policies"""
        return request.user.is_superuser or request.user.is_staff
    
    def has_view_permission(self, request, obj=None):
        """Only superuser/admin can view retention policies"""
        return request.user.is_superuser or request.user.is_staff



# ============================================================================
# Station Device Specifications Admin
# ============================================================================
@admin.register(StationDeviceSpecifications)
class StationDeviceSpecificationsAdmin(admin.ModelAdmin):
    """
    Admin interface for station device specifications (nameplate data).
    Stores motor/pump specifications from device nameplates.
    Used for comparing with real-time data in the Analysis page.
    """
    list_display = ('get_station', 'motor_power_rating', 'rated_current', 'rated_flow_rate', 'rated_head', 'device_model', 'manufacturer')
    list_filter = ('station', 'manufacturer', 'created_at')
    search_fields = ('station__station_name', 'device_model', 'manufacturer', 'serial_number')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Station', {
            'fields': ('station',)
        }),
        ('Motor/Pump Specifications', {
            'fields': ('motor_power_rating', 'rated_current', 'rated_flow_rate', 'rated_head', 'rated_pressure_bar'),
            'description': 'Enter device nameplate ratings (kW, A, m³/h, m, bar)'
        }),
        ('Device Information', {
            'fields': ('device_model', 'manufacturer', 'serial_number'),
        }),
        ('Maintenance', {
            'fields': ('installation_date', 'last_maintenance', 'notes'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_station(self, obj):
        """Display station name"""
        return obj.station.station_name
    get_station.short_description = 'Station'
    get_station.admin_order_field = 'station__station_name'
    
    def has_add_permission(self, request):
        return request.user.is_staff or request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_staff or request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        return request.user.is_staff or request.user.is_superuser
