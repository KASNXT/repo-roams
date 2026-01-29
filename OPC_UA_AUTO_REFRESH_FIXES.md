# OPC UA Auto-Refresh Status Update - Investigation & Fixes

**Date:** January 3, 2026  
**Issue:** OPC UA servers not connecting and auto-refresh status not updating accurately

---

## 🔴 Problems Identified

### 1. **Monitor Thread Never Started**
- **Location:** `roams_opcua_mgr/opcua_client.py` - `run()` method
- **Issue:** Method `monitor_connection()` was defined but never called
- **Impact:** No continuous health checks after initial connection
- **Status:** Connection state could become stale and outdated

### 2. **No Health Check Mechanism**
- **Issue:** Once connected, no verification that connection is still alive
- **Impact:** Dead connections stay marked as "Connected"
- **Result:** Database shows "Connected" but no data is actually being read

### 3. **Connection Status Gets Stuck**
- **Example Data:**
  - `testing` server: Status = "Connected" but ZERO reads in last 1 hour
  - `Lutete Bore hole`: Status = "Connected" but last data from **6108 minutes ago** (4+ days)
  - Only exception: `mityana bh1` shows "faulty" (correct, unreachable network)

### 4. **No Automatic Reconnection on Failure**
- If network drops, monitor thread wasn't running to detect it
- Connection would stay marked as "Connected" despite being dead
- Frontend would show false "connected" status

### 5. **Insufficient Error Logging**
- Connection status updates didn't retry on database errors
- Failed updates were silently ignored
- Hard to debug connection issues

---

## ✅ Fixes Applied

### 1. **Enhanced `run()` Method**
```python
def run(self):
    """Start the client and keep it running with continuous monitoring."""
    # Initial connection attempt
    self.connect()
    
    # Retry connection if initial attempt fails
    while not self.connected:
        logger.warning(f"🔄 Retrying connection to {self.config.station_name}...")
        time.sleep(30)
        self.connect()
    
    # ✅ START MONITORING THREAD to continuously check connection health
    logger.info(f"🔄 Starting connection monitor for {self.config.station_name}...")
    monitor_thread = threading.Thread(target=self.monitor_connection, daemon=True)
    monitor_thread.start()
    
    # Keep main thread alive
    while True:
        time.sleep(60)
```

**Changes:**
- ✅ Now starts `monitor_connection()` thread after successful connection
- ✅ Monitor thread runs continuously in background
- ✅ Main thread kept alive to prevent process exit

### 2. **Improved `monitor_connection()` Method**
```python
def monitor_connection(self):
    """Continuously check the connection status and attempt reconnection if lost."""
    while True:
        try:
            # Refresh server status from database
            self.config.refresh_from_db()
            
            # Check if server should be active
            if not self.config.active and self.connected:
                self.disconnect()
                return
            
            # If server is active but not connected, reconnect
            if self.config.active and not self.connected:
                self.reconnect()
            
            # ✅ HEALTH CHECK: Verify connection is still alive
            if self.connected and self.client:
                try:
                    # Try to read server node to verify connection
                    server_node = self.client.get_node("i=20")
                    _ = server_node.get_display_name()
                    
                    # Connection is healthy
                    if self.config.connection_status != "Connected":
                        self.update_connection_status("Connected")
                
                except Exception as e:
                    # Connection is broken, reconnect
                    logger.warning(f"⚠️ Connection health check failed: {e}")
                    self.connected = False
                    self.update_connection_status("Disconnected")
                    self.reconnect()
        
        except Exception as e:
            logger.error(f"❌ Error in monitor_connection: {e}")
        
        time.sleep(35)  # Check every 35 seconds
```

**Changes:**
- ✅ Runs continuously every 35 seconds
- ✅ Performs health check by reading server node
- ✅ Automatically reconnects if health check fails
- ✅ Catches and logs all errors
- ✅ Updates DB status based on actual connection state

