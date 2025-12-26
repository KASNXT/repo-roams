# roams_backend/roams_api/views.py
from rest_framework import serializers, viewsets, filters, permissions
from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.reverse import reverse
from .permissions import IsFrontendApp
from django.utils import timezone

from .serializers import OPCUANodeSerializer, OpcUaClientConfigSerializer, OpcUaReadLogSerializer
from roams_opcua_mgr.models import OPCUANode, OpcUaClientConfig, OpcUaReadLog, TagName, NotificationRecipient, ThresholdBreach
from roams_opcua_mgr.opcua_client import get_total_active_stations, get_total_connected_stations
from rest_framework import status
from roams_opcua_mgr.utils.server_uptime import calculate_uptime

# ----------------------------
# User Serializer & ViewSet
# ----------------------------
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'is_staff']

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]  # remove IsFrontendApp to allow DRF access

# ----------------------------
# Current user API
# ----------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

# ----------------------------
# API Root
# ----------------------------
@api_view(['GET'])
def home(request, format=None):
    total_active = get_total_active_stations()
    total_connected = get_total_connected_stations()

    return Response({
        'nodes': reverse('opcua_node-list', request=request, format=format),
        'clients': reverse('opcua_clientconfig-list', request=request, format=format),
        'read-logs': reverse('read-logs-list', request=request, format=format),
        'active-stations': reverse('active-stations', request=request, format=format),
        'summary': {
            'total_active_stations': total_active,
            'total_connected_stations': total_connected,
        }
    })

# ----------------------------
# Parameter Units API
# ----------------------------

@api_view(['GET'])
def tag_names(request):
    """
    Returns all tag names and their engineering units.
    Example: [{ "name": "flow rate", "tag_units": "m³/h" }, ...]
    """
    tags = TagName.objects.values("name", "tag_units")
    return Response(list(tags))

