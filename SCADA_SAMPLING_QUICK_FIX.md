# ⚡ Quick Fix: Adjust Sampling for SCADA Comparison

## The Issue
Your system currently samples **all nodes at 5 second intervals** (station-wide setting).
To compare data with another SCADA system, you need matching sample times.

## Quick Steps

### Step 1: Identify Other SCADA Sample Rate
Contact the other system operator or check:
- Documentation
- System admin panel
- API logs
- Example: "Our system samples at 2 second intervals"

### Step 2: Adjust ROAMS (3 Options)

#### **Option A: Via Admin Panel (Easiest)** ⭐

1. Login to `/admin/`
2. Go to **OPC UA Client Configurations**
3. Click on the station (e.g., "testing")
4. Check **"Show Advanced Properties"**
5. Find **"Subscription interval"** field
6. Change value (in milliseconds):
   - **1000** = 1 second (fast, high data volume)
   - **2000** = 2 seconds
   - **5000** = 5 seconds (current, default)
   - **10000** = 10 seconds
   - **30000** = 30 seconds (slow, low data volume)
7. Click **SAVE**

Result: Takes effect immediately for new readings

#### **Option B: Via Python Shell**

```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py shell
```

```python
from roams_opcua_mgr.models import OpcUaClientConfig

# For "testing" station to match 2-second SCADA
station = OpcUaClientConfig.objects.get(station_name="testing")
station.subscription_interval = 2000  # 2 seconds
station.save()
print(f"✅ Updated to {station.subscription_interval}ms")

# For "Lutete Bore hole" station
station2 = OpcUaClientConfig.objects.get(station_name="Lutete Bore hole")
station2.subscription_interval = 2000
station2.save()
print(f"✅ Updated {station2.station_name}")

# Check all stations
for s in OpcUaClientConfig.objects.all():
    print(f"{s.station_name}: {s.subscription_interval}ms")
```

#### **Option C: Direct Database**

```bash
# SQLite
sqlite3 /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend/db.sqlite3

UPDATE roams_opcua_mgr_opccuaclientconfig 
SET subscription_interval = 2000 
WHERE station_name = 'testing';

SELECT station_name, subscription_interval FROM roams_opcua_mgr_opccuaclientconfig;
.quit
```

## Step 3: Verify It's Working

### Check Logs
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
tail -f logs/debug.log | grep -i "subscription\|interval"
```

### Verify in Django
```python
from roams_opcua_mgr.models import OpcUaReadLog
from django.utils.timezone import now, timedelta
import statistics

# Get last 50 readings for a station
logs = OpcUaReadLog.objects.filter(
    client_config__station_name='testing'
).order_by('-timestamp')[:50]

# Calculate intervals between readings
intervals = []
for i in range(len(logs)-1):
    diff = (logs[i].timestamp - logs[i+1].timestamp).total_seconds()
    intervals.append(diff)

if intervals:
    avg_interval = statistics.mean(intervals)
    print(f"Average interval: {avg_interval:.2f} seconds")
    print(f"Expected (from config): ~2.0 seconds")
    print(f"Match: {'✅ YES' if 1.8 < avg_interval < 2.2 else '❌ NO - check config'}")
```

### Watch Real-Time Data
```bash
# Terminal 1: Monitor backend
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
tail -f logs/debug.log

# Terminal 2: Check database updates
while true; do
  echo "=== Last reading time ==="
  sqlite3 db.sqlite3 "SELECT timestamp FROM roams_opcua_mgr_opcuareadlog ORDER BY timestamp DESC LIMIT 1;"
  sleep 5
done
```

## Step 4: Compare Data

### Export Data for Comparison
```python
from roams_opcua_mgr.models import OpcUaReadLog
from django.utils.timezone import now, timedelta
import csv

# Get 1 hour of data
one_hour_ago = now() - timedelta(hours=1)
logs = OpcUaReadLog.objects.filter(
    client_config__station_name='testing',
    timestamp__gte=one_hour_ago
).order_by('timestamp')

# Export to CSV
with open('roams_export.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Timestamp', 'Node', 'Value', 'Unit'])
    for log in logs:
        writer.writerow([
            log.timestamp,
            log.node.tag_name or log.node.node_id,
            log.value,
            log.node.tag_units or 'N/A'
        ])

print("✅ Exported to roams_export.csv")
```

Then compare `roams_export.csv` with the other SCADA system's export.

---

## Common SCADA Sampling Rates

| SCADA System | Typical Interval | Notes |
|--------------|------------------|-------|
| Ignition | Variable | Configurable per tag, often 1-5s |
| Wonderware | 1000-5000ms | Usually 5s default |
| GE FactoryTalk | 500-5000ms | Often 1s default |
| Siemens TIA | 100-5000ms | Can be very fast |
| OPC UA Standard | 100-60000ms | Our range: 1000-60000ms |

---

## Troubleshooting

### Problem: Sampling didn't change
**Solution**: 
1. Verify you saved in admin
2. Restart Django server: `pkill -f "python manage.py"`
3. Check new readings in database

### Problem: Intervals don't match other SCADA
**Solution**:
1. Double-check other SCADA's actual rate (may differ from settings)
2. Try interval matching (1000, 2000, 5000, 10000)
3. Check for network latency affecting timestamps
4. Verify both systems are using same timezone

### Problem: Too much data storage
**Solution**:
1. Increase interval to 10000-30000ms
2. Archive old data monthly
3. Consider data retention policy

### Problem: Missing fast changes
**Solution**:
1. Reduce interval to 1000-2000ms
2. Check if OPC UA server can handle faster rate
3. Monitor CPU/disk usage

---

## Default Sampling Rates (After Your Review)

| Station | Current | Recommended | Use Case |
|---------|---------|-------------|----------|
| testing | 5000ms | 2000ms | Match other SCADA? |
| Lutete Bore hole | 5000ms | 5000ms | Balanced |
| mityana bh1 | N/A | N/A | (Disabled - hostname issue) |

---

## When NOT to Change Sampling

❌ Don't decrease if:
- Database is already struggling (high disk I/O)
- Network bandwidth is limited
- Server CPU is consistently >80%
- Data storage is at capacity

❌ Don't increase if:
- You need to detect fast changes (alarms, events)
- Comparing with high-frequency SCADA (< 2 second)
- System performance is fine at current rate

---

## Summary Command

```bash
# One-liner to check and update all stations to 2-second interval
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py shell -c "from roams_opcua_mgr.models import OpcUaClientConfig; [s.save() for s in [setattr(OpcUaClientConfig.objects.get(station_name=s.station_name), 'subscription_interval', 2000) or OpcUaClientConfig.objects.get(station_name=s.station_name) for s in OpcUaClientConfig.objects.filter(active=True)]]"
```

**Simpler approach**: Just use Django Admin! ✅