### 3. **Better Status Update with Retry Logic**
```python
def update_connection_status(self, status):
    """Update the connection status in the database safely with retry logic."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            self.config.refresh_from_db()
            self.config.connection_status = status
            
            with transaction.atomic():
                self.config.save(update_fields=["connection_status"])
                logger.info(f"✅ {self.config.station_name}: Status updated to '{status}'")
                return True
        
        except DatabaseError as db_err:
            logger.warning(f"⚠️ Database error (attempt {attempt + 1}/3): {db_err}")
            if attempt < 2:
                time.sleep(1)  # Wait before retry
                continue
            return False
        
        except Exception as e:
            logger.error(f"❌ Unexpected error: {e}")
            return False
```

**Changes:**
- ✅ Retries up to 3 times on database error
- ✅ Includes 1-second delays between retries
- ✅ Better error logging
- ✅ Returns success/failure status

---

## 📊 Current Status - Before Fixes

| Station | Status in DB | Last Connected | Recent Reads (1hr) | Issue |
|---------|--------------|-----------------|-------------------|-------|
| mityana bh1 | faulty | Never | 0 | Network unreachable |
| testing | Connected ❌ | 2026-01-02 | 0 | Invalid endpoint URL |
| Lutete Bore hole | Connected ❌ | 2026-01-02 | 0 | Monitor thread not running |

---

## 🔧 Next Steps

1. **Verify Endpoint URLs**
   ```
   ✅ mityana bh1: opc.tcp://kasmic.ddns.net:4840
      Issue: Network unreachable (fix: check network connectivity)
   
   ❌ testing: opc.tcp://KASMIC_BA:53530/urn:KASMIC_BA:OPCUA:SimulationServer.prosy_test
      Issue: BadTcpEndpointUrlInvalid - incorrect endpoint
      Fix: Use correct endpoint: opc.tcp://KASMIC_BA:53530/OPCUA/SimulationServer
   
   ✅ Lutete Bore hole: opc.tcp://KASMIC_BA:53530/OPCUA/SimulationServer
      Status: Successfully connected during test
   ```

2. **Restart OPC UA Manager**
   - Changes require server restart to take effect
   - Django will automatically start monitor threads when app initializes

3. **Monitor Logs**
   ```bash
   # Check for monitor thread startup messages
   tail -f /var/log/django.log | grep "monitor"
   ```

4. **Expected Behavior After Fix**
   - Every 35 seconds, health check is performed
   - If connection drops: Auto-reconnect with exponential backoff
   - Status updates accurately in real-time
   - Frontend shows correct connection state

---

## 🎯 Summary of Changes

| File | Method | Change | Impact |
|------|--------|--------|--------|
| opcua_client.py | `run()` | Start monitor thread | ✅ Continuous monitoring |
| opcua_client.py | `monitor_connection()` | Add health checks | ✅ Detect dead connections |
| opcua_client.py | `update_connection_status()` | Add retry logic | ✅ Reliable DB updates |

---

## 📈 Expected Improvements

- ✅ **Accurate Status:** Real-time connection health reflected in DB
- ✅ **Auto-Recovery:** Automatic reconnection on network failures
- ✅ **No Stale Status:** Dead connections detected within 35 seconds
- ✅ **Better Logging:** Detailed diagnostics for troubleshooting
- ✅ **Robust:** Handles database errors with retry logic

---

## 🚀 Testing the Fix

Run after deployment:

```bash
# Check if status updates to "Connected" automatically
python manage.py shell
from roams_opcua_mgr.models import OpcUaClientConfig
config = OpcUaClientConfig.objects.get(station_name="Lutete Bore hole")
print(f"Status: {config.connection_status}")  # Should show "Connected"
```

Expected after 35 seconds:
- Status should be "Connected" (working connection gets verified)
- If any connection drops, it will show "Disconnected" within 35 seconds
- Auto-reconnection attempts will begin immediately
