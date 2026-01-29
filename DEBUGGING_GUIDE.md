# 🧰 Practical Debugging Guide

## Quick Commands Reference

### 1. Run Diagnostics
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python diagnose_opcua.py
```

Output will show:
- ✅/❌ Which stations resolve correctly
- Connection status
- Last connection timestamp

---

### 2. Monitor Real-Time Logs
```bash
# Debug log (all messages)
tail -f logs/debug.log

# Error log (warnings + errors only)  
tail -f logs/error.log

# Combined (press Ctrl+C to stop)
tail -f logs/*.log
```

---

### 3. Start Development Server with Console Logs
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py runserver
```

You should now see INFO level logs in console:
- ✅ Connection attempts
- ✅ Node reads
- ⚠️ Warnings
- ❌ Errors

---

### 4. Test OPC UA Connectivity
```bash
# Interactive Python shell
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py shell
```

Then in the shell:
```python
# List all stations
from roams_opcua_mgr.models import OpcUaClientConfig
for cfg in OpcUaClientConfig.objects.all():
    print(f"{cfg.station_name}: {cfg.endpoint_url} - {cfg.connection_status}")

# Check specific station
station = OpcUaClientConfig.objects.get(station_name="testing")
print(f"Last connected: {station.last_connected}")
print(f"Timeout: {station.connection_time_out}ms")

# Test hostname resolution
import socket
hostname = "KASMIC_BA"
try:
    ip = socket.gethostbyname(hostname)
    print(f"✅ {hostname} resolves to {ip}")
except:
    print(f"❌ {hostname} cannot be resolved")

# Exit
exit()
```

---

### 5. Delete Invalid Station
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py shell
```

```python
from roams_opcua_mgr.models import OpcUaClientConfig

# Find and delete
station = OpcUaClientConfig.objects.get(station_name="mityana bh1")
print(f"Deleting: {station.station_name} ({station.endpoint_url})")
station.delete()
print("✅ Deleted")

exit()
```

---

### 6. View Database Queries
```python
# In Django shell, after running some code:
from django.db import connection

for query in connection.queries:
    print(f"Time: {query['time']}s")
    print(f"SQL: {query['sql']}\n")
```

---

### 7. Clear Cache
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py shell
```

```python
from django.core.cache import cache
cache.clear()
print("✅ Cache cleared")
exit()
```

---

### 8. Check Active Connections
```bash
# Show OPC UA client handlers
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py shell
```

```python
from roams_opcua_mgr.opcua_client import active_clients

print(f"Active clients: {len(active_clients)}")
for station_name, handler in active_clients.items():
    print(f"  {station_name}: {'Connected' if handler.connected else 'Not Connected'}")

exit()
```

---

### 9. Restart OPC UA Clients
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py shell
```

```python
from roams_opcua_mgr.opcua_client import start_opcua_clients
print("Restarting OPC UA clients...")
start_opcua_clients()
print("✅ Done")
exit()
```

---

### 10. View Recent Errors
```bash
# Last 30 error entries
tail -30 /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend/logs/error.log

# Count errors by type
grep "ERROR" /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend/logs/error.log | wc -l

# Find specific error pattern
grep "Connection failed" /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend/logs/error.log
```

---

## Troubleshooting Scenarios

### Scenario 1: Still Seeing Connection Errors
```bash
# 1. Run diagnostics
python diagnose_opcua.py

# 2. Check which station is failing
tail -20 logs/error.log

# 3. Delete or update the faulty station
python manage.py shell
# Then run delete command above
```

### Scenario 2: Console Logs Not Showing
```bash
# Check DEBUG setting
grep "^DEBUG = " roams_pro/settings.py
# Should output: DEBUG = True

# If False, set to True for development
# Edit roams_pro/settings.py
```

### Scenario 3: Station Creation Still Slow
```bash
# Check if signal is using thread
grep -A5 "refresh_clients" roams_opcua_mgr/signals.py
# Should show: threading.Thread(...)

# If not, re-apply the signal fix from PERFORMANCE_FIX_GUIDE.md
```

### Scenario 4: Database Locked
```bash
# Clear problematic data
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
python manage.py shell

from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT * FROM information_schema.locks;")
    # Shows any locks
    
exit()
```

---

## Performance Testing

### Test 1: Station Creation Speed
```bash
# Time how long it takes to create a station
time curl -X POST http://localhost:8000/api/clients/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "station_name": "test_station",
    "endpoint_url": "opc.tcp://192.168.1.100:4840",
    "active": true,
    "connection_status": "Disconnected"
  }'

# Should show:
# real    0m0.XXXs (less than 1 second)
```

### Test 2: Connection Retry Pattern
```bash
# Add a station with invalid URL and watch retry pattern
# Run in one terminal:
python manage.py runserver

# In another terminal, watch the retry pattern:
tail -f logs/error.log | grep "Connection attempt"

# You should see:
# WARNING: Connection attempt 1/3 failed... Retrying in 1s...
# WARNING: Connection attempt 2/3 failed... Retrying in 2s...
# WARNING: Connection attempt 3/3 failed... Retrying in 4s...
```

### Test 3: API Performance
```bash
# Check how long API calls take
curl -w "\nTime: %{time_total}s\n" \
  http://localhost:8000/api/clients/ \
  -H "Authorization: Token YOUR_TOKEN"

# Should be < 100ms for small datasets
```

---

## Log File Cleanup

### View Log Sizes
```bash
ls -lh /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend/logs/
```

### Clear Old Logs (Keep Last 2)
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend/logs/
rm -f debug.log.[3-9] error.log.[3-9]
```

### Archive Old Logs
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend/logs/
tar -czf logs_backup_$(date +%Y%m%d).tar.gz debug.log.* error.log.*
rm debug.log.* error.log.*
```

---

## Production Checklist

Before going live:

- [ ] Set `DEBUG = False` in settings.py
- [ ] Set console logging to WARNING level
- [ ] Delete test stations
- [ ] Verify all station URLs are valid
- [ ] Run `python diagnose_opcua.py` - no ❌ errors
- [ ] Check that production database is backed up
- [ ] Test with actual OPC UA servers
- [ ] Monitor logs for 1 hour to ensure stability
- [ ] Set up log rotation to prevent disk overflow

---

## Emergency Procedures

### Emergency: Restart Everything
```bash
# Kill all Django processes
pkill -f "python manage.py"

# Clear cache
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py shell << 'EOF'
from django.core.cache import cache
cache.clear()
exit()
EOF

# Restart
python manage.py runserver
```

### Emergency: Reset OPC UA State
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
python manage.py shell

# Clear active clients
from roams_opcua_mgr.opcua_client import active_clients
active_clients.clear()
print("Active clients cleared")

# Restart
from roams_opcua_mgr.opcua_client import start_opcua_clients
start_opcua_clients()
print("OPC UA clients restarted")

exit()
```

---

## Getting Help

If issues persist:

1. **Check the logs first**
   ```bash
   tail -50 logs/error.log
   ```

2. **Run diagnostics**
   ```bash
   python diagnose_opcua.py
   ```

3. **Check documentation**
   - PROJECT_HEALTH_REVIEW.md
   - PERFORMANCE_FIX_GUIDE.md
   - REVIEW_COMPLETE.md

4. **Review settings**
   ```bash
   grep -n "DEBUG\|LOGGING\|TIMEOUT" roams_pro/settings.py
   ```

