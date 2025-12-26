from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin interface for user profiles"""
    list_display = ('user', 'phone_number', 'email_notifications', 'sms_notifications', 'critical_alerts_only')
    list_filter = ('email_notifications', 'sms_notifications', 'critical_alerts_only', 'created_at')
    search_fields = ('user__username', 'user__email', 'phone_number')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Contact Information', {
            'fields': ('phone_number',)
        }),
        ('Notification Preferences', {
            'fields': ('email_notifications', 'sms_notifications', 'critical_alerts_only')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing existing object
            return self.readonly_fields + ('user',)
        return self.readonly_fields
