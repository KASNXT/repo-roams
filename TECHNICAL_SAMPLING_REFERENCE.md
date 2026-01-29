# 🔬 Technical Reference: Sampling Architecture & SCADA Integration

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ ROAMS OPC UA Sampling Architecture                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  OPC UA Server       │
│ (External System)    │
└──────────────────────┘
         ↓ (Network)
┌──────────────────────┐
│ ROAMS Backend        │
│ (Django)             │
└──────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ OPCUAClientHandler (opcua_client.py)                     │
│ • Manages connection to OPC UA server                    │
│ • Applies subscription_interval from config             │
└──────────────────────┬───────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────┐
│ Subscription Handler (opcua library)                     │
│ • Subscribes to each OPCUANode                           │
│ • Publishes data every subscription_interval ms          │
│ • Buffering if value changes before interval             │
└──────────────────────┬───────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────┐
│ read_and_log_nodes() (read_data.py)                      │
│ • Reads current values from OPC UA subscription          │
│ • Evaluates thresholds (if configured)                   │
│ • Logs to OpcUaReadLog table                             │
│ • Creates ThresholdBreach if limits exceeded             │
└──────────────────────┬───────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────┐
│ Database (SQLite or PostgreSQL)                          │
│ Tables:                                                  │
│ • OpcUaReadLog (timestamp, node_id, value)              │
│ • ThresholdBreach (timestamp, node, breach_type)        │
│ • AlarmLog (timestamp, node, message, severity)         │
└──────────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────┐
│ API Endpoints (roams_api/views.py)                       │
│ GET /api/read-logs/ → Historical telemetry data          │
│ GET /api/breaches/ → Threshold breaches                 │
│ GET /api/telemetry/ → Filtered telemetry for Analysis   │
└──────────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────┐
│ Frontend (React - Analysis.tsx)                          │
│ • Charts rendering telemetry data                        │
│ • Alarms table showing breaches                          │
│ • Data points spaced by sampling interval                │
└──────────────────────────────────────────────────────────┘
```

---

## Sampling Configuration Flow

```
┌─────────────────────────────────────────────────────┐
│ Admin Sets subscription_interval                    │
│ (e.g., 5000ms via Django Admin)                     │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ OpcUaClientConfig Model                             │
│ .subscription_interval = 5000  # milliseconds       │
│ .save()                                             │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Signal Handler (signals.py)                         │
│ @receiver(post_save, sender=OpcUaClientConfig)     │
│ Triggers: start_opcua_clients() [in background]    │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ OPCUAClientHandler.connect()                        │
│ Creates client connection with config               │
│ Reads: client_config.subscription_interval          │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ OPC UA Library (python-opcua)                       │
│ Creates subscription with interval parameter        │
│ Subscribes to all nodes in client                   │
│ Callbacks trigger every interval (or on change)     │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Data Logged Every Interval                          │
│ ✓ OpcUaReadLog table populated                      │
│ ✓ Threshold checks performed                        │
│ ✓ Frontend receives latest data                     │
└─────────────────────────────────────────────────────┘
```

---

## Code Implementation

### 1. Configuration Model
```python
# roams_opcua_mgr/models/client_config_model.py
class OpcUaClientConfig(models.Model):
    station_name = models.CharField(max_length=100)
    endpoint_url = models.CharField(max_length=2048)
    active = models.BooleanField(default=False)
    
    # ... security settings ...
    
    subscription_interval = models.IntegerField(
        default=5000,  # 5 seconds
        validators=[MinValueValidator(1000), MaxValueValidator(60000)],
        help_text="Subscription interval in milliseconds (1000ms to 60000ms)."
    )
