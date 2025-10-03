# roams_api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token 
from roams_api import views
from .views import (
    OPCUANodeViewSet, 
    OpcUaClientConfigViewSet, 
    OpcUaReadLogViewSet, 
    UserViewSet,
    active_stations_summary,
    home,
    ActiveStationViewSet,
    current_user,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'opcua_node', OPCUANodeViewSet, basename='opcua_node')
router.register(r'clients', OpcUaClientConfigViewSet, basename='opcua_clientconfig')
router.register(r'read-logs', OpcUaReadLogViewSet, basename='read-logs')



urlpatterns = [
    path('', include(router.urls)),
    path('active-stations/', active_stations_summary, name='active-stations'),
    path('home/', home, name='api-home'),
    path("api-token-auth/", obtain_auth_token, name="api_token_auth"),
    path("user/", current_user, name="current-user"), 
]


