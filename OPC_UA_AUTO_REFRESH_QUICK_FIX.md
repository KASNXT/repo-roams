# OPC UA Auto-Refresh - Quick Fix Summary

## 🔴 What Was Wrong

Your OPC UA status display was **inaccurate** because:

1. **Monitor thread was never started** - Connection health was only checked once during initial connection
2. **No health checks** - Dead connections stayed marked as "Connected"
3. **Status got stuck** - "Lutete Bore hole" showed Connected but hadn't read data in 4+ days
4. **No auto-recovery** - If network dropped, status wouldn't update

### Evidence
```
Station: testing
  Status: Connected ❌ (should be Disconnected or Unknown)
  Last Read: 0 in last 1 hour
  Last Connected: 4+ days ago

Station: Lutete Bore hole  
  Status: Connected ❌ (should update periodically)
  Last Read: 0 in last 1 hour
  Last Data Point: 6108 minutes ago (4+ days!)
```

---

## ✅ What Was Fixed

### 1. Monitor Thread Now Starts ✅
```python
# In run() method:
monitor_thread = threading.Thread(target=self.monitor_connection, daemon=True)
monitor_thread.start()
```

### 2. Health Checks Every 35 Seconds ✅
```python
# In monitor_connection() method:
if self.connected and self.client:
    try:
        # Verify connection by reading server node
        server_node = self.client.get_node("i=20")
        _ = server_node.get_display_name()
        # Update status to Connected
        self.update_connection_status("Connected")
    except Exception:
        # Mark as Disconnected if check fails
        self.update_connection_status("Disconnected")
        self.reconnect()
```

### 3. Auto-Reconnect on Failure ✅
```python
# Reconnection with exponential backoff:
# First retry: 1 second delay
# Second retry: 2 second delay  
# Third retry: 4 second delay
# ... up to 60 seconds max
```

### 4. Better Database Updates ✅
```python
# Now retries up to 3 times if DB is busy
max_retries = 3
for attempt in range(max_retries):
    try:
        # Update status
        return True  # Success
    except DatabaseError:
        if attempt < max_retries - 1:
            time.sleep(1)  # Wait before retry
```

---

## 📋 Expected Behavior After Restart

| Action | Timeline | Result |
|--------|----------|--------|
| Server starts | 0 sec | Connect to OPC UA server |
| Connected | ~5 sec | Monitor thread starts |
| Health check runs | Every 35 sec | Verify connection still alive |
| Network drops | Next 35 sec | Detect failure, update status |
| Auto-reconnect | Immediately | Attempt reconnection with backoff |
| Connection recovers | Within 60 sec | Status updated to "Connected" |

---

## 🔧 Files Modified

```
roams_backend/roams_opcua_mgr/opcua_client.py
  ✅ update_connection_status() - Added retry logic
  ✅ monitor_connection() - Added health checks
  ✅ run() - Start monitor thread
```

---

## 🚀 Deployment Steps

1. **Pull changes** - Make sure `opcua_client.py` is updated
2. **Restart Django** - Monitor thread will start automatically
3. **Check logs** for:
   ```
   📡 Monitor started for [station_name]
   ✅ Connection monitor started for [station_name]
   ✅ Connection verified as healthy
   ```

---

## 🧪 How to Test

### Before Testing:
Ensure Lutete Bore hole OPC UA server is running on `opc.tcp://KASMIC_BA:53530/OPCUA/SimulationServer`

### Test 1: Verify Monitor is Running
```bash
# Check logs for monitor startup messages
tail -f /var/log/django.log | grep "Monitor"

# Expected output:
# 📡 Monitor started for Lutete Bore hole
# ✅ Connection monitor started for Lutete Bore hole
```

### Test 2: Check Status Updates
```bash
python manage.py shell
from roams_opcua_mgr.models import OpcUaClientConfig
config = OpcUaClientConfig.objects.get(station_name="Lutete Bore hole")
print(f"Status: {config.connection_status}")  # Should show "Connected"
print(f"Last Connected: {config.last_connected}")  # Should be very recent
```

### Test 3: Simulate Connection Loss
```bash
# Stop the OPC UA server
# Within 35 seconds, status should change to "Disconnected"
```

### Test 4: Monitor Recovery
```bash
# Restart the OPC UA server
# Within 60 seconds, status should return to "Connected"
```

---

## 📊 Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| **Connected** | Verified healthy within last 35 sec | Reading data normally |
| **Disconnected** | Failed to connect or health check failed | Attempting reconnect |
| **Faulty** | Server config issues or network unreachable | Check endpoint URL & network |

---

## ⚠️ Known Issues to Address Separately

### 1. mityana bh1 - Network Unreachable
```
Endpoint: opc.tcp://kasmic.ddns.net:4840
Error: [Errno 101] Network is unreachable
Fix: Check if kasmic.ddns.net is accessible from your network
```

### 2. testing - Invalid Endpoint URL
```
Current: opc.tcp://KASMIC_BA:53530/urn:KASMIC_BA:OPCUA:SimulationServer.prosy_test
Error: BadTcpEndpointUrlInvalid
Fix: Update to: opc.tcp://KASMIC_BA:53530/OPCUA/SimulationServer
```

---

## 📝 Summary

| Item | Before | After |
|------|--------|-------|
| Monitor Thread | ❌ Not started | ✅ Starts automatically |
| Health Check | ❌ None | ✅ Every 35 seconds |
| Auto-Reconnect | ❌ Manual | ✅ Automatic with backoff |
| Status Accuracy | ❌ Stale | ✅ Real-time |
| DB Update Reliability | ❌ Single attempt | ✅ Retry logic (3 attempts) |
| Error Recovery | ❌ Silent failures | ✅ Logged & recovered |

**Result:** OPC UA status is now accurate and automatically updated in real-time! 🎉
