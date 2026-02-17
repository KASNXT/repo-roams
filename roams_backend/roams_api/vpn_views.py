# roams_api/vpn_views.py
"""
VPN Server Monitoring Views
Provides endpoints to monitor OpenVPN and L2TP/IPSec connections
Admin-only access for security
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdminUser
from django.utils import timezone
import subprocess
import re
from datetime import datetime, timedelta


class VPNMonitorViewSet(viewsets.ViewSet):
    """
    ViewSet for monitoring VPN server connections.
    Supports OpenVPN and L2TP/IPSec.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=['get'])
    def openvpn_status(self, request):
        """
        Get OpenVPN server status and connected clients.
        Reads from OpenVPN status file or management interface.
        """
        try:
            # Try to read OpenVPN status file (common locations)
            status_files = [
                '/var/log/openvpn/openvpn-status.log',
                '/var/log/openvpn-status.log',
                '/etc/openvpn/openvpn-status.log',
            ]
            
            status_content = None
            for status_file in status_files:
                try:
                    with open(status_file, 'r') as f:
                        status_content = f.read()
                    break
                except FileNotFoundError:
                    continue
            
            if not status_content:
                return Response({
                    'server_running': False,
                    'clients': [],
                    'message': 'OpenVPN status file not found. Check if OpenVPN is installed and running.'
                })
            
            # Parse OpenVPN status file
            clients = []
            lines = status_content.split('\n')
            
            for line in lines:
                # Modern OpenVPN format: CLIENT_LIST,name,real_addr,vpn_addr,ipv6,rx,tx,connected_since,timestamp,username,client_id,peer_id,cipher
                if line.startswith('CLIENT_LIST,'):
                    parts = line.split(',')
                    if len(parts) >= 8:  # Minimum required fields
                        try:
                            # Extract real IP (remove port if present)
                            real_addr = parts[2].split(':')[0] if ':' in parts[2] else parts[2]
                            
                            clients.append({
                                'name': parts[1].strip(),  # Common Name
                                'real_address': parts[2].strip(),  # Real Address:Port
                                'real_ip': real_addr,  # IP only without port
                                'vpn_address': parts[3].strip(),  # VPN IP
                                'bytes_received': int(parts[5]) if parts[5].isdigit() else 0,
                                'bytes_sent': int(parts[6]) if parts[6].isdigit() else 0,
                                'connected_since': parts[7].strip(),  # Timestamp string
                                'connected_timestamp': int(parts[8]) if len(parts) > 8 and parts[8].isdigit() else 0,
                                'encryption': parts[12].strip() if len(parts) > 12 and parts[12] else 'Unknown',  # Cipher
                            })
                        except (IndexError, ValueError) as e:
                            # Skip malformed lines
                            continue
                
                # Legacy OpenVPN format fallback
                elif line.startswith('Common Name,Real Address'):
                    # Switch to legacy parsing mode
                    client_section = True
                    continue
                elif 'ROUTING TABLE' in line:
                    break
            
            return Response({
                'server_running': True,
                'clients': clients,
                'total_clients': len(clients),
                'last_updated': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response({
                'error': str(e),
                'server_running': False,
                'clients': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def l2tp_status(self, request):
        """
        Get L2TP/IPSec server status and connected clients.
        Uses xl2tpd control or ipsec status commands.
        """
        try:
            from roams_opcua_mgr.models import OpcUaClientConfig
            
            clients = []
            
            # Get IPSec tunnel information for duration tracking
            ipsec_tunnels = {}
            try:
                result = subprocess.run(
                    ['ipsec', 'statusall'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0:
                    # Parse IPSec status for connection establishment times
                    # Example: "road-warrior[3]: ESTABLISHED 2 hours ago, 10.99.0.2[%any]...144.91.79.167[144.91.79.167]"
                    for line in result.stdout.split('\n'):
                        if 'ESTABLISHED' in line:
                            # Extract client IP and duration
                            client_match = re.search(r'(\d+\.\d+\.\d+\.\d+)\[', line)
                            time_match = re.search(r'ESTABLISHED\s+(.+?),', line)
                            
                            if client_match and time_match:
                                client_ip = client_match.group(1)
                                duration_str = time_match.group(1).strip()
                                ipsec_tunnels[client_ip] = {
                                    'duration': duration_str,
                                    'established': duration_str
                                }
            except (FileNotFoundError, subprocess.TimeoutExpired):
                pass
            
            # Try to get PPP connections (L2TP uses PPP)
            try:
                result = subprocess.run(
                    ['ip', 'addr', 'show'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0:
                    # Parse ip addr output for ppp interfaces
                    lines = result.stdout.split('\n')
                    for i, line in enumerate(lines):
                        # Look for ppp interfaces: "125: ppp0: <POINTOPOINT..."
                        if re.match(r'^\d+: ppp\d+:', line):
                            # Next line usually has: "inet 10.99.0.1 peer 10.99.0.2/32"
                            if i + 2 < len(lines):
                                inet_line = lines[i + 2]
                                match = re.search(r'inet (\d+\.\d+\.\d+\.\d+) peer (\d+\.\d+\.\d+\.\d+)', inet_line)
                                if match:
                                    server_ip = match.group(1)
                                    client_ip = match.group(2)
                                    
                                    # Try to find station name by matching VPN IP
                                    station_name = 'L2TP Station'
                                    try:
                                        # Check if any station has this VPN IP in its configuration
                                        station = OpcUaClientConfig.objects.filter(
                                            endpoint_url__contains=client_ip
                                        ).first()
                                        if station:
                                            station_name = station.station_name
                                    except:
                                        pass
                                    
                                    # Get duration from IPSec tunnel info if available
                                    duration = ipsec_tunnels.get(client_ip, {}).get('duration', None)
                                    
                                    clients.append({
                                        'name': station_name,
                                        'ip_address': client_ip,
                                        'vpn_address': client_ip,
                                        'status': 'ESTABLISHED',
                                        'protocol': 'L2TP/IPSec',
                                        'encryption': 'IPSec',
                                        'duration': duration,
                                        'connected_since': ipsec_tunnels.get(client_ip, {}).get('established'),
                                    })
            except FileNotFoundError:
                pass
            except subprocess.TimeoutExpired:
                pass
            
            # Try xl2tpd status
            try:
                # Check xl2tpd process
                result = subprocess.run(
                    ['pgrep', 'xl2tpd'],
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                server_running = result.returncode == 0
            except:
                server_running = False
            
            return Response({
                'server_running': server_running,
                'clients': clients,
                'total_clients': len(clients),
                'last_updated': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response({
                'error': str(e),
                'server_running': False,
                'clients': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def all_connections(self, request):
        """
        Get all VPN connections (OpenVPN + L2TP) in a unified format.
        """
        try:
            # Get OpenVPN connections
            openvpn_response = self.openvpn_status(request)
            openvpn_clients = openvpn_response.data.get('clients', [])
            
            # Get L2TP connections
            l2tp_response = self.l2tp_status(request)
            l2tp_clients = l2tp_response.data.get('clients', [])
            
            # Combine and format
            all_clients = []
            
            for client in openvpn_clients:
                # Calculate connection duration in seconds
                duration_seconds = 0
                if client.get('connected_timestamp'):
                    try:
                        from datetime import datetime
                        connected_ts = int(client['connected_timestamp'])
                        current_ts = int(datetime.now().timestamp())
                        duration_seconds = current_ts - connected_ts
                    except:
                        pass
                
                all_clients.append({
                    'id': f'openvpn_{client["name"]}',
                    'name': client['name'],
                    'ip_address': client.get('real_ip', client.get('real_address', '').split(':')[0]),
                    'vpn_ip': client.get('vpn_address', 'N/A'),
                    'vpn_type': 'OpenVPN',
                    'connected_since': client.get('connected_since'),
                    'duration_seconds': duration_seconds,
                    'bytes_received': client.get('bytes_received', 0),
                    'bytes_sent': client.get('bytes_sent', 0),
                    'encryption': client.get('encryption', 'Unknown'),
                    'status': 'Connected',
                })
            
            for client in l2tp_clients:
                # Parse duration string if available
                duration_seconds = 0
                duration_str = client.get('duration', 'N/A')
                connected_since = client.get('connected_since', 'N/A')
                
                # Parse duration string like "2 hours ago", "45 minutes ago", etc.
                if duration_str and duration_str != 'N/A':
                    try:
                        import re
                        # Extract numbers and units
                        parts = duration_str.split()
                        total_seconds = 0
                        
                        i = 0
                        while i < len(parts):
                            if parts[i].isdigit():
                                value = int(parts[i])
                                if i + 1 < len(parts):
                                    unit = parts[i + 1].lower()
                                    if 'second' in unit:
                                        total_seconds += value
                                    elif 'minute' in unit:
                                        total_seconds += value * 60
                                    elif 'hour' in unit:
                                        total_seconds += value * 3600
                                    elif 'day' in unit:
                                        total_seconds += value * 86400
                                i += 2
                            else:
                                i += 1
                        
                        duration_seconds = total_seconds
                    except:
                        pass
                
                all_clients.append({
                    'id': f'l2tp_{client["ip_address"]}',
                    'name': client.get('name', 'L2TP Station'),
                    'ip_address': client['ip_address'],
                    'vpn_ip': client.get('vpn_address', client['ip_address']),
                    'vpn_type': 'L2TP/IPSec',
                    'connected_since': connected_since,
                    'duration_seconds': duration_seconds,
                    'bytes_received': 0,
                    'bytes_sent': 0,
                    'encryption': client.get('encryption', 'IPSec'),
                    'status': client.get('status', 'Connected'),
                })
            
            return Response({
                'total_connections': len(all_clients),
                'openvpn_count': len(openvpn_clients),
                'l2tp_count': len(l2tp_clients),
                'clients': all_clients,
                'servers': {
                    'openvpn': openvpn_response.data.get('server_running', False),
                    'l2tp': l2tp_response.data.get('server_running', False),
                },
                'last_updated': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response({
                'error': str(e),
                'total_connections': 0,
                'clients': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def disconnect_client(self, request):
        """
        Disconnect a specific VPN client.
        Requires client ID and VPN type.
        """
        client_id = request.data.get('client_id')
        vpn_type = request.data.get('vpn_type')
        
        if not client_id or not vpn_type:
            return Response({
                'error': 'client_id and vpn_type are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # This would require OpenVPN management interface or ipsec commands
        # Placeholder for now
        return Response({
            'message': f'Disconnect functionality for {vpn_type} not yet implemented',
            'client_id': client_id
        }, status=status.HTTP_501_NOT_IMPLEMENTED)


# ============================================================================
# VPN CLIENT MANAGEMENT VIEWSETS (Admin-Only)
# ============================================================================

from .models import L2TPVPNClient, OpenVPNClient, VPNAuditLog
from .vpn_serializers import (
    L2TPVPNClientSerializer, L2TPVPNClientCreateSerializer,
    OpenVPNClientSerializer, OpenVPNClientCreateSerializer,
    VPNAuditLogSerializer
)
from django.http import FileResponse
import io


class L2TPVPNClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for L2TP/IPsec VPN Client management
    Admin-only access
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = L2TPVPNClient.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return L2TPVPNClientCreateSerializer
        return L2TPVPNClientSerializer
    
    def create(self, request, *args, **kwargs):
        """Create new L2TP client with audit logging"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # Log audit event
        VPNAuditLog.objects.create(
            action='create',
            vpn_type='l2tp',
            client_name=instance.name,
            client_id=instance.id,
            admin_user=request.user,
            ip_address=self._get_client_ip(request),
            details=f"Created L2TP client: {instance.username} -> {instance.vpn_ip}"
        )
        
        return Response(
            L2TPVPNClientSerializer(instance).data,
            status=status.HTTP_201_CREATED
        )
    
    def destroy(self, request, *args, **kwargs):
        """Revoke L2TP client instead of deleting"""
        instance = self.get_object()
        instance.status = 'revoked'
        instance.save()
        
        # Log audit event
        VPNAuditLog.objects.create(
            action='revoke',
            vpn_type='l2tp',
            client_name=instance.name,
            client_id=instance.id,
            admin_user=request.user,
            ip_address=self._get_client_ip(request),
            details=f"Revoked L2TP client: {instance.username}"
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get'])
    def download_config(self, request, pk=None):
        """Download L2TP configuration file"""
        client = self.get_object()
        
        # Generate config file content
        config_content = self._generate_l2tp_config(client)
        
        # Log audit event
        VPNAuditLog.objects.create(
            action='download',
            vpn_type='l2tp',
            client_name=client.name,
            client_id=client.id,
            admin_user=request.user,
            ip_address=self._get_client_ip(request),
            details=f"Downloaded config for: {client.username}"
        )
        
        # Return as file
        response = FileResponse(
            io.BytesIO(config_content.encode()),
            content_type='text/plain'
        )
        response['Content-Disposition'] = f'attachment; filename="L2TP_{client.name}.txt"'
        return response
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate revoked client"""
        client = self.get_object()
        client.status = 'active'
        client.save()
        
        VPNAuditLog.objects.create(
            action='activate',
            vpn_type='l2tp',
            client_name=client.name,
            client_id=client.id,
            admin_user=request.user,
            ip_address=self._get_client_ip(request),
            details=f"Activated L2TP client: {client.username}"
        )
        
        return Response(L2TPVPNClientSerializer(client).data)
    
    def _generate_l2tp_config(self, client):
        """Generate L2TP configuration guide"""
        config = f"""
═══════════════════════════════════════════════════════════════
  L2TP/IPsec VPN Configuration for {client.name}
  Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}
  Valid until: {client.expires_at.strftime('%Y-%m-%d')}
═══════════════════════════════════════════════════════════════

[CLIENT INFORMATION]
Name:           {client.name}
Status:         {client.status.upper()}
Assigned IP:    {client.vpn_ip}
VPN IP:         {client.vpn_ip}/32

[AUTHENTICATION CREDENTIALS]
Username:       {client.username}
Password:       {client.password}
Pre-Shared Key: {client.preshared_key}

[SERVER CONFIGURATION]
Server IP:      {client.server_ip}
Max Connections: {client.max_connections}

[L2TP/IPsec SETTINGS]
Protocol:       L2TP over IPsec
Authentication: PSK (Pre-Shared Key)
Encryption:     AES-128/256 (default)
Hash:           SHA1/SHA256 (default)

[ROUTER CONFIGURATION STEPS]
1. Go to VPN Settings → L2TP/IPsec
2. Enable L2TP/IPsec VPN
3. Enter your username and password above
4. Set Server: {client.server_ip}
5. Enter Pre-Shared Key (PSK) from above
6. Enable IPsec with PSK authentication
7. Save and connect

[SECURITY NOTES]
⚠️  Expires: {client.expires_at.strftime('%Y-%m-%d')}
⚠️  Keep credentials secure
⚠️  Do not share PSK with others
⚠️  Request new credentials after expiration

[SUPPORT]
For assistance, contact: admin@broms.local
"""
        return config
    
    def _get_client_ip(self, request):
        """Get client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')


class OpenVPNClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for OpenVPN Client management
    Admin-only access
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = OpenVPNClient.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OpenVPNClientCreateSerializer
        return OpenVPNClientSerializer
    
    def create(self, request, *args, **kwargs):
        """Create new OpenVPN client"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        VPNAuditLog.objects.create(
            action='create',
            vpn_type='openvpn',
            client_name=instance.name,
            client_id=instance.id,
            admin_user=request.user,
            ip_address=self._get_client_ip(request),
            details=f"Created OpenVPN client: {instance.common_name} -> {instance.vpn_ip}"
        )
        
        return Response(
            OpenVPNClientSerializer(instance).data,
            status=status.HTTP_201_CREATED
        )
    
    def destroy(self, request, *args, **kwargs):
        """Revoke OpenVPN client"""
        instance = self.get_object()
        instance.status = 'revoked'
        instance.save()
        
        VPNAuditLog.objects.create(
            action='revoke',
            vpn_type='openvpn',
            client_name=instance.name,
            client_id=instance.id,
            admin_user=request.user,
            ip_address=self._get_client_ip(request),
            details=f"Revoked OpenVPN client: {instance.common_name}"
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get'])
    def download_config(self, request, pk=None):
        """Download OpenVPN .ovpn configuration file"""
        client = self.get_object()
        
        config_content = self._generate_ovpn_config(client)
        
        VPNAuditLog.objects.create(
            action='download',
            vpn_type='openvpn',
            client_name=client.name,
            client_id=client.id,
            admin_user=request.user,
            ip_address=self._get_client_ip(request),
            details=f"Downloaded config for: {client.common_name}"
        )
        
        response = FileResponse(
            io.BytesIO(config_content.encode()),
            content_type='text/plain'
        )
        response['Content-Disposition'] = f'attachment; filename="{client.name}.ovpn"'
        return response
    
    def _generate_ovpn_config(self, client):
        """Generate .ovpn configuration"""
        config = f"""# OpenVPN Configuration for {client.name}
# Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}
# Valid until: {client.expires_at.strftime('%Y-%m-%d')}

client
dev tun
proto {client.protocol}
remote 144.91.79.167 {client.port}
resolv-retry infinite
nobind
persist-key
persist-tun

ca ca.crt
cert {client.common_name}.crt
key {client.common_name}.key

{'compress lz4' if client.compression_enabled else '# compression disabled'}

verb 3
mute 20

# Security
cipher AES-256-CBC
auth SHA256

# Network
ifconfig-pool-persist ipp.txt
"""
        return config
    
    def _get_client_ip(self, request):
        """Get client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')


class VPNAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing VPN audit logs
    Admin-only access
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = VPNAuditLog.objects.all()
    serializer_class = VPNAuditLogSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by action
        action_filter = self.request.query_params.get('action')
        if action_filter:
            queryset = queryset.filter(action=action_filter)
        
        # Filter by VPN type
        vpn_type = self.request.query_params.get('vpn_type')
        if vpn_type:
            queryset = queryset.filter(vpn_type=vpn_type)
        
        # Filter by admin user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(admin_user_id=user_id)
        
        return queryset
