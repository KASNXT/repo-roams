from django.contrib import admin
from django.contrib.auth.models import User
from django.utils.html import format_html
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin interface for user profiles with role and phone management"""
    list_display = ('get_username', 'get_user_email', 'role_badge', 'phone_number', 'get_notifications')
    list_filter = ('role', 'email_notifications', 'sms_notifications', 'critical_alerts_only', 'created_at')
    search_fields = ('user__username', 'user__email', 'phone_number')
    readonly_fields = ('created_at', 'updated_at', 'get_contact_info_display')
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'role')
        }),
        ('Contact Information', {
            'fields': ('phone_number',),
            'description': 'Phone number format: +1234567890 (9-15 digits)'
        }),
        ('Notification Preferences', {
            'fields': ('email_notifications', 'sms_notifications', 'critical_alerts_only')
        }),
        ('Contact Info Summary', {
            'fields': ('get_contact_info_display',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_username(self, obj):
        """Display username as link to user"""
        return obj.user.username
    get_username.short_description = 'Username'
    
    def get_user_email(self, obj):
        """Display user email"""
        return obj.user.email
    get_user_email.short_description = 'Email'
    
    def role_badge(self, obj):
        """Display role with color coding"""
        role_colors = {
            'viewer': '#6B7280',
            'technician': '#2563EB',
            'operator': '#F59E0B',
            'admin': '#DC2626',
            'superuser': '#DC2626',
        }
        color = role_colors.get(obj.role, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_role_display()
        )
    role_badge.short_description = 'Role'
    
    def get_notifications(self, obj):
        """Display notification preferences summary"""
        notifs = []
        if obj.email_notifications:
            notifs.append('📧 Email')
        if obj.sms_notifications:
            notifs.append('📱 SMS')
        if obj.critical_alerts_only:
            notifs.append('⚠️ Critical Only')
        return ' | '.join(notifs) if notifs else '—'
    get_notifications.short_description = 'Notifications'
    
    def get_contact_info_display(self, obj):
        """Display contact info summary"""
        info = obj.get_contact_info()
        if not info:
            return 'No contact methods configured'
        
        # Build HTML safely with format_html
        parts = []
        for k, v in info.items():
            parts.append(format_html('<strong>{}:</strong> {}', k.upper(), v))
        
        return format_html('<br>'.join(['{}'] * len(parts)), *parts)
    get_contact_info_display.short_description = 'Contact Information'
    
    def get_readonly_fields(self, request, obj=None):
        """Make user field readonly when editing"""
        if obj:  # Editing existing object
            return self.readonly_fields + ('user',)
        return self.readonly_fields
    
    def has_add_permission(self, request):
        """Only superusers can add profiles"""
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete profiles"""
        return request.user.is_superuser
    
    def get_queryset(self, request):
        """
        Filter profiles based on user role:
        - Superuser/Admin: See all users
        - Others: Only see their own profile
        """
        qs = super().get_queryset(request)
        
        if request.user.is_superuser or request.user.is_staff:
            return qs  # Admins and superusers see all
        else:
            # Regular users only see their own profile
            return qs.filter(user=request.user)
