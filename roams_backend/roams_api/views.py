# roams_backend/roams_api/views.py
from rest_framework import serializers, viewsets, filters, permissions
from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.reverse import reverse
from .permissions import IsFrontendApp, IsAdminUser as CustomIsAdminUser, IsAdminOrReadOnly
from django.utils import timezone
from django.utils.timezone import now
import logging

from roams_opcua_mgr.models import OpcUaWriteLog, ControlState

# ✅ FIX 1: Add missing imports for write operation
from roams_opcua_mgr.opcua_client import get_active_client
from roams_opcua_mgr.write_data import write_station_node

logger = logging.getLogger(__name__)

from .serializers import (
    OPCUANodeSerializer, OpcUaClientConfigSerializer, OpcUaReadLogSerializer,
    AlarmLogSerializer, AlarmRetentionPolicySerializer
)
from roams_opcua_mgr.models import (
    OPCUANode, OpcUaClientConfig, OpcUaReadLog, TagName, NotificationRecipient, 
    ThresholdBreach, AlarmLog, AlarmRetentionPolicy
)
from rest_framework import status
from rest_framework.exceptions import PermissionDenied

# Lazy import to avoid early initialization:
# from roams_opcua_mgr.opcua_client import get_total_active_stations, get_total_connected_stations
# from roams_opcua_mgr.utils.server_uptime import calculate_uptime