# ----------------------------
# Telemetry Data API (Final Fix)
# ----------------------------
from datetime import datetime
from dateutil import parser
from rest_framework import status
from django.utils import timezone

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsFrontendApp])
def telemetry_data(request):
    """
    Returns telemetry data filtered by station name and optional date range.
    Example frontend call:
      /api/telemetry/?station=station-alpha&from=2025-10-01T00:00:00Z&to=2025-10-02T00:00:00Z
    """
    station_name = request.GET.get("station")
    from_date = request.GET.get("from")
    to_date = request.GET.get("to")

    if not station_name:
        return Response({"error": "Missing required 'station' parameter"}, status=400)

    queryset = OpcUaReadLog.objects.select_related("node", "client_config")

    # Filter by station
    queryset = queryset.filter(client_config__station_name=station_name)

    # Date range
    if from_date and to_date:
        try:
            from_dt = parser.isoparse(from_date)
            to_dt = parser.isoparse(to_date)
            # Ensure datetimes are timezone-aware
            if from_dt.tzinfo is None:
                from_dt = timezone.make_aware(from_dt)
            if to_dt.tzinfo is None:
                to_dt = timezone.make_aware(to_dt)
            queryset = queryset.filter(timestamp__range=(from_dt, to_dt))
        except Exception as e:
            print("⚠️ Invalid date range:", e)
            return Response(
                {"error": f"Invalid date range format: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if not queryset.exists():
        return Response([], status=status.HTTP_200_OK)

    data = []
    for log in queryset.order_by("timestamp")[:5000]:
        if not log.node or not log.client_config:
            continue

        # ✅ Fix TagName serialization issue
        tag_value = None
        if hasattr(log.node.tag_name, "name"):  # If tag_name is a TagName object
            tag_value = log.node.tag_name.name
        else:
            tag_value = log.node.tag_name

        data.append({
            "timestamp": log.timestamp.isoformat(),
            "parameter": tag_value or log.node.add_new_tag_name or "Unknown",
            "value": log.value,
            "station": log.client_config.station_name,
        })

    return Response(data, status=status.HTTP_200_OK)



# ----------------------------
# Active Stations Summary
# ----------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsFrontendApp])
def active_stations_summary(request):
    return Response({
        "total_active_stations": get_total_active_stations(),
        "total_connected_stations": get_total_connected_stations(),
    })


# ----------------------------
# OPC UA ViewSets
# ----------------------------
class OPCUANodeViewSet(viewsets.ModelViewSet):
    queryset = OPCUANode.objects.all()
    serializer_class = OPCUANodeSerializer
    permission_classes = [IsAuthenticated, IsFrontendApp]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['client_config', 'tag_name', 'last_updated']
    search_fields = ['tag_name', 'add_new_tag_name']
    ordering_fields = ['last_updated', 'last_value']

    def get_queryset(self):
        qs = super().get_queryset()
        is_alarm = self.request.query_params.get("is_alarm")
        if is_alarm is not None:
            qs = qs.filter(is_alarm=is_alarm.lower() == "true")
        return qs


class OpcUaClientConfigViewSet(viewsets.ModelViewSet):
    queryset = OpcUaClientConfig.objects.all()
    serializer_class = OpcUaClientConfigSerializer
    permission_classes = [IsAuthenticated, IsFrontendApp]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['station_name', 'active', 'connection_status']
    search_fields = ['station_name', 'opcua_url']
    ordering_fields = ['station_name', 'last_connected']

class OpcUaReadLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OpcUaReadLog.objects.all().order_by('-timestamp')
    serializer_class = OpcUaReadLogSerializer
    permission_classes = [IsAuthenticated, IsFrontendApp]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['client_config', 'node','timestamp']
    search_fields = ['value']
    ordering_fields = ['timestamp']

class ActiveStationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OpcUaClientConfigSerializer
    permission_classes = [IsAuthenticated, IsFrontendApp]

    def get_queryset(self):
        return OpcUaClientConfig.objects.filter(active=True)
    
#------------------------
# system_uptime
#--------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def system_uptime(request):
    """
    Returns uptime percentage for all stations and the overall average.
    Example: /api/system-uptime/?days=7
    """
    try:
        days = int(request.GET.get("days", 30))  # Default to 30 days
        uptime_data = calculate_uptime(days=days)

        # Calculate system-wide average uptime
        if uptime_data:
            overall_uptime = round(sum(uptime_data.values()) / len(uptime_data), 2)
        else:
            overall_uptime = 0

        return Response(
            {
                "uptime": uptime_data,          # per-station uptime %
                "overall_uptime": overall_uptime  # average uptime %
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# THRESHOLD & BREACH MANAGEMENT ViewSets
# ============================================================================

from roams_opcua_mgr.models import OPCUANode, ThresholdBreach
from .serializers import TagThresholdSerializer, ThresholdBreachSerializer
from rest_framework.decorators import action


class TagThresholdViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing OPC UA node thresholds.
    Threshold fields are now part of OPCUANode model.
    Provides CRUD operations and breach statistics.
    
    Examples:
    - GET /api/thresholds/ - List all nodes with thresholds
    - GET /api/thresholds/1/ - Get specific node's thresholds
    - PATCH /api/thresholds/1/ - Update node's threshold settings
    
    Filters:
    - ?station=<station_name> - Filter by station
    - ?threshold_active=true|false - Filter by active status
    
    Permissions:
    - VIEW: IsAuthenticated (any user)
    - CREATE/UPDATE/DELETE: IsAdminUser (staff only)
    """
    queryset = OPCUANode.objects.select_related('client_config').filter(threshold_active=True)
    serializer_class = TagThresholdSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['client_config', 'threshold_active', 'severity']
    search_fields = ['tag_name__name', 'add_new_tag_name', 'node_id']
    ordering_fields = ['created_at', 'updated_at', 'severity']
    ordering = ['-updated_at']
    
    def get_permissions(self):
        """
        Override permissions based on action.
        Read operations: IsAuthenticated
        Write operations: IsAdminUser
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Optionally filter by station via query parameter.
        Example: /api/thresholds/?station=Station-01
        """
        queryset = super().get_queryset()
        station = self.request.query_params.get('station', None)
        if station:
            queryset = queryset.filter(client_config__station_name=station)
        return queryset
    
    @action(detail=True, methods=['get'])
    def breaches(self, request, pk=None):
        """
        Get all breach events for this node.
        Example: /api/thresholds/1/breaches/
        """
        node = self.get_object()
        breaches = ThresholdBreach.objects.filter(node=node).order_by('-timestamp')
        
        # Pagination support
        page = self.paginate_queryset(breaches)
        if page is not None:
            serializer = ThresholdBreachSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ThresholdBreachSerializer(breaches, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def breaches_24h(self, request, pk=None):
        """
        Get breach count for last 24 hours broken down by level.
        Example: /api/thresholds/1/breaches_24h/
        """
        from django.utils.timezone import now, timedelta
        
        node = self.get_object()
        cutoff = now() - timedelta(hours=24)
        
        total = ThresholdBreach.objects.filter(
            node=node,
            timestamp__gte=cutoff
        ).count()
        
        critical = ThresholdBreach.objects.filter(
            node=node,
            level="Critical",
            timestamp__gte=cutoff
        ).count()
        
        warning = ThresholdBreach.objects.filter(
            node=node,
            level="Warning",
            timestamp__gte=cutoff
        ).count()
        
        return Response({
            'total': total,
            'critical': critical,
            'warning': warning,
        })


class ThresholdBreachViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing and managing threshold breach events.
    
    Examples:
    - GET /api/breaches/ - List all breaches
    - GET /api/breaches/?acknowledged=false - List unacknowledged
    - PATCH /api/breaches/1/acknowledge/ - Mark as acknowledged
    """
    queryset = ThresholdBreach.objects.select_related('node', 'threshold').order_by('-timestamp')
    serializer_class = ThresholdBreachSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['node', 'threshold', 'level', 'acknowledged']
    ordering_fields = ['timestamp', 'level']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """
        Optionally filter by station via query parameter.
        Example: /api/breaches/?station=Station-01
        """
        queryset = super().get_queryset()
        station = self.request.query_params.get('station', None)
        if station:
            queryset = queryset.filter(node__client_config__station_name=station)
        return queryset
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """
        Mark a breach as acknowledged.
        Example: POST /api/breaches/1/acknowledge/
        """
        breach = self.get_object()
        breach.acknowledged = True
        breach.acknowledged_by = request.user.username
        breach.acknowledged_at = timezone.now()
        breach.save()
        
        serializer = self.get_serializer(breach)
        return Response(
            {
                'message': 'Breach acknowledged',
                'breach': serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def unacknowledged(self, request):
        """
        Get all unacknowledged breaches.
        Example: GET /api/breaches/unacknowledged/
        """
        breaches = self.get_queryset().filter(acknowledged=False)
        
        page = self.paginate_queryset(breaches)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(breaches, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Get recent breaches (last 50).
        Example: GET /api/breaches/recent/
        """
        hours = int(request.query_params.get('hours', 24))
        from django.utils.timezone import now, timedelta
        
        cutoff = now() - timedelta(hours=hours)
        breaches = self.get_queryset().filter(timestamp__gte=cutoff)[:50]
        
        serializer = self.get_serializer(breaches, many=True)
        return Response(serializer.data)

# ----------------------------
# User Profile ViewSet
# ----------------------------
from .serializers import UserProfileSerializer, NotificationRecipientSerializer
from roams_api.models import UserProfile

class UserProfileViewSet(viewsets.ModelViewSet):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own profile, staff can see all"""
        if self.request.user.is_staff:
            return UserProfile.objects.all()
        return UserProfile.objects.filter(user=self.request.user)


# ----------------------------
# Notification Recipient ViewSet
# ----------------------------
class NotificationRecipientViewSet(viewsets.ModelViewSet):
    queryset = NotificationRecipient.objects.all()
    serializer_class = NotificationRecipientSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['node', 'user', 'alert_level', 'email_enabled', 'sms_enabled']
    search_fields = ['user__username', 'user__email', 'node__tag_name__name', 'node__client_config__station_name']
    ordering_fields = ['created_at', 'user__username']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter by current user's subscriptions if not staff"""
        queryset = NotificationRecipient.objects.select_related('node', 'user', 'node__client_config')
        
        if self.request.user.is_staff:
            return queryset
        
        # Non-staff users can only see their own subscriptions
        return queryset.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Ensure staff permission for creating subscriptions"""
        if not self.request.user.is_staff:
            raise permissions.PermissionDenied("Only staff can create notification subscriptions")
        serializer.save()
    
    def perform_update(self, serializer):
        """Ensure staff permission for updating subscriptions"""
        if not self.request.user.is_staff:
            raise permissions.PermissionDenied("Only staff can modify notification subscriptions")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Ensure staff permission for deleting subscriptions"""
        if not self.request.user.is_staff:
            raise permissions.PermissionDenied("Only staff can delete notification subscriptions")
        instance.delete()