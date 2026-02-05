#!/usr/bin/env python3
"""
PgBouncer vs Direct PostgreSQL Performance Comparison for BROMS

This script compares query performance when connecting:
1. Through PgBouncer (port 6432)
2. Directly to PostgreSQL (port 5432)

Useful for validating PgBouncer benefits in production.
"""

import sys
import os
import time
import statistics
from datetime import datetime

# Add parent directory for Django imports
sys.path.insert(0, os.path.dirname(__file__))

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Try to load Django settings
try:
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'roams_pro.settings')
    django.setup()
    from django.conf import settings
    DB_CONFIG = settings.DATABASES['default']
except Exception as e:
    print(f"WARNING: Could not load Django settings: {e}")
    DB_CONFIG = {
        'NAME': os.getenv('DB_NAME', 'roams_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': '127.0.0.1',
    }


def test_connection(host, port, user, password, database, iterations=100):
    """Test connection and query performance"""
    connection_times = []
    query_times = []
    total_time_start = time.time()
    
    print(f"\nTesting {iterations} iterations on port {port}...")
    
    for i in range(iterations):
        # Measure connection time
        conn_start = time.time()
        try:
            conn = psycopg2.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                database=database,
                connect_timeout=10
            )
            conn_time = (time.time() - conn_start) * 1000  # Convert to ms
            connection_times.append(conn_time)
            
            # Measure query time
            query_start = time.time()
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM roams_opcua_mgr_opcuareadlog;")
                result = cur.fetchone()
            query_time = (time.time() - query_start) * 1000  # Convert to ms
            query_times.append(query_time)
            
            conn.close()
            
            # Progress indicator
            if (i + 1) % 10 == 0:
                print(f"  Progress: {i + 1}/{iterations}", end='\r')
                
        except Exception as e:
            print(f"\n  Error on iteration {i + 1}: {e}")
            continue
    
    total_time = time.time() - total_time_start
    
    print(f"\n  Completed {len(connection_times)} successful iterations")
    
    return {
        'connection_times': connection_times,
        'query_times': query_times,
        'total_time': total_time,
        'successful': len(connection_times)
    }


def print_stats(label, times):
    """Print statistics for a set of measurements"""
    if not times:
        print(f"{label}: No data")
        return
    
    print(f"\n{label}:")
    print(f"  Min:    {min(times):.2f} ms")
    print(f"  Max:    {max(times):.2f} ms")
    print(f"  Avg:    {statistics.mean(times):.2f} ms")
    print(f"  Median: {statistics.median(times):.2f} ms")
    if len(times) > 1:
        print(f"  StdDev: {statistics.stdev(times):.2f} ms")


def main():
    """Main comparison function"""
    print("=" * 70)
    print("PgBouncer vs PostgreSQL Performance Comparison")
    print("=" * 70)
    print(f"\nConfiguration:")
    print(f"  Database: {DB_CONFIG['NAME']}")
    print(f"  User: {DB_CONFIG['USER']}")
    print(f"  Host: {DB_CONFIG.get('HOST', '127.0.0.1')}")
    
    iterations = 100
    
    # Test PgBouncer
    print("\n" + "=" * 70)
    print("Testing PgBouncer (port 6432)")
    print("=" * 70)
    
    pgbouncer_results = test_connection(
        host=DB_CONFIG.get('HOST', '127.0.0.1'),
        port=6432,
        user=DB_CONFIG['USER'],
        password=DB_CONFIG['PASSWORD'],
        database=DB_CONFIG['NAME'],
        iterations=iterations
    )
    
    # Test Direct PostgreSQL
    print("\n" + "=" * 70)
    print("Testing Direct PostgreSQL (port 5432)")
    print("=" * 70)
    
    direct_results = test_connection(
        host=DB_CONFIG.get('HOST', '127.0.0.1'),
        port=5432,
        user=DB_CONFIG['USER'],
        password=DB_CONFIG['PASSWORD'],
        database=DB_CONFIG['NAME'],
        iterations=iterations
    )
    
    # Print comparison
    print("\n" + "=" * 70)
    print("RESULTS COMPARISON")
    print("=" * 70)
    
    print("\n--- PgBouncer (Port 6432) ---")
    print_stats("Connection Time", pgbouncer_results['connection_times'])
    print_stats("Query Time", pgbouncer_results['query_times'])
    print(f"\nTotal Time: {pgbouncer_results['total_time']:.2f} seconds")
    
    print("\n--- Direct PostgreSQL (Port 5432) ---")
    print_stats("Connection Time", direct_results['connection_times'])
    print_stats("Query Time", direct_results['query_times'])
    print(f"\nTotal Time: {direct_results['total_time']:.2f} seconds")
    
    # Calculate improvements
    if pgbouncer_results['connection_times'] and direct_results['connection_times']:
        pg_conn_avg = statistics.mean(pgbouncer_results['connection_times'])
        direct_conn_avg = statistics.mean(direct_results['connection_times'])
        conn_improvement = ((direct_conn_avg - pg_conn_avg) / direct_conn_avg) * 100
        
        print("\n" + "=" * 70)
        print("PERFORMANCE ANALYSIS")
        print("=" * 70)
        print(f"\nConnection Time Improvement:")
        print(f"  PgBouncer: {pg_conn_avg:.2f} ms")
        print(f"  Direct:    {direct_conn_avg:.2f} ms")
        print(f"  Speedup:   {conn_improvement:.1f}% faster")
        
        if conn_improvement > 0:
            print(f"\n✓ PgBouncer is FASTER by {conn_improvement:.1f}%")
        else:
            print(f"\n⚠ Direct connection is faster by {abs(conn_improvement):.1f}%")
        
        # Query time comparison
        pg_query_avg = statistics.mean(pgbouncer_results['query_times'])
        direct_query_avg = statistics.mean(direct_results['query_times'])
        
        print(f"\nQuery Time:")
        print(f"  PgBouncer: {pg_query_avg:.2f} ms")
        print(f"  Direct:    {direct_query_avg:.2f} ms")
        print(f"  Difference: {abs(pg_query_avg - direct_query_avg):.2f} ms")
        
        # Total throughput
        pg_throughput = iterations / pgbouncer_results['total_time']
        direct_throughput = iterations / direct_results['total_time']
        
        print(f"\nThroughput:")
        print(f"  PgBouncer: {pg_throughput:.2f} queries/second")
        print(f"  Direct:    {direct_throughput:.2f} queries/second")
        
        print("\n" + "=" * 70)
        print("RECOMMENDATION")
        print("=" * 70)
        
        if conn_improvement > 20:
            print("\n✓ EXCELLENT: PgBouncer shows significant performance improvement!")
            print("  Connection pooling is highly beneficial for this workload.")
        elif conn_improvement > 10:
            print("\n✓ GOOD: PgBouncer provides noticeable performance gains.")
            print("  Recommended for production use.")
        elif conn_improvement > 0:
            print("\n✓ MODERATE: PgBouncer provides some improvement.")
            print("  Benefits will increase with higher concurrent load.")
        else:
            print("\n⚠ Note: Direct connection appears faster in this test.")
            print("  PgBouncer benefits are most visible under high concurrent load.")
            print("  Try running this test with multiple simultaneous clients.")


if __name__ == '__main__':
    main()
