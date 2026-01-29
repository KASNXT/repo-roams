# Delete Performance Diagnostics & Benchmarking

## Benchmark Tool

Create this file as `roams_backend/manage_commands/benchmark_deletes.py`:

```python
# management/commands/benchmark_deletes.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from roams_opcua_mgr.models import OpcUaClientConfig, OpcUaReadLog, OpcUaWriteLog
import time
import random

class Command(BaseCommand):
    help = 'Benchmark delete performance'

    def add_arguments(self, parser):
        parser.add_argument('--create', type=int, help='Create N test records')
        parser.add_argument('--delete', action='store_true', help='Benchmark delete')
        parser.add_argument('--station', type=str, default='Test-Station')

    def handle(self, *args, **options):
        station_name = options['station']
        
        # Get or create station
        station, _ = OpcUaClientConfig.objects.get_or_create(
            station_name=station_name,
            defaults={
                'endpoint_url': 'opc.tcp://localhost:4840',
                'active': False,
            }
        )

        if options['create']:
            self.create_test_data(station, options['create'])
        
        if options['delete']:
            self.benchmark_delete(station)

    def create_test_data(self, station, count):
        """Create test records"""
        self.stdout.write(f"Creating {count} test records...")
        
        batch = []
        for i in range(count):
            batch.append(OpcUaReadLog(
                client_config=station,
                data='test_data',
                timestamp=timezone.now(),
            ))
            
            if len(batch) >= 1000:
                OpcUaReadLog.objects.bulk_create(batch)
                batch = []
                self.stdout.write(f"  Created {len(batch)} records...")
        
        if batch:
            OpcUaReadLog.objects.bulk_create(batch)
        
        self.stdout.write(self.style.SUCCESS(f"✓ Created {count} records"))

    def benchmark_delete(self, station):
        """Benchmark the optimized delete function"""
        from django.db import connection
        
        # Count records
        count = OpcUaReadLog.objects.filter(client_config=station).count()
        self.stdout.write(f"Deleting {count} records from {station.station_name}...")
        
        if count == 0:
            self.stdout.write("No records to delete")
            return
        
        # Benchmark
        start = time.time()
        batch_size = 5000
        iterations = 0
        
        with connection.cursor() as cursor:
            while True:
                cursor.execute(
                    f"DELETE FROM roams_opcua_mgr_opcuareadlog "
                    f"WHERE client_config_id = %s LIMIT %s",
                    [station.id, batch_size]
                )
                deleted = cursor.rowcount
                iterations += 1
                
                if deleted == 0:
                    break
                
                elapsed = time.time() - start
                speed = count / elapsed if elapsed > 0 else 0
                self.stdout.write(
                    f"  Batch {iterations}: {deleted} records in {elapsed:.2f}s ({speed:.0f} rec/s)"
                )
        
        duration = time.time() - start
        final_speed = count / duration if duration > 0 else 0
        
        self.stdout.write(self.style.SUCCESS(
            f"✓ Deleted {count} records in {duration:.2f}s ({final_speed:.0f} rec/sec)"
        ))
```

Run it:
```bash
# Create 100K test records
python manage.py benchmark_deletes --create 100000 --station TestBench

# Benchmark delete
python manage.py benchmark_deletes --delete --station TestBench
```

---

## Memory Profiler

Monitor memory during deletion:

```python
# roams_backend/test_delete_memory.py
import tracemalloc
import time
from django.utils import timezone
from roams_opcua_mgr.models import OpcUaClientConfig, OpcUaReadLog

def profile_delete():
    """Profile memory usage during delete"""
    from django.db import connection
    
    # Setup
    station = OpcUaClientConfig.objects.get(station_name='Test-Station')
    
    # Start tracing
    tracemalloc.start()
    peak_memory = 0
    
    start_time = time.time()
    start_snapshot = tracemalloc.take_snapshot()
    
    # Perform delete
    batch_size = 5000
    deleted = 0
    
    with connection.cursor() as cursor:
        while True:
            cursor.execute(
                f"DELETE FROM roams_opcua_mgr_opcuareadlog "
                f"WHERE client_config_id = %s LIMIT %s",
                [station.id, batch_size]
            )
            deleted += cursor.rowcount
            
            if cursor.rowcount == 0:
                break
            
            current, peak = tracemalloc.get_traced_memory()
            peak_memory = max(peak_memory, peak)
    
    end_time = time.time()
    end_snapshot = tracemalloc.take_snapshot()
    
    # Report
    duration = end_time - start_time
    speed = deleted / duration if duration > 0 else 0
    
    print(f"""
Memory Profile:
  Records deleted: {deleted}
  Duration: {duration:.2f}s
  Speed: {speed:.0f} records/sec
  Peak memory: {peak_memory / 1024 / 1024:.1f} MB
  
Top 3 allocations:
""")
    
    top_stats = end_snapshot.compare_to(start_snapshot, 'lineno')
    for stat in top_stats[:3]:
        print(f"  {stat}")
    
    tracemalloc.stop()

if __name__ == '__main__':
    import os
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'roams_pro.settings')
    django.setup()
    
    profile_delete()
```

Run it:
```bash
python roams_backend/test_delete_memory.py
```

---