```

### 2. Client Handler
```python
# roams_opcua_mgr/opcua_client.py
class OPCUAClientHandler:
    def __init__(self, client_config):
        self.config = client_config
        self.subscription_interval = client_config.subscription_interval
        # Other initialization...
    
    def create_subscription(self):
        """Create OPC UA subscription with configured interval"""
        try:
            # Create subscription with our interval
            sub = self.client.create_subscription(
                self.subscription_interval,  # Use from config!
                sub_handler  # Callback handler
            )
            # Subscribe all nodes
            for node in self.nodes:
                sub.subscribe_data_change(node)
            logger.info(f"Subscription created: {self.subscription_interval}ms")
        except Exception as e:
            logger.error(f"Failed to create subscription: {e}")
```

### 3. Data Reading Loop
```python
# roams_opcua_mgr/read_data.py
def read_and_log_nodes(active_clients):
    """
    Main reading loop - executes every subscription_interval
    """
    while True:
        for station_name, client_handler in active_clients.items():
            if not client_handler.connected:
                continue
            
            # Get all nodes for this client
            nodes = OPCUANode.objects.filter(
                client_config=client_handler.config
            )
            
            for node_config in nodes:
                try:
                    # Read current value (from subscription buffer)
                    opc_node = client_handler.client.get_node(node_config.node_id)
                    value = opc_node.get_value()
                    
                    # Log to database
                    OpcUaReadLog.objects.create(
                        node=node_config,
                        value=value,
                        timestamp=now(),
                        client_config=client_handler.config
                    )
                    
                    # Evaluate thresholds
                    evaluate_threshold(node_config, value)
                    
                except Exception as e:
                    logger.warning(f"Failed to read {node_config.node_id}: {e}")
        
        # Sleep until next interval
        time.sleep(client_handler.config.subscription_interval / 1000)
```

### 4. Frontend Integration
```tsx
// roams_frontend/src/pages/Analysis.tsx

// Fetch telemetry data with sampling-aware interval
const fetchHistory = async (station: string, from: Date, to: Date) => {
    // Make API call
    const res = await api.get("/telemetry/", {
        params: {
            station,
            from: from.toISOString(),
            to: to.toISOString(),
        },
    });
    
    // Data points will be spaced by sampling_interval
    // If sampling is 5s: expect ~288 points per hour (60*60/5)
    return res.data || [];
};

// Render chart with data points
const data = {
    labels: historyData.map(h => new Date(h.timestamp)),
    datasets: [{
        data: historyData.map(h => h.value),
        // Points naturally spaced by subscription_interval
    }]
};
```

---

## SCADA Integration Points

### Data Export for Comparison
```python
# Export utility for SCADA comparison
def export_telemetry_for_comparison(station_name, start_time, end_time):
    """Export data in format suitable for SCADA comparison"""
    logs = OpcUaReadLog.objects.filter(
        client_config__station_name=station_name,
        timestamp__gte=start_time,
        timestamp__lte=end_time
    ).order_by('timestamp')
    
    # CSV format understood by SCADA systems
    data = [{
        'timestamp': log.timestamp.isoformat(),
        'node_id': log.node.node_id,
        'tag_name': log.node.tag_name,
        'value': log.value,
        'unit': log.node.tag_units,
    } for log in logs]
    
    return data  # JSON or CSV
```

### Timestamp Alignment
```python
# Verify sampling alignment with other SCADA
def verify_sampling_alignment(roams_data, scada_data, tolerance_ms=100):
    """
    Verify that ROAMS and SCADA have aligned sampling times.
    Returns True if timestamps are within tolerance.
    """
    roams_times = [parse(p['timestamp']) for p in roams_data]
    scada_times = [parse(p['timestamp']) for p in scada_data]
    
    # Check if timestamps align within tolerance
    for rt, st in zip(sorted(roams_times), sorted(scada_times)):
        diff_ms = abs((rt - st).total_seconds() * 1000)
        if diff_ms > tolerance_ms:
            return False  # Not aligned
    
    return True  # Aligned!
