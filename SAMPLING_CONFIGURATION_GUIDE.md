# 📊 Sampling Time & Subscription Configuration Guide

## Overview

Your ROAMS system **HAS sampling/subscription configuration**, but it's **station-level only** (not per-node). This document explains how it works and whether it's suitable for SCADA comparison.

---

## Current Sampling Configuration

### Station-Level Subscription Interval

**Location**: Django Admin → OPC UA Client Configurations

**Field**: `subscription_interval` 
- **Default**: 5000ms (5 seconds)
- **Range**: 1000ms (1s) to 60000ms (60s)
- **Scope**: Applied to ALL nodes in that station

```python
# From: roams_opcua_mgr/models/client_config_model.py (Line 140)

subscription_interval = models.IntegerField(
    default=5000,  # 5 seconds
    validators=[MinValueValidator(1000), MaxValueValidator(60000)],
    help_text="Subscription interval in milliseconds (1000ms to 60000ms)."
)
```

---

## How It Works

### 1. Subscription Model
```
OPC UA Server
    ↓
[Station Config: subscription_interval = 5000ms]
    ↓
All Nodes Subscribe @ 5 second intervals
    ↓
Data received every 5 seconds (or when value changes)
    ↓
Django Database → API → Frontend
```

### 2. Current Data Flow

**File**: [roams_opcua_mgr/read_data.py](roams_opcua_mgr/read_data.py)

```python
def read_and_log_nodes(active_clients):
    """
    Read values from all nodes in all active clients and log them.
    Uses subscription_interval from station config.
    """
    while True:
        for station_name, client_handler in active_clients.items():
            # Reads ALL nodes every subscription_interval
            nodes = OPCUANode.objects.filter(
                client_config=client_handler.config
            )
            
            for node_config in nodes:
                # Get current value from OPC UA server
                value = opc_node.get_value()
                
                # Log to database
                OpcUaReadLog.objects.create(
                    node=node_config,
                    value=value,
                    timestamp=now(),
                    client_config=client_handler.config
                )
```

---

## ⚠️ Current Limitation: Single Sample Rate

### Problem
All nodes in a station MUST have the same sampling interval:

```
Station "testing"
├─ Node: Well Pressure → Sampled every 5 seconds ✓
├─ Node: Flow Rate → Sampled every 5 seconds ✓
├─ Node: Temperature → Sampled every 5 seconds ✓
└─ Node: Humidity → Sampled every 5 seconds ✓
    (Can't vary - all bound to station interval)
```

### Implications
- High-frequency nodes (e.g., pressure: need 100ms) must match slow nodes (e.g., temperature: need 1min)
- Wastes data storage for slow-changing parameters
- May miss rapid changes in fast-changing parameters

---

## 🔄 SCADA Comparison Requirements

### Is Sampling Configuration Required?

**SHORT ANSWER**: ✅ **YES, but only if comparing real-time data**

### Scenarios

| Scenario | Required | Notes |
|----------|----------|-------|
| **Comparing archived data** | ❌ NO | Historical data already timestamped |
| **Real-time monitoring** | ✅ YES | Both systems need same sample rate |
| **Alarms/events** | ⚠️ CONDITIONAL | Event-based systems don't need same rate |
| **Trend analysis** | ⚠️ CONDITIONAL | If comparing trends, intervals should align |
| **Data validation** | ✅ YES | Must match SCADA sample time to verify |

### SCADA Comparison Best Practices

```
Your System (ROAMS)          Other SCADA System
├─ Well 1 @ 5s              ├─ Well 1 @ 5s       ✅ MATCH
├─ Well 2 @ 5s              ├─ Well 2 @ 2s       ❌ MISMATCH
└─ Well 3 @ 5s              └─ Well 3 @ 5s       ✅ MATCH
```

**For accurate comparison**: Adjust subscription_interval to match other SCADA

---

## 🛠️ How to Adjust Sampling

### Method 1: Via Django Admin (Recommended)

1. Go to `/admin/`
2. Select **OPC UA Client Configurations**
3. Find the station (e.g., "testing")
4. Scroll to **Advanced Properties** → Show Advanced
5. Change **Subscription interval** (1000-60000 ms)
6. Click **Save**

**Example**:
- For fast sensors (pressure, flow): `1000ms` (1 second)
- For slow sensors (temperature): `30000ms` (30 seconds)
- General purpose: `5000ms` (5 seconds)

### Method 2: Via Django Shell

```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py shell
```

```python
from roams_opcua_mgr.models import OpcUaClientConfig

# Get the station
station = OpcUaClientConfig.objects.get(station_name="testing")

# Change subscription interval to 2 seconds (2000ms)
station.subscription_interval = 2000
station.save()

print(f"✅ Updated {station.station_name} to {station.subscription_interval}ms")
```

### Method 3: Database Direct

```bash
sqlite3 db.sqlite3  # or psql for PostgreSQL
UPDATE roams_opcua_mgr_opccuaclientconfig 
SET subscription_interval = 2000 
WHERE station_name = 'testing';
```

