# roams_api/middleware.py
"""
Middleware for tracking user authentication and login activity
"""

from django.utils import timezone
from roams_api.models import UserProfile
import logging

logger = logging.getLogger(__name__)


class LastLoginTrackerMiddleware:
    """
    Middleware to track the last login time and IP address of authenticated users.
    Updates UserProfile.last_login_time and UserProfile.last_login_ip on each API request.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Get client IP address
        ip_address = self.get_client_ip(request)
        
        # Check if user is authenticated
        if request.user and request.user.is_authenticated:
            try:
                # Update last login time and IP
                user_profile, created = UserProfile.objects.get_or_create(user=request.user)
                user_profile.last_login_time = timezone.now()
                user_profile.last_login_ip = ip_address
                user_profile.save(update_fields=['last_login_time', 'last_login_ip'])
                logger.debug(f"Updated last login for user {request.user.username} from {ip_address}")
            except Exception as e:
                logger.warning(f"Failed to update last login for user {request.user.username}: {str(e)}")
        
        response = self.get_response(request)
        return response
    
    @staticmethod
    def get_client_ip(request):
        """
        Extract client IP from request headers
        Checks: X-Forwarded-For, X-Real-IP, then REMOTE_ADDR
        """
        # Check for X-Forwarded-For header (proxy/load balancer)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            ip = x_forwarded_for.split(',')[0].strip()
            return ip
        
        # Check for X-Real-IP header (alternative proxy)
        x_real_ip = request.META.get('HTTP_X_REAL_IP')
        if x_real_ip:
            return x_real_ip
        
        # Fallback to REMOTE_ADDR
        return request.META.get('REMOTE_ADDR', '0.0.0.0')
