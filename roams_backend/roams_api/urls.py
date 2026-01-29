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
    health_check,
    ActiveStationViewSet,
    current_user,
    tag_names,
    telemetry_data,
    TagThresholdViewSet,
    ThresholdBreachViewSet,
    UserProfileViewSet,
    NotificationRecipientViewSet,
    AlarmLogViewSet,
    AlarmRetentionPolicyViewSet,
)
from .control_viewsets import (
    ControlStateViewSet,
    ControlStateHistoryViewSet,
    ControlPermissionViewSet,
    ControlStateRequestViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'user-profiles', UserProfileViewSet, basename='user-profile')
router.register(r'notification-recipients', NotificationRecipientViewSet, basename='notification-recipient')
router.register(r'control-states', ControlStateViewSet, basename='control-state')
router.register(r'control-state-history', ControlStateHistoryViewSet, basename='control-state-history')
router.register(r'control-permissions', ControlPermissionViewSet, basename='control-permission')
router.register(r'control-state-requests', ControlStateRequestViewSet, basename='control-state-request')
router.register(r'opcua_node', OPCUANodeViewSet, basename='opcua_node')
router.register(r'opcua_clientconfig', OpcUaClientConfigViewSet, basename='opcua_clientconfig')
router.register(r'opcua_readlog', OpcUaReadLogViewSet, basename='read-logs')
router.register(r'thresholds', TagThresholdViewSet, basename='threshold')
router.register(r'breaches', ThresholdBreachViewSet, basename='breach')
router.register(r'alarms', AlarmLogViewSet, basename='alarm')
router.register(r'alarm-retention-policy', AlarmRetentionPolicyViewSet, basename='alarm-retention-policy')



urlpatterns = [
    path('', include(router.urls)),
    path('health/', health_check, name='health-check'),
    path('active-stations/', active_stations_summary, name='active-stations'),
    path('home/', home, name='api-home'),
    path("api-token-auth/", obtain_auth_token, name="api_token_auth"),
    path("user/", current_user, name="current-user"), 
    path('tag-names/', views.tag_names, name='tag-names'),  # New endpoint for Tag Names
    path("telemetry/", telemetry_data, name="telemetry-data"),
    path("system-uptime/", views.system_uptime, name="system-uptime"),
    path("uptime-trend/", views.uptime_trend_graph, name="uptime-trend"),  # New uptime trend endpoint
]





