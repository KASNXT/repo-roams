"""
Middleware to handle database timeouts during admin operations.
Increases statement timeout for admin URLs to prevent cancellation during heavy operations.
"""

from django.db import connection
import logging

logger = logging.getLogger(__name__)


class AdminTimeoutMiddleware:
    """Middleware to set increased timeouts for admin operations"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.admin_paths = ['/admin/', '/api/']
    
    def __call__(self, request):
        # Check if this is an admin request
        is_admin = any(request.path.startswith(path) for path in self.admin_paths)
        
        if is_admin:
            try:
                with connection.cursor() as cursor:
                    # Set longer timeout for admin operations (30 minutes)
                    cursor.execute("SET statement_timeout = '1800000'")  # 30 minutes
                    cursor.execute("SET lock_timeout = '600000'")  # 10 minutes
            except Exception as e:
                logger.warning(f"Could not set admin timeout: {e}")
        
        response = self.get_response(request)
        
        # Reset timeout after request
        if is_admin:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET statement_timeout = 0")
                    cursor.execute("SET lock_timeout = 0")
            except Exception as e:
                logger.warning(f"Could not reset timeout: {e}")
        
        return response
