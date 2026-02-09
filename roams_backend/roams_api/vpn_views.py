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
                                    
                                    clients.append({
                                        'name': station_name,
                                        'ip_address': client_ip,
                                        'vpn_address': client_ip,
                                        'status': 'ESTABLISHED',
                                        'protocol': 'L2TP/IPSec',
                                        'encryption': 'IPSec',
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
                all_clients.append({
                    'id': f'l2tp_{client["ip_address"]}',
                    'name': client.get('name', 'L2TP Station'),
                    'ip_address': client['ip_address'],
                    'vpn_ip': client.get('vpn_address', client['ip_address']),
                    'vpn_type': 'L2TP/IPSec',
                    'connected_since': 'N/A',
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
