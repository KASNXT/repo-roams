"""
URL configuration for roams_pro project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from roams_api.views import home
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth.views import LogoutView
from roams_opcua_mgr.views import ForceDashboardLoginView
from django.shortcuts import redirect
from rest_framework.authtoken.views import obtain_auth_token  # ✅ import DRF's token view

urlpatterns = [
    path('admin/', admin.site.urls),

    # Login & Logout
    path("login/", ForceDashboardLoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(next_page="/login/"), name="logout"),

    # Redirect root to login
    path("", lambda request: redirect("/login/")),

    # API
    path('api/', include('roams_api.urls')),
    path("home/", home, name="home"),

    # Auth token endpoint (only once!)
    path("api-token-auth/", obtain_auth_token, name="api_token_auth"),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
