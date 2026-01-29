#!/usr/bin/env python
"""
Quick diagnostics script for OPC UA configuration issues.
Run: python diagnose_opcua.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'roams_pro.settings')
sys.path.insert(0, '/mnt/d/DJANGO_PROJECTS/roams_b/roams_backend')
django.setup()

from roams_opcua_mgr.models import OpcUaClientConfig
from colorama import Fore, Style
import socket

def check_hostname_resolution(url):
    """Check if OPC UA URL hostname is resolvable."""
    try:
        # Extract hostname from opc.tcp://host:port
        if '://' in url:
            url = url.split('://')[1]
        if ':' in url:
            hostname = url.split(':')[0]
        else:
            hostname = url
        
        ip = socket.gethostbyname(hostname)
        return True, ip
    except socket.gaierror:
        return False, "Unresolvable"
    except Exception as e:
        return False, str(e)

def main():
    print(f"\n{Fore.CYAN}{'='*70}")
    print(f"🔍 OPC UA CONFIGURATION DIAGNOSTICS")
    print(f"{'='*70}{Style.RESET_ALL}\n")
    
    configs = OpcUaClientConfig.objects.all()
    
    if not configs.exists():
        print(f"{Fore.YELLOW}⚠️  No OPC UA configurations found!{Style.RESET_ALL}")
        return
    
    print(f"Found {configs.count()} OPC UA station(s):\n")
    
    issues = 0
    
    for cfg in configs:
        status_color = Fore.GREEN if cfg.active else Fore.YELLOW
        connection_color = {
            'Connected': Fore.GREEN,
            'Disconnected': Fore.YELLOW,
            'Faulty': Fore.RED,
        }.get(cfg.connection_status, Fore.WHITE)
        
        print(f"{Fore.CYAN}Station:{Style.RESET_ALL} {cfg.station_name}")
        print(f"  URL: {cfg.endpoint_url}")
        print(f"  Active: {status_color}{cfg.active}{Style.RESET_ALL}")
        print(f"  Status: {connection_color}{cfg.connection_status}{Style.RESET_ALL}")
        print(f"  Timeout: {cfg.connection_time_out}ms")
        
        # Check hostname resolution
        resolvable, result = check_hostname_resolution(cfg.endpoint_url)
        if resolvable:
            print(f"  {Fore.GREEN}✅ Hostname resolves to {result}{Style.RESET_ALL}")
        else:
            print(f"  {Fore.RED}❌ Hostname resolution failed: {result}{Style.RESET_ALL}")
            issues += 1
        
        # Check last connection
        if cfg.last_connected:
            print(f"  Last Connected: {cfg.last_connected}")
        else:
            print(f"  {Fore.YELLOW}⚠️  Never connected{Style.RESET_ALL}")
        
        print()
    
    print(f"{Fore.CYAN}{'='*70}")
    if issues == 0:
        print(f"{Fore.GREEN}✅ All hostnames are resolvable!{Style.RESET_ALL}")
    else:
        print(f"{Fore.RED}❌ {issues} station(s) have unresolvable hostname(s){Style.RESET_ALL}")
        print(f"\nTo fix:")
        print(f"  1. Update the endpoint URL in the Django admin")
        print(f"  2. Use IP address instead of hostname if DNS fails")
        print(f"  3. Check network connectivity to the OPC UA server")
    
    print(f"{Fore.CYAN}{'='*70}{Style.RESET_ALL}\n")

if __name__ == '__main__':
    main()
