"""ViewSets for Control State API endpoints"""

import uuid
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend

from roams_opcua_mgr.models import (
    ControlState, ControlStateHistory, ControlPermission, ControlStateRequest
)
from roams_api.control_serializers import (
    ControlStateSerializer, ControlStateHistorySerializer, ControlPermissionSerializer,
    ControlStateRequestSerializer, ControlStateChangeRequestSerializer,
    ControlStateConfirmationSerializer
)
# Lazy import to avoid early initialization:
# from roams_opcua_mgr.opcua_client import active_clients

import logging
logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class ControlStateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing and managing control states (boolean tags).
    
    Supports:
    - Listing all control states
    - Viewing individual control state
    - Requesting state changes (with confirmation if required)
    - Viewing history of state changes
    """
    
    queryset = ControlState.objects.all()
    serializer_class = ControlStateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tag_type', 'current_value', 'is_synced_with_plc']
    search_fields = ['node__tag_name', 'description']
    ordering_fields = ['tag_type', 'last_changed_at', 'danger_level']
    ordering = ['tag_type']
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def request_change(self, request, pk=None):
        """
        Request a change to the control state.
        
        POST /api/control-states/{id}/request_change/
        {
            "requested_value": true,
            "reason": "Starting pump for maintenance"
        }
        
        If requires_confirmation=True, returns a confirmation_token and pending request ID.
        If requires_confirmation=False, immediately executes the change.
        """
        control_state = self.get_object()
        
        # Check permissions
        if not control_state.can_change_state(request.user):
            return Response(
                {"detail": f"You don't have permission to control {control_state.node.tag_name}"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Parse request
        serializer = ControlStateChangeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        requested_value = serializer.validated_data['requested_value']
        reason = serializer.validated_data.get('reason', '')
        
        # Check rate limiting
        if control_state.is_rate_limited():
            seconds = round(control_state.get_time_until_allowed(), 1)
            return Response(
                {
                    "detail": f"This control is rate-limited. Wait {seconds}s before next change.",
                    "retry_after": seconds
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # If same value, don't do anything
        if control_state.current_value == requested_value:
            return Response(
                {"detail": f"Control already set to {requested_value}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ip_address = get_client_ip(request)
        
        # Create history record for the request
        ControlStateHistory.objects.create(
            control_state=control_state,
            change_type='requested',
            requested_by=request.user,
            previous_value=control_state.current_value,
            requested_value=requested_value,
            reason=reason,
            ip_address=ip_address
        )
        
        # If confirmation required, create pending request
        if control_state.requires_confirmation:
            confirmation_token = str(uuid.uuid4())
            expires_at = timezone.now() + timezone.timedelta(
                seconds=control_state.confirmation_timeout
            )
            
            pending_request = ControlStateRequest.objects.create(
                control_state=control_state,
                requested_by=request.user,
                requested_value=requested_value,
                reason=reason,
                status='pending',
                confirmation_token=confirmation_token,
                expires_at=expires_at,
                ip_address=ip_address
            )
            
            logger.warning(
                f"⚠️ [{control_state.node.tag_name}] Change requested: "
                f"{control_state.current_value} → {requested_value} by {request.user.username}"
            )
            
            return Response(
                {
                    "message": "Confirmation required",
                    "request_id": pending_request.id,
                    "confirmation_token": confirmation_token,
                    "expires_in_seconds": control_state.confirmation_timeout,
                    "danger_level": control_state.get_danger_level_display(),
                },
                status=status.HTTP_200_OK
            )
        
        # Otherwise, execute immediately
        return self._execute_change(control_state, requested_value, request.user, reason, ip_address)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def confirm_change(self, request):
        """
        Confirm a pending control state change using the confirmation token.
        
        POST /api/control-states/confirm_change/
        {
            "confirmation_token": "uuid-string"
        }
        """
        serializer = ControlStateConfirmationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        confirmation_token = serializer.validated_data['confirmation_token']
        pending_request = ControlStateRequest.objects.get(confirmation_token=confirmation_token)
        control_state = pending_request.control_state
        
        # Only admins can confirm
        if not request.user.is_staff:
            return Response(
                {"detail": "Only administrators can confirm control changes"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mark as confirmed
        pending_request.status = 'confirmed'
        pending_request.confirmed_by = request.user
        pending_request.confirmed_at = timezone.now()
        pending_request.save()
        
        logger.info(
            f"✅ [{control_state.node.tag_name}] Change confirmed by {request.user.username}: "
            f"{control_state.current_value} → {pending_request.requested_value}"
        )
        
        # Execute the change
        return self._execute_change(
            control_state,
            pending_request.requested_value,
            pending_request.requested_by,
            pending_request.reason,
            pending_request.ip_address,
            pending_request
        )
    
    def _execute_change(self, control_state, new_value, requested_by_user, reason, ip_address, pending_request=None):
        """Execute the actual control state change"""
        try:
            with transaction.atomic():
                # Get the OPC UA client handler
                try:
                    from roams_opcua_mgr.opcua_client import active_clients
                    client_handler = active_clients.get(control_state.node.client_config.station_name)
                except Exception:
                    client_handler = None
                
                if not client_handler:
                    error_msg = f"No active OPC UA client for {control_state.node.client_config.station_name}"
                    logger.error(f"❌ {error_msg}")
                    
                    ControlStateHistory.objects.create(
                        control_state=control_state,
                        change_type='failed',
                        requested_by=requested_by_user,
                        previous_value=control_state.current_value,
                        requested_value=new_value,
                        reason=reason,
                        error_message=error_msg,
                        ip_address=ip_address
                    )
                    
                    return Response(
                        {"detail": error_msg, "error": "client_not_available"},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )
                
                # Write to PLC
                success, message = client_handler.write_node_value(control_state.node, new_value)
                
                if not success:
                    # Log failure
                    ControlStateHistory.objects.create(
                        control_state=control_state,
                        change_type='failed',
                        requested_by=requested_by_user,
                        previous_value=control_state.current_value,
                        requested_value=new_value,
                        reason=reason,
                        error_message=message,
                        ip_address=ip_address
                    )
                    
                    if pending_request:
                        pending_request.status = 'failed'
                        pending_request.save()
                    
                    return Response(
                        {"detail": message, "error": "write_failed"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                # Update control state
                control_state.current_value = new_value
                control_state.plc_value = new_value
                control_state.is_synced_with_plc = True
                control_state.last_changed_by = requested_by_user
                control_state.save()
                
                # Log success
                ControlStateHistory.objects.create(
                    control_state=control_state,
                    change_type='executed',
                    requested_by=requested_by_user,
                    previous_value=not new_value,
                    requested_value=new_value,
                    final_value=new_value,
                    reason=reason,
                    ip_address=ip_address
                )
                
                logger.info(
                    f"🎯 [{control_state.node.tag_name}] State changed to {new_value} "
                    f"by {requested_by_user.username}"
                )
                
                return Response(
                    {
                        "message": f"Control state changed successfully",
                        "control_state": ControlStateSerializer(control_state, context={'request': self.request}).data,
                        "request_id": pending_request.id if pending_request else None,
                    },
                    status=status.HTTP_200_OK
                )
        
        except Exception as e:
            logger.exception(f"❌ Unexpected error executing control change: {e}")
            
            ControlStateHistory.objects.create(
                control_state=control_state,
                change_type='failed',
                requested_by=requested_by_user,
                previous_value=control_state.current_value,
                requested_value=new_value,
                reason=reason,
                error_message=str(e),
                ip_address=ip_address
            )
            
            return Response(
                {"detail": f"Error executing change: {str(e)}", "error": "execution_error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get change history for a control state"""
        control_state = self.get_object()
        history = control_state.history.all()[:50]  # Last 50 changes
        serializer = ControlStateHistorySerializer(history, many=True)
        return Response(serializer.data)


class ControlStateHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """View control state change history"""
    
    queryset = ControlStateHistory.objects.all()
    serializer_class = ControlStateHistorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['control_state', 'change_type', 'requested_by']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']


class ControlPermissionViewSet(viewsets.ModelViewSet):
    """Manage control permissions (admin only)"""
    
    queryset = ControlPermission.objects.all()
    serializer_class = ControlPermissionSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['user', 'control_state', 'permission_level', 'is_active']
    search_fields = ['user__username', 'control_state__node__tag_name']
    
    def perform_create(self, serializer):
        serializer.save(granted_by=self.request.user)


class ControlStateRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """View pending control state requests"""
    
    queryset = ControlStateRequest.objects.all()
    serializer_class = ControlStateRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['control_state', 'status', 'requested_by']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Users only see their own requests; admins see all"""
        if self.request.user.is_staff:
            return ControlStateRequest.objects.all()
        return ControlStateRequest.objects.filter(requested_by=self.request.user)