# ----------------------------
# User Serializer & ViewSet
# ----------------------------
class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'is_staff', 'role']
    
    def get_role(self, obj):
        """Get role from UserProfile"""
        try:
            return obj.profile.role
        except:
            # Fallback: create profile with default 'viewer' role if missing
            from roams_api.models import UserProfile
            profile, created = UserProfile.objects.get_or_create(
                user=obj,
                defaults={'role': 'viewer'}
            )
            return profile.role

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing and managing users.
    
    Only admins can create/update/delete users.
    Regular users can only view the user list and their own profile.
    
    Examples:
    - GET /api/users/ - List all users (any authenticated user)
    - POST /api/users/ - Create new user (admin only)
    - PATCH /api/users/{id}/ - Update user role (admin only)
    - DELETE /api/users/{id}/ - Delete user (admin only)
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'date_joined', 'last_login']
    
    def get_permissions(self):
        """
        Override permissions based on action.
        Only admins can create, update, or delete users.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'set_user_role', 'activate', 'deactivate']:
            return [IsAuthenticated(), CustomIsAdminUser()]
        return [IsAuthenticated(), IsAdminOrReadOnly()]
    
    def create(self, request, *args, **kwargs):
        """Create a new user (admin only)"""
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role', 'viewer')
        is_active = request.data.get('is_active', True)
        
        if not username or not email or not password:
            return Response(
                {'error': 'username, email, and password are required'},
                status=400
            )
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': f'User with username "{username}" already exists'},
                status=400
            )
        
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': f'User with email "{email}" already exists'},
                status=400
            )
        
        # Validate role
        valid_roles = ['viewer', 'technician', 'operator', 'admin', 'superuser']
        if role not in valid_roles:
            return Response(
                {'error': f'Invalid role. Must be one of: {valid_roles}'},
                status=400
            )
        
        # Set is_staff based on role
        is_staff = role in ['admin', 'superuser']
        
        # Create the user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=is_staff,
            is_active=is_active,
        )
        
        # Create or update user profile with role
        from roams_api.models import UserProfile
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.role = role
        profile.save()
        
        serializer = self.get_serializer(user)
        return Response(
            {'message': f'User {username} created successfully with role {role}', 'user': serializer.data},
            status=201
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CustomIsAdminUser])
    def set_user_role(self, request, pk=None):
        """Set user role to viewer/technician/operator/admin/superuser (admin only)"""
        user = self.get_object()
        new_role = request.data.get('role')
        
        if new_role is None:
            return Response(
                {'error': 'role parameter is required'},
                status=400
            )
        
        valid_roles = ['viewer', 'technician', 'operator', 'admin', 'superuser']
        if new_role not in valid_roles:
            return Response(
                {'error': f'Invalid role. Must be one of: {valid_roles}'},
                status=400
            )
        
        # Update or create user profile with new role
        from roams_api.models import UserProfile
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.role = new_role
        profile.save()
        
        
        return Response(
            {
                'message': f'User {user.username} role changed to {new_role}',
                'role': new_role,
                'is_staff': user.is_staff,
            },
            status=200
        )
    
    @action(detail=False, methods=['get', 'post'], permission_classes=[IsAuthenticated, CustomIsAdminUser])
    def permissions_matrix(self, request):
        """Get or update the permissions matrix for roles"""
        if request.method == 'GET':
            # Return default permissions matrix
            permissions_matrix = {
                'permissions': [
                    'View Dashboard',
                    'Modify Settings',
                    'Control Equipment',
                    'View Reports',
                    'User Management',
                    'System Logs',
                    'View Alarms',
                    'Acknowledge Alarms',
                ],
                'roles': {
                    'viewer': [True, False, False, True, False, False, True, False],
                    'technician': [True, False, True, True, False, False, True, True],
                    'operator': [True, True, True, True, False, True, True, True],
                    'admin': [True, True, True, True, True, True, True, True],
                    'superuser': [True, True, True, True, True, True, True, True],
                }
            }
            return Response(permissions_matrix, status=200)
        
        elif request.method == 'POST':
            # Update permissions matrix (for future use)
            data = request.data
            # This could store custom permissions in future
            return Response(
                {'message': 'Permissions matrix updated'},
                status=200
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CustomIsAdminUser])
    def activate(self, request, pk=None):
        """Activate a user account (admin only)"""
        user = self.get_object()
        user.is_active = True
        user.save()
        
        serializer = self.get_serializer(user)
        return Response({
            'message': f'User {user.username} activated',
            'user': serializer.data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CustomIsAdminUser])
    def deactivate(self, request, pk=None):
        """Deactivate a user account (admin only)"""
        user = self.get_object()
        user.is_active = False
        user.save()
        
        serializer = self.get_serializer(user)
        return Response({
            'message': f'User {user.username} deactivated',
            'user': serializer.data
        })

# ----------------------------
# Current user API
# ----------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

# ----------------------------
# Health Check API (No Auth Required)
# ----------------------------
@api_view(['GET'])
@permission_classes([])  # No authentication required
def health_check(request):
    """
    Simple health check endpoint for network configuration testing.
    Returns OK status if backend is accessible.
    """
    return Response({
        'status': 'ok',
        'message': 'Backend server is running',
        'timestamp': timezone.now().isoformat()
    })

# ----------------------------
# API Root
# ----------------------------
@api_view(['GET'])
def home(request, format=None):
    try:
        from roams_opcua_mgr.opcua_client import get_total_active_stations, get_total_connected_stations
        total_active = get_total_active_stations()
        total_connected = get_total_connected_stations()
    except Exception:
        total_active = 0
        total_connected = 0

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
# Telemetry Data API (Enhanced with Pagination)
# ----------------------------
from datetime import datetime
from dateutil import parser
from rest_framework import status
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination

class TelemetryPagination(PageNumberPagination):
    page_size = 500
    page_size_query_param = 'page_size'
    max_page_size = 5000

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsFrontendApp])
def telemetry_data(request):
    """
    Returns telemetry data filtered by station name and optional date range.
    ✅ Now supports pagination for large datasets
    
    Query Parameters:
    - station: Station name (required)
    - from: ISO datetime string (optional)
    - to: ISO datetime string (optional)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 100, max: 1000)
    
    Example frontend call:
      /api/telemetry/?station=station-alpha&from=2025-10-01T00:00:00Z&to=2025-10-02T00:00:00Z&page=1&page_size=100
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

    # ✅ FIX 3: Apply pagination instead of hard limit
    queryset = queryset.order_by("timestamp")
    
    # Get pagination settings
    paginator = TelemetryPagination()
    page = paginator.paginate_queryset(queryset, request)
    
    if page is not None:
        data = []
        for log in page:
            if not log.node or not log.client_config:
                continue

            # ✅ FIX 4: Simplified tag_value handling (already correct)
            tag_value = None
            if log.node.tag_name and hasattr(log.node.tag_name, "name"):
                tag_value = log.node.tag_name.name
            elif log.node.tag_name:
                tag_value = str(log.node.tag_name)
            else:
                tag_value = log.node.node_id or "Unknown"

            data.append({
                "timestamp": log.timestamp.isoformat(),
                "parameter": tag_value or log.node.add_new_tag_name or "Unknown",
                "value": log.value,
                "station": log.client_config.station_name,
            })
        
        return paginator.get_paginated_response(data)
    
    # Fallback if pagination fails
    data = []
    for log in queryset[:5000]:  # Keep safety limit
        if not log.node or not log.client_config:
            continue

        tag_value = None
        if log.node.tag_name and hasattr(log.node.tag_name, "name"):
            tag_value = log.node.tag_name.name
        elif log.node.tag_name:
            tag_value = str(log.node.tag_name)
        else:
            tag_value = log.node.node_id or "Unknown"

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
    try:
        from roams_opcua_mgr.opcua_client import get_total_active_stations, get_total_connected_stations
        total_active = get_total_active_stations()
        total_connected = get_total_connected_stations()
    except Exception:
        total_active = 0
        total_connected = 0
    
    return Response({
        "total_active_stations": total_active,
        "total_connected_stations": total_connected,
    })