```

---

## Performance Characteristics

### Data Volume Impact
```
Sampling Interval | Readings/Hour | Daily Volume | Monthly Storage
──────────────────────────────────────────────────────────────────
500ms (0.5s)      | 7,200         | 172,800      | 5.2 GB
1 second          | 3,600         | 86,400       | 2.6 GB
2 seconds         | 1,800         | 43,200       | 1.3 GB
5 seconds (curr)  | 720           | 17,280       | 519 MB ✅
10 seconds        | 360           | 8,640        | 260 MB
30 seconds        | 120           | 2,880        | 86 MB
60 seconds        | 60            | 1,440        | 43 MB
```
*Estimates based on 100 active nodes, 10 bytes per reading*

### Query Performance
```python
# Fast: Sampling at 5s creates reasonable database size
SELECT COUNT(*) FROM roams_opcua_mgr_opcuareadlog 
WHERE timestamp > NOW() - INTERVAL '1 day'
# Result: ~1.7M rows for 100 nodes (fast query < 100ms)

# Slow: Sampling at 500ms creates huge dataset
SELECT COUNT(*) FROM roams_opcua_mgr_opcuareadlog 
WHERE timestamp > NOW() - INTERVAL '1 day'
# Result: 17M rows for 100 nodes (slow query > 5s)
```

---

## Troubleshooting

### Symptom: Data Not Updating as Expected
```
Diagnosis:
1. Check subscription_interval in database
2. Verify timestamps in OpcUaReadLog are recent
3. Confirm OPC UA server is sending updates
4. Check network connectivity

Solution:
if OpcUaReadLog.timestamp < now() - 1 minute:
    → Subscription may have stalled
    → Restart Django or reconnect client
```

### Symptom: Gaps in Data (Missing Readings)
```
Diagnosis:
1. Normal: Small gaps are expected (network, processing)
2. Large gaps: Check OPC UA server or connection status
3. Pattern gaps: May indicate subscription timeout

Solution:
Check client logs for disconnection events
Review OPC UA server memory/CPU usage
Verify network MTU size supports subscription updates
```

### Symptom: Data Rate Doesn't Match Config
```
Diagnosis:
1. Subscription created with wrong interval
2. OPC UA server ignoring subscription request
3. Value hasn't changed (if server deduplicates)

Solution:
Verify subscription_interval in database
Check OPC UA server configuration
Try enabling "publish every interval" in server
Restart subscription
```

---

## Best Practices

### 1. Choosing Sample Rate
```
For SCADA Comparison:
✓ Match the other system's sampling rate EXACTLY
✓ Document the agreed rate in both systems
✓ Test with sample data first

For Performance:
✓ Use 5-10 seconds for general monitoring
✓ Use 1-2 seconds only if critical changes must be captured
✓ Monitor database growth - adjust if exceeds 500MB/month

For Storage Optimization:
✓ Use 30-60 seconds for archival data
✓ Archive old data separately
✓ Query recent data (< 7 days) more frequently
```

### 2. Configuration
```
In Django Admin:
✓ Set subscription_interval in OPC UA Client Configuration
✓ Enable "Show Advanced Properties" to see it
✓ Always document why you chose that interval
✓ Don't exceed 60000ms (60 seconds) without reason

For Multiple Stations:
✓ Keep all stations synchronized (same interval)
✓ If they need different rates, that's a future enhancement
✓ Compromise: use 5-10 seconds as middle ground
```

### 3. Monitoring
```
Regular checks:
✓ Log file size (should grow ~1-2 MB/day for 100 nodes @ 5s)
✓ Database size (should grow ~500 MB/month)
✓ API response times (should be <500ms for 1 week of data)
✓ Data freshness (latest reading should be < 2 * interval)
```

---

## Conclusion

Your ROAMS system has **station-level sampling configuration** that is:
- ✅ **Easy to adjust** (Admin panel or API)
- ✅ **Essential for SCADA comparison** (must match)
- ✅ **Flexible** (1-60 second range)
- ⚠️ **Limited** (not per-node, planned enhancement)
- ✅ **Well-integrated** (automatically applies to all nodes)

For SCADA comparison, simply match the subscription_interval to the other system's sample rate.

