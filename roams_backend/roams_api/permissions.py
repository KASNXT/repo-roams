# roams_api/permissions.py
from rest_framework.permissions import BasePermission, IsAuthenticated

class IsFrontendApp(BasePermission):
    """
    Allows access only if the request comes from the allowed frontend domain
    or if no Origin header is present (e.g., curl, Postman, DRF browsable API).
    """

    allowed_origins = [
        "http://127.0.0.1:5173",  # Vite dev
        "http://localhost:5173",
        "http://144.91.79.167",  # VPS production
        "https://144.91.79.167",  # VPS production HTTPS
        "https://yourdomain.com",  # production frontend
    ]

    def has_permission(self, request, view):
        origin = request.META.get("HTTP_ORIGIN")
        if origin is None:
            # No Origin header: allow access (curl, Postman, DRF)
            return True
        return origin in self.allowed_origins


class IsAdminUser(BasePermission):
    """
    Allows access only to admin/superuser users.
    Required for sensitive operations like user creation and role management.
    """
    
    def has_permission(self, request, view):
        return bool(request.user and (request.user.is_staff or request.user.is_superuser))


class IsAdminOrReadOnly(BasePermission):
    """
    Allows admin/superuser to create/update/delete users.
    Regular authenticated users can only read user list.
    """
    
    def has_permission(self, request, view):
        # Allow all authenticated users to read
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user and request.user.is_authenticated
        # Only admin/superuser can create, update, delete
        return bool(request.user and (request.user.is_staff or request.user.is_superuser))