---

## 📈 Recommended Sampling Intervals

| Parameter Type | Interval | Use Case |
|----------------|----------|----------|
| **Pressure/Flow** | 500-1000ms | Critical, fast-changing |
| **Temperature** | 5000-10000ms | Stable, slow-changing |
| **Pump Status** | 1000-2000ms | Equipment state |
| **Daily Production** | 60000ms (1 min) | Cumulative totals |
| **General Purpose** | 5000ms (5 sec) | Default, balanced |

---

## 🚀 Feature Request: Per-Node Sampling

### Current System (Station-Level)
```
Advantages:
✅ Simple to configure
✅ Lower overhead
✅ Easy to synchronize with other SCADA

Disadvantages:
❌ All nodes must match station interval
❌ Wastes storage on slow parameters
❌ May miss events in fast parameters
```

### Proposed Enhancement: Per-Node Sampling
```python
class OPCUANode(models.Model):
    # ... existing fields ...
    
    sampling_interval = models.IntegerField(
        default=None,  # None = use station default
        null=True,
        blank=True,
        help_text="Override station sampling interval (ms). NULL = use station default"
    )
```

**Benefits**:
- Pressure: 500ms (high-frequency)
- Temperature: 30000ms (low-frequency)
- Both at same station, different intervals
- Optimizes storage and responsiveness

---

## 📊 Comparing with Other SCADA Systems

### Step 1: Determine Other System's Sample Rate

Common SCADA sample rates:
- **Ignition (Inductive Automation)**: Configurable per tag (10ms - 1hr)
- **Wonderware**: Typically 1000-5000ms
- **FactoryTalk**: Variable, often 500-5000ms
- **GE DigitalWorks**: Usually 1000ms
- **Siemens TIA Portal**: Typically 100-5000ms

### Step 2: Configure ROAMS to Match

```bash
If Other SCADA samples @ 2000ms:
→ Set ROAMS subscription_interval = 2000ms
```

### Step 3: Verify with Data Comparison

```python
# Backend: Check if timestamps align
from roams_opcua_mgr.models import OpcUaReadLog
from django.utils.timezone import now, timedelta

# Get last 100 readings
logs = OpcUaReadLog.objects.filter(
    client_config__station_name='testing'
).order_by('-timestamp')[:100]

# Calculate interval between readings
intervals = []
for i in range(len(logs)-1):
    diff = (logs[i].timestamp - logs[i+1].timestamp).total_seconds()
    intervals.append(diff)

avg_interval = sum(intervals) / len(intervals)
print(f"Average interval: {avg_interval:.2f} seconds")
print(f"Expected: ~2.0 seconds (2000ms)")
```

---

## ✅ Checklist: SCADA Comparison Setup

- [ ] Determine other SCADA system's sampling interval
- [ ] Adjust ROAMS subscription_interval to match
- [ ] Verify settings in Django Admin
- [ ] Wait for 1-2 intervals to collect aligned data
- [ ] Compare timestamps in database
- [ ] Validate data values match within tolerance
- [ ] Document the sampling rate in your system

---

## 🔍 Current System Diagnostics

### Check Current Subscription Interval

```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py shell
```

```python
from roams_opcua_mgr.models import OpcUaClientConfig

for station in OpcUaClientConfig.objects.all():
    print(f"{station.station_name}: {station.subscription_interval}ms")
```

### Monitor Actual Sample Rate

```bash
# Watch logs to see actual read frequency
tail -f logs/debug.log | grep "Read Task\|📖"
```

---

## 📝 Summary

| Question | Answer |
|----------|--------|
| **Does ROAMS have sampling config?** | ✅ YES (station-level) |
| **Can you adjust it?** | ✅ YES (1-60 seconds) |
| **Is it per-node?** | ❌ NO (all nodes at same rate) |
| **Required for SCADA comparison?** | ✅ YES (to align timestamps) |
| **How to match other SCADA?** | Adjust subscription_interval |
| **Can it be enhanced?** | ✅ YES (per-node sampling planned) |

---

## 🚨 Important Notes

### Data Storage Impact
```
Sampling Interval | Daily Volume (100 nodes) | Monthly Storage
─────────────────────────────────────────────────────────────
1 second          | 8,640,000 readings       | ~260 GB
5 seconds         | 1,728,000 readings       | ~52 GB  ✅ Current
30 seconds        | 288,000 readings         | ~8.7 GB
1 minute          | 144,000 readings         | ~4.3 GB
```

**Recommendation**: Use 5-30 second intervals for balance

### Performance Impact
- **Lower intervals** (1s) = More CPU/DB writes
- **Higher intervals** (60s) = Less responsive, may miss events
- **5s is optimal** for most industrial applications

---

## 🔗 Related Documentation

- [OPC UA Configuration Guide](PERFORMANCE_FIX_GUIDE.md)
- [API Reference](API_REFERENCE.md)
- [Threshold System](THRESHOLD_ARCHITECTURE.md)

