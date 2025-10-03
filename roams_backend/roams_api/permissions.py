# roams_api/permissions.py
from rest_framework.permissions import BasePermission

class IsFrontendApp(BasePermission):
    """
    Allows access only if the request comes from the allowed frontend domain
    or if no Origin header is present (e.g., curl, Postman, DRF browsable API).
    """

    allowed_origins = [
        "http://127.0.0.1:5173",  # Vite dev
        "http://localhost:5173",
        "https://yourdomain.com",  # production frontend
    ]

    def has_permission(self, request, view):
        origin = request.META.get("HTTP_ORIGIN")
        if origin is None:
            # No Origin header: allow access (curl, Postman, DRF)
            return True
        return origin in self.allowed_origins