# ----------------------------
# OPC UA ViewSets
# ----------------------------
class OPCUANodeViewSet(viewsets.ModelViewSet):
    queryset = OPCUANode.objects.all()
    serializer_class = OPCUANodeSerializer
    permission_classes = [IsAuthenticated, IsFrontendApp]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'client_config',
        'client_config__station_name',
        'tag_name',
        'last_updated',
        'data_type',
        'is_boolean_control',
    ]
    search_fields = ['tag_name', 'add_new_tag_name']
    ordering_fields = ['last_updated', 'last_value']

    def get_queryset(self):
        qs = super().get_queryset()
        
        is_control = self.request.query_params.get("is_control")
        if is_control is not None:
            qs = qs.filter(is_boolean_control=is_control.lower() == "true")
        
        data_type = self.request.query_params.get("data_type")
        if data_type:
            qs = qs.filter(data_type=data_type)
        
        is_alarm = self.request.query_params.get("is_alarm")
        if is_alarm is not None:
            qs = qs.filter(is_alarm=is_alarm.lower() == "true")
        
        return qs

    @action(detail=True, methods=['post'])
    def write(self, request, pk=None):
        """Write a value to an OPC UA node (supports Boolean, Integer, Float)"""
        try:
            logger.info(f"📝 Write request started for node pk={pk}")
            
            # Step 1: Get the node
            try:
                node = self.get_object()
                logger.info(f"✅ Found node: {node.node_id} ({node.tag_name})")
            except Exception as e:
                logger.error(f"❌ Node not found: {e}")
                return Response(
                    {"error": f"Node with ID {pk} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            
            # Step 2: Get request data
            value = request.data.get('value')
            command = request.data.get('command', 'WRITE')
            
            logger.info(f"📥 Request data: value={value}, command={command}")
            
            if value is None:
                logger.error("❌ Missing 'value' in request")
                return Response(
                    {"error": "Missing 'value' parameter"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Step 3: Get node data type
            data_type = getattr(node, 'data_type', 'Unknown')
            logger.info(f"📊 Node: {node.tag_name}, Type: {data_type}, NodeID: {node.node_id}")
            
            # Step 4: Validate access level (allow Read_write and Write_only)
            access_level = getattr(node, 'access_level', 'Read_write')
            if access_level not in ["Read_write", "Write_only"]:
                logger.error(f"❌ Node {node.node_id} access level is {access_level}")
                return Response(
                    {"error": f"Node is not writable (access level: {access_level})"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            
            # Step 5: Get station config
            station = getattr(node, 'client_config', None)
            if not station:
                logger.error(f"❌ Node {node.node_id} has no station configured")
                return Response(
                    {"error": "Node has no station configured"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            station_name = getattr(station, 'station_name', None)
            logger.info(f"✅ Station: {station_name}")
            
            # Step 6: Check station is active
            if not getattr(station, 'active', False):
                logger.error(f"❌ Station {station_name} is inactive")
                return Response(
                    {"error": f"Station {station_name} is inactive. Please activate it first."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            
            # Step 7: Get active OPC UA client (UaExpert-style connection check)
            logger.info(f"🔍 Getting active client for {station_name}")
            try:
                client = get_active_client(station)
                if not client:
                    logger.error(f"❌ No active client for {station_name}")
                    return Response(
                        {"error": f"Station {station_name} is not connected. Please check OPC UA server."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )
                logger.info(f"✅ Got active client for {station_name}")
            except Exception as e:
                logger.error(f"❌ Error getting active client: {e}", exc_info=True)
                return Response(
                    {"error": f"Failed to connect to OPC UA server: {str(e)}"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            
            # Step 8: Convert value based on data type (UaExpert-style type handling)
            try:
                if data_type == "Boolean":
                    write_value = bool(int(value))
                    logger.info(f"✅ Boolean: {value} → {write_value}")
                elif data_type in ["Int16", "Int32", "Int64", "UInt16", "UInt32", "UInt64", "Integer", "Byte"]:
                    write_value = int(value)
                    logger.info(f"✅ Integer: {value} → {write_value}")
                elif data_type in ["Float", "Double"]:
                    write_value = float(value)
                    logger.info(f"✅ Float: {value} → {write_value}")
                else:
                    write_value = value
                    logger.info(f"⚠️ Unknown type {data_type}, using raw value: {write_value}")
            except (TypeError, ValueError) as e:
                logger.error(f"❌ Cannot convert value {value} to {data_type}: {e}")
                return Response(
                    {"error": f"Invalid value '{value}' for data type {data_type}: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Step 9: Write to OPC UA node (like UaExpert does)
            logger.info(f"📤 Writing to M241 PLC: {node.tag_name} = {write_value}")
            try:
                success = write_station_node(client, node, write_value, command)
                if not success:
                    logger.error(f"❌ Write failed for {node.node_id}")
                    return Response(
                        {"error": f"Write operation failed for {node.tag_name}. Check server permissions."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                logger.info(f"✅ Successfully wrote to {node.tag_name}")
            except Exception as e:
                logger.error(f"❌ Write exception: {e}", exc_info=True)
                return Response(
                    {"error": f"Write failed: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            
            # Update ControlState to track current value (only for boolean controls)
            if data_type == "Boolean" and getattr(node, 'is_boolean_control', False):
                try:
                    control_state, created = ControlState.objects.get_or_create(
                        node=node,
                        defaults={
                            'current_value': write_value,
                            'last_changed_by': request.user if request.user.is_authenticated else None
                        }
                    )
                    
                    # Only update if value actually changed
                    if not created and control_state.current_value != write_value:
                        control_state.current_value = write_value
                        control_state.last_changed_by = request.user if request.user.is_authenticated else None
                        control_state.save()
                        logger.info(f"✅ Updated ControlState for node {node.id}")
                    elif created:
                        logger.info(f"✅ Created ControlState for node {node.id}")
                    else:
                        logger.info(f"ℹ️ ControlState unchanged for node {node.id}")
                        
                except Exception as e:
                    logger.warning(f"⚠️ Could not update ControlState: {e}")
                    # Don't fail the request since the write succeeded
            
            logger.info(f"✅ Write completed successfully for node {node.node_id}")
            
            # Success response
            return Response({
                "success": True,
                "message": f"✅ Successfully wrote {write_value} to {node.tag_name}",
                "node_id": node.node_id,
                "tag_name": node.tag_name,
                "value": write_value,
                "data_type": data_type,
                "command": command,
                "timestamp": now().isoformat(),
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"❌ Unexpected error in write endpoint: {str(e)}", exc_info=True)
            return Response(
                {"error": f"Internal server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class OpcUaClientConfigViewSet(viewsets.ModelViewSet):
    queryset = OpcUaClientConfig.objects.all()
    serializer_class = OpcUaClientConfigSerializer
    permission_classes = [IsAuthenticated, IsFrontendApp]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['station_name', 'active', 'connection_status']
    search_fields = ['station_name', 'opcua_url']
    ordering_fields = ['station_name', 'last_connected']

class OpcUaReadLogViewSet(viewsets.ReadOnlyModelViewSet):
    # ⚡ Performance: Use select_related to reduce database queries
    queryset = OpcUaReadLog.objects.select_related('client_config', 'node').all().order_by('-timestamp')
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
        from roams_opcua_mgr.utils.server_uptime import calculate_uptime
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


#------------------------
# uptime_trend_graph
#--------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def uptime_trend_graph(request):
    """
    Returns uptime trend data for graph visualization.
    Shows how long Django server has been running + hourly station activity.
    
    Query Parameters:
    - hours: Number of hours to look back (default: 24)
    
    Example: /api/uptime-trend/?hours=24
    """
    try:
        from roams_opcua_mgr.utils.uptime_trend import get_combined_uptime_data
        
        hours = int(request.GET.get("hours", 24))
        if hours < 1:
            hours = 24
        
        trend_data = get_combined_uptime_data(hours=hours)
        
        return Response(
            trend_data,
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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
        station = self.request.query_params.get('station', None)  # type: ignore
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


class ThresholdBreachViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing and managing threshold breach events.
    
    Examples:
    - GET /api/breaches/ - List all breaches
    - GET /api/breaches/?acknowledged=false - List unacknowledged
    - POST /api/breaches/1/acknowledge/ - Mark as acknowledged
    - POST /api/breaches/1/dismiss/ - Dismiss a breach
    """
    # ⚡ Performance: Use select_related to reduce database queries
    queryset = ThresholdBreach.objects.select_related('node', 'node__client_config').order_by('-timestamp')
    serializer_class = ThresholdBreachSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['node', 'level', 'acknowledged']
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
        try:
            breach = self.get_object()
            breach.acknowledged = True
            breach.acknowledged_by = request.user.username
            breach.acknowledged_at = timezone.now()
            breach.save()
            
            serializer = self.get_serializer(breach)
            return Response(
                {
                    'message': 'Breach acknowledged successfully',
                    'breach': serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to acknowledge alarm: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post', 'delete'])
    def dismiss(self, request, pk=None):
        """
        Dismiss/delete a breach.
        Example: DELETE /api/breaches/1/dismiss/ or POST /api/breaches/1/dismiss/
        """
        try:
            breach = self.get_object()
            breach_id = breach.id
            breach.delete()
            
            return Response(
                {
                    'message': f'Alarm dismissed successfully',
                    'breach_id': breach_id
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to dismiss alarm: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
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
            raise PermissionDenied("Only staff can create notification subscriptions")
        serializer.save()
    
    def perform_update(self, serializer):
        """Ensure staff permission for updating subscriptions"""
        if not self.request.user.is_staff:
            raise PermissionDenied("Only staff can modify notification subscriptions")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Ensure staff permission for deleting subscriptions"""
        if not self.request.user.is_staff:
            raise PermissionDenied("Only staff can delete notification subscriptions")
        instance.delete()


# ============== ALARM VIEWSETS ==============

class AlarmLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for reading and managing alarm logs.
    Provides filtering by station, severity, and date range.
    Allows acknowledgement and dismissal of alarms.
    """
    serializer_class = AlarmLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['station_name', 'severity', 'acknowledged', 'timestamp']
    search_fields = ['node__tag_name__name', 'message', 'station_name']
    ordering_fields = ['timestamp', 'severity']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Get alarm logs, optionally filtered by date range"""
        queryset = AlarmLog.objects.select_related('node').order_by('-timestamp')
        
        # Optional date filtering
        from dateutil import parser
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        
        if from_date:
            try:
                from_dt = parser.parse(from_date)
                queryset = queryset.filter(timestamp__gte=from_dt)
            except ValueError:
                pass
        
        if to_date:
            try:
                to_dt = parser.parse(to_date)
                queryset = queryset.filter(timestamp__lte=to_dt)
            except ValueError:
                pass
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """
        Mark an alarm as acknowledged.
        Example: POST /api/alarms/1/acknowledge/
        """
        try:
            alarm = self.get_object()
            alarm.acknowledged = True
            alarm.save()
            
            serializer = self.get_serializer(alarm)
            return Response(
                {
                    'message': 'Alarm acknowledged successfully',
                    'alarm': serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to acknowledge alarm: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post', 'delete'])
    def dismiss(self, request, pk=None):
        """
        Dismiss/delete an alarm.
        Example: DELETE /api/alarms/1/dismiss/ or POST /api/alarms/1/dismiss/
        """
        try:
            alarm = self.get_object()
            alarm_id = alarm.id
            alarm.delete()
            
            return Response(
                {
                    'message': 'Alarm dismissed successfully',
                    'alarm_id': alarm_id
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to dismiss alarm: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class AlarmRetentionPolicyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing alarm retention policy.
    Only staff users can view and modify retention settings.
    """
    queryset = AlarmRetentionPolicy.objects.all()
    serializer_class = AlarmRetentionPolicySerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_object(self):
        """Always return the default retention policy (id=1)"""
        return AlarmRetentionPolicy.get_policy()
    
    def list(self, request, *args, **kwargs):
        """Override list to return single object"""
        policy = self.get_object()
        serializer = self.get_serializer(policy)
        return Response(serializer.data)
