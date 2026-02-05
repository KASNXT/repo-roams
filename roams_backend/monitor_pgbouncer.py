#!/usr/bin/env python3
"""
PgBouncer Monitoring Tool for BROMS System
Displays real-time connection pool statistics and health metrics

Usage: python3 monitor_pgbouncer.py [--interval SECONDS] [--once]
"""

import sys
import os
import time
import argparse
from datetime import datetime
import subprocess

# Add parent directory to Python path for Django imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'roams_backend'))

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Try to load Django settings for database credentials
try:
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'roams_pro.settings')
    django.setup()
    from django.conf import settings
    DB_CONFIG = settings.DATABASES['default']
except Exception as e:
    print(f"WARNING: Could not load Django settings: {e}")
    print("Using default configuration")
    DB_CONFIG = {
        'NAME': os.getenv('DB_NAME', 'roams_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': '127.0.0.1',
        'PORT': '6432',  # PgBouncer port
    }


class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'


class PgBouncerMonitor:
    """Monitor PgBouncer connection pool statistics"""
    
    def __init__(self, host='127.0.0.1', port='6432', user=None, password=None, database='pgbouncer'):
        """Initialize monitor with connection parameters"""
        self.host = host
        self.port = port
        self.user = user or DB_CONFIG['USER']
        self.password = password or DB_CONFIG['PASSWORD']
        self.database = database
        
    def connect(self):
        """Connect to PgBouncer admin console"""
        try:
            conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                cursor_factory=RealDictCursor
            )
            return conn
        except psycopg2.OperationalError as e:
            print(f"{Colors.RED}ERROR: Could not connect to PgBouncer{Colors.END}")
            print(f"  Host: {self.host}:{self.port}")
            print(f"  User: {self.user}")
            print(f"  Error: {e}")
            return None
    
    def execute_query(self, query):
        """Execute query on PgBouncer admin console"""
        conn = self.connect()
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute(query)
                results = cur.fetchall()
            return results
        except Exception as e:
            print(f"{Colors.RED}Query failed: {e}{Colors.END}")
            return []
        finally:
            conn.close()
    
    def get_pools(self):
        """Get connection pool statistics"""
        return self.execute_query("SHOW POOLS;")
    
    def get_servers(self):
        """Get server connection details"""
        return self.execute_query("SHOW SERVERS;")
    
    def get_clients(self):
        """Get client connection details"""
        return self.execute_query("SHOW CLIENTS;")
    
    def get_stats(self):
        """Get overall statistics"""
        return self.execute_query("SHOW STATS;")
    
    def get_config(self):
        """Get current configuration"""
        return self.execute_query("SHOW CONFIG;")
    
    def display_pools(self):
        """Display formatted pool statistics"""
        pools = self.get_pools()
        if not pools:
            print(f"{Colors.YELLOW}No pool data available{Colors.END}")
            return
        
        print(f"\n{Colors.BOLD}{Colors.CYAN}=== CONNECTION POOLS ==={Colors.END}")
        print(f"{'Database':<15} {'User':<15} {'CL Active':<10} {'CL Waiting':<12} "
              f"{'SV Active':<10} {'SV Idle':<10} {'SV Used':<10} {'Max Wait':<10}")
        print("=" * 110)
        
        for pool in pools:
            # Color code based on pool health
            cl_active = pool.get('cl_active', 0)
            cl_waiting = pool.get('cl_waiting', 0)
            sv_active = pool.get('sv_active', 0)
            sv_idle = pool.get('sv_idle', 0)
            maxwait = pool.get('maxwait', 0)
            
            # Determine color based on health
            if cl_waiting > 0:
                color = Colors.RED  # Clients waiting = bad
            elif cl_active > 20:
                color = Colors.YELLOW  # High usage = warning
            else:
                color = Colors.GREEN  # Normal
            
            print(f"{color}{pool.get('database', 'N/A'):<15} "
                  f"{pool.get('user', 'N/A'):<15} "
                  f"{cl_active:<10} "
                  f"{cl_waiting:<12} "
                  f"{sv_active:<10} "
                  f"{sv_idle:<10} "
                  f"{pool.get('sv_used', 0):<10} "
                  f"{maxwait:<10}{Colors.END}")
    
    def display_servers(self, limit=10):
        """Display server connection details"""
        servers = self.get_servers()
        if not servers:
            print(f"{Colors.YELLOW}No server data available{Colors.END}")
            return
        
        print(f"\n{Colors.BOLD}{Colors.CYAN}=== SERVER CONNECTIONS (Top {limit}) ==={Colors.END}")
        print(f"{'Type':<8} {'User':<15} {'Database':<15} {'State':<12} {'Remote IP':<20}")
        print("=" * 80)
        
        for i, server in enumerate(servers[:limit]):
            state = server.get('state', 'unknown')
            
            # Color based on state
            if state == 'active':
                color = Colors.GREEN
            elif state == 'idle':
                color = Colors.BLUE
            else:
                color = Colors.YELLOW
            
            print(f"{color}{server.get('type', 'N/A'):<8} "
                  f"{server.get('user', 'N/A'):<15} "
                  f"{server.get('database', 'N/A'):<15} "
                  f"{state:<12} "
                  f"{server.get('addr', 'N/A'):<20}{Colors.END}")
        
        if len(servers) > limit:
            print(f"  ... and {len(servers) - limit} more")
    
    def display_clients(self, limit=10):
        """Display client connection details"""
        clients = self.get_clients()
        if not clients:
            print(f"{Colors.YELLOW}No client data available{Colors.END}")
            return
        
        print(f"\n{Colors.BOLD}{Colors.CYAN}=== CLIENT CONNECTIONS (Top {limit}) ==={Colors.END}")
        print(f"{'Type':<8} {'User':<15} {'Database':<15} {'State':<12} {'Remote IP':<20}")
        print("=" * 80)
        
        for i, client in enumerate(clients[:limit]):
            state = client.get('state', 'unknown')
            
            # Color based on state
            if state == 'active':
                color = Colors.GREEN
            elif state == 'waiting':
                color = Colors.RED
            else:
                color = Colors.BLUE
            
            print(f"{color}{client.get('type', 'N/A'):<8} "
                  f"{client.get('user', 'N/A'):<15} "
                  f"{client.get('database', 'N/A'):<15} "
                  f"{state:<12} "
                  f"{client.get('addr', 'N/A'):<20}{Colors.END}")
        
        if len(clients) > limit:
            print(f"  ... and {len(clients) - limit} more")
    
    def display_stats(self):
        """Display overall statistics"""
        stats = self.get_stats()
        if not stats:
            print(f"{Colors.YELLOW}No stats available{Colors.END}")
            return
        
        print(f"\n{Colors.BOLD}{Colors.CYAN}=== STATISTICS ==={Colors.END}")
        print(f"{'Database':<15} {'Total Req':<12} {'Total Recv':<12} {'Total Sent':<12} "
              f"{'Avg Req/s':<12} {'Avg Query (ms)':<15}")
        print("=" * 90)
        
        for stat in stats:
            total_xact_count = stat.get('total_xact_count', 0)
            total_received = stat.get('total_received', 0)
            total_sent = stat.get('total_sent', 0)
            avg_req = stat.get('avg_req', 0)
            avg_query_time = stat.get('avg_query_time', 0) / 1000  # Convert to ms
            
            print(f"{stat.get('database', 'N/A'):<15} "
                  f"{total_xact_count:<12} "
                  f"{total_received:<12} "
                  f"{total_sent:<12} "
                  f"{avg_req:<12.2f} "
                  f"{avg_query_time:<15.2f}")
    
    def display_summary(self):
        """Display quick summary"""
        pools = self.get_pools()
        servers = self.get_servers()
        clients = self.get_clients()
        
        total_cl_active = sum(p.get('cl_active', 0) for p in pools)
        total_cl_waiting = sum(p.get('cl_waiting', 0) for p in pools)
        total_sv_active = sum(p.get('sv_active', 0) for p in pools)
        total_sv_idle = sum(p.get('sv_idle', 0) for p in pools)
        
        print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.END}")
        print(f"{Colors.BOLD}PgBouncer Status - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.END}")
        
        print(f"\n{Colors.BOLD}Clients:{Colors.END}")
        print(f"  Active: {Colors.GREEN}{total_cl_active}{Colors.END}")
        print(f"  Waiting: {Colors.RED if total_cl_waiting > 0 else Colors.GREEN}{total_cl_waiting}{Colors.END}")
        print(f"  Total: {len(clients)}")
        
        print(f"\n{Colors.BOLD}Servers:{Colors.END}")
        print(f"  Active: {Colors.GREEN}{total_sv_active}{Colors.END}")
        print(f"  Idle: {Colors.BLUE}{total_sv_idle}{Colors.END}")
        print(f"  Total: {len(servers)}")
        
        # Health check
        if total_cl_waiting > 0:
            print(f"\n{Colors.RED}{Colors.BOLD}⚠ WARNING: Clients are waiting for connections!{Colors.END}")
            print(f"  Consider increasing default_pool_size in pgbouncer.ini")
        elif total_cl_active > 50:
            print(f"\n{Colors.YELLOW}⚠ High client activity ({total_cl_active} active){Colors.END}")
        else:
            print(f"\n{Colors.GREEN}✓ Pool is healthy{Colors.END}")
    
    def monitor(self, interval=5):
        """Continuous monitoring with refresh"""
        try:
            while True:
                # Clear screen
                os.system('clear' if os.name == 'posix' else 'cls')
                
                self.display_summary()
                self.display_pools()
                self.display_clients(limit=5)
                self.display_servers(limit=5)
                
                print(f"\n{Colors.BLUE}Refreshing in {interval}s... (Ctrl+C to stop){Colors.END}")
                time.sleep(interval)
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}Monitoring stopped{Colors.END}")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Monitor PgBouncer for BROMS')
    parser.add_argument('--interval', type=int, default=5, help='Refresh interval in seconds')
    parser.add_argument('--once', action='store_true', help='Show stats once and exit')
    parser.add_argument('--stats', action='store_true', help='Show detailed statistics')
    parser.add_argument('--config', action='store_true', help='Show configuration')
    parser.add_argument('--host', default='127.0.0.1', help='PgBouncer host')
    parser.add_argument('--port', default='6432', help='PgBouncer port')
    
    args = parser.parse_args()
    
    monitor = PgBouncerMonitor(host=args.host, port=args.port)
    
    if args.config:
        config = monitor.get_config()
        print(f"\n{Colors.BOLD}{Colors.CYAN}=== CONFIGURATION ==={Colors.END}")
        for item in config:
            print(f"{item.get('key', 'N/A'):<30} = {item.get('value', 'N/A')}")
        return
    
    if args.stats:
        monitor.display_stats()
        return
    
    if args.once:
        monitor.display_summary()
        monitor.display_pools()
        monitor.display_clients()
        monitor.display_servers()
        monitor.display_stats()
    else:
        monitor.monitor(interval=args.interval)


if __name__ == '__main__':
    main()
