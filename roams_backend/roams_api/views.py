from rest_framework import serializers, viewsets, filters, permissions
from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.reverse import reverse
from .permissions import IsFrontendApp

from .serializers import OPCUANodeSerializer, OpcUaClientConfigSerializer, OpcUaReadLogSerializer
from roams_opcua_mgr.models import OPCUANode, OpcUaClientConfig, OpcUaReadLog
from roams_opcua_mgr.opcua_client import get_total_active_stations, get_total_connected_stations

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
    filterset_fields = ['client_config', 'node', 'timestamp']
    search_fields = ['value']
    ordering_fields = ['timestamp']

class ActiveStationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OpcUaClientConfigSerializer
    permission_classes = [IsAuthenticated, IsFrontendApp]

    def get_queryset(self):
        return OpcUaClientConfig.objects.filter(active=True)