## Database Query Profiler

Track database queries during deletion:

```python
# roams_backend/test_delete_queries.py
from django.test.utils import override_settings
from django.db import connection
from django.test import TestCase
from django.db import reset_queries
import time

@override_settings(DEBUG=True)
def profile_delete_queries():
    """Profile database queries during delete"""
    from roams_opcua_mgr.models import OpcUaClientConfig
    
    # Reset tracking
    reset_queries()
    connection.queries_log.clear()
    
    # Get station
    station = OpcUaClientConfig.objects.get(station_name='Test-Station')
    
    # Perform delete
    start = time.time()
    batch_count = 0
    
    with connection.cursor() as cursor:
        while True:
            cursor.execute(
                f"DELETE FROM roams_opcua_mgr_opcuareadlog "
                f"WHERE client_config_id = %s LIMIT 5000",
                [station.id]
            )
            deleted = cursor.rowcount
            batch_count += 1
            
            if deleted == 0:
                break
    
    duration = time.time() - start
    
    # Analyze queries
    queries = connection.queries
    
    print(f"""
Query Profile:
  Total queries: {len(queries)}
  Batches: {batch_count}
  Duration: {duration:.2f}s
  Queries per batch: {len(queries) / batch_count if batch_count > 0 else 0:.1f}
  
Query types:
""")
    
    query_types = {}
    for q in queries:
        sql = q['sql']
        if 'DELETE' in sql:
            key = 'DELETE'
        elif 'SELECT' in sql:
            key = 'SELECT'
        else:
            key = 'OTHER'
        query_types[key] = query_types.get(key, 0) + 1
    
    for qtype, count in query_types.items():
        print(f"  {qtype}: {count}")
    
    # Slowest queries
    print("\nSlowest queries:")
    sorted_queries = sorted(queries, key=lambda x: float(x['time']), reverse=True)
    for q in sorted_queries[:3]:
        print(f"  {float(q['time']):.3f}s - {q['sql'][:80]}...")

if __name__ == '__main__':
    import os
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'roams_pro.settings')
    django.setup()
    
    profile_delete_queries()
```

---

## Performance Checklist

After deployment, verify:

- [ ] **Speed**: Delete completes in seconds instead of minutes
- [ ] **Memory**: Peak memory usage is <100MB even for 1M records
- [ ] **CPU**: Database CPU stays <50% during deletion
- [ ] **Locks**: No table locks > 5 seconds
- [ ] **Throughput**: Achieves >10K records/second
- [ ] **Progress**: UI updates show smooth progress
- [ ] **Errors**: No SQL errors in logs
- [ ] **Data**: Correct records deleted (verify counts)

---

## Expected Metrics

### After Optimization (Raw SQL)

```
1K records:      0.05s    (20K rec/sec)
10K records:     0.5s     (20K rec/sec)
100K records:    5s       (20K rec/sec)
1M records:      50s      (20K rec/sec)

Memory peak:     50-100MB (regardless of record count)
Database CPU:    20-40%
Table lock time: <1 second per batch
```

### Before Optimization (ORM)

```
1K records:      0.5s     (2K rec/sec)
10K records:     5s       (2K rec/sec)
100K records:    50s      (2K rec/sec)
1M records:      500s+    (2K rec/sec)

Memory peak:     200-500MB (scales with record count)
Database CPU:    70-85%
Table lock time: >5 seconds per batch
```

---

## Troubleshooting

### If delete is still slow:

1. **Check table size**: `SELECT COUNT(*) FROM roams_opcua_mgr_opcuareadlog;`
2. **Check indexes**: Are there indexes on `client_config_id`?
3. **Check locks**: Run `SHOW PROCESSLIST;` during deletion
4. **Check batch size**: Try increasing from 5000 to 10000
5. **Check disk I/O**: Monitor disk usage during delete

### If memory usage is high:

1. Verify raw SQL is being used (not ORM)
2. Check for other processes consuming memory
3. Reduce batch size from 5000 to 2000
4. Check for memory leaks in Django app

### If getting "table is locked":

1. Reduce batch size (smaller = faster = less lock time)
2. Check for other running queries
3. Increase timeout on database connections
4. Consider deleting at off-peak hours

---

## Comparison Tool

Quick comparison of old vs new:

```bash
# Old method (don't use - just for reference)
# python manage.py shell
from roams_opcua_mgr.models import OpcUaClientConfig, OpcUaReadLog
import time

station = OpcUaClientConfig.objects.first()

# OLD method (slow)
start = time.time()
read_ids = list(OpcUaReadLog.objects.filter(client_config=station).values_list('id', flat=True)[:5000])
OpcUaReadLog.objects.filter(id__in=read_ids).delete()
old_time = time.time() - start
print(f"Old method: {old_time:.2f}s")

# NEW method (fast)
from django.db import connection
start = time.time()
with connection.cursor() as cursor:
    cursor.execute("DELETE FROM roams_opcua_mgr_opcuareadlog WHERE client_config_id = %s LIMIT 5000", [station.id])
new_time = time.time() - start
print(f"New method: {new_time:.2f}s")
print(f"Speedup: {old_time / new_time:.1f}x")
```

This shows the real performance difference on your actual data!
