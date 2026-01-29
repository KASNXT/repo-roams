# OPC UA Keep-Alive & Timeout Analysis

**Project:** ROAMS (Real-time Operations & Alarm Management System)  
**Date:** January 9, 2026  
**Status:** ✅ KEEP-ALIVE IMPLEMENTED (with optimization recommendations)

---

## Executive Summary

✅ **YES, your OPC UA client has keep-alive functionality**, but it's **passive-based** rather than **active-based**. Your system relies on continuous node reading + connection health checks rather than explicit OPC UA subscription mechanisms.

### Current Implementation Status

| Feature | Status | Details |
|---------|--------|---------|
| **Connection Monitoring** | ✅ Implemented | 35-second health check cycles |
| **Automatic Reconnection** | ✅ Implemented | Exponential backoff (max 60s) |
| **Session Timeout Config** | ✅ Implemented | Configurable: 5-600 seconds (default 30s) |
| **Request Timeout** | ✅ Implemented | Configurable: 1-60 seconds (default 10s) |
| **Active Keep-Alive Pings** | ❌ Not Implemented | **RECOMMENDATION: Add this** |
| **OPC UA Subscriptions** | ⚠️ Partial | Only for threshold notifications, not for keep-alive |
| **Read Loop Interval** | ✅ Implemented | 20-second read cycle with retry logic |

---

## Current Keep-Alive Mechanism

### 1. **Passive Keep-Alive (via Node Reading)**

**File:** `roams_backend/roams_opcua_mgr/read_data.py`

```python
def read_and_log_nodes(active_clients):
    """
    Continuously reads values from nodes every 20 seconds.
    This implicitly keeps the connection alive.
    """
    while True:
        for station_name, client_handler in active_clients.items():
            # Read node values every 20 seconds
            opc_node = client_handler.client.get_node(node_config.node_id)
            value = opc_node.get_value()  # ← Implicit keep-alive via activity
        
        time.sleep(20)  # 20-second read interval
```

**How It Works:**
- Every 20 seconds, the system reads values from all configured nodes
- Each node read (`get_value()`) constitutes network activity
- The OPC UA server sees this activity and keeps the session alive
- Session timeout (default 30 seconds) is reset with each read

**Pros:**
- ✅ Simple, proven approach
- ✅ Provides meaningful data (sensor readings)
- ✅ No extra network overhead
- ✅ Works with all OPC UA servers

**Cons:**
- ❌ If **no nodes are configured**, session will timeout!
- ❌ Relies on **having something to read** every 20 seconds
- ❌ Network hiccups could disconnect session temporarily
- ❌ Less efficient than explicit keep-alive ping

---

### 2. **Connection Health Monitoring** 

**File:** `roams_backend/roams_opcua_mgr/opcua_client.py`

```python
def monitor_connection(self):
    """Runs every 35 seconds to verify connection is alive."""
    while True:
        # ✅ HEALTH CHECK: Read server node to verify connection
        if self.connected and self.client:
            try:
                server_node = self.client.get_node("i=20")  # Server node
                _ = server_node.get_display_name()  # ← Verification ping
                
                # Connection is healthy
                self.update_connection_status("Connected")
            except Exception as e:
                # Connection is broken, reconnect
                logger.warning(f"Connection health check failed: {str(e)}")
                self.connected = False
                self.reconnect()
        
        time.sleep(35)  # Check every 35 seconds
```

**How It Works:**
- Every 35 seconds, reads the OPC UA server's info node ("i=20")
- If it fails, marks connection as broken and triggers reconnection
- This acts as an explicit "are you alive?" check

**Pros:**
- ✅ Detects disconnections quickly (35-second window)
- ✅ Automatic reconnection with exponential backoff
- ✅ Separate from business logic (node reads)
- ✅ Works even if no data nodes configured

**Cons:**
- ⚠️ Runs every 35 seconds (could miss brief disconnects)
- ❌ Still passive (reacts to problems vs. proactively preventing them)

---

### 3. **Timeout Configuration**

**File:** `roams_backend/roams_opcua_mgr/models/client_config_model.py`

```python
session_time_out = models.IntegerField(
    default=30000,  # 30 seconds
    validators=[MinValueValidator(5000), MaxValueValidator(600000)],
    help_text="Session timeout in milliseconds. Server keeps session alive 
              this long with no activity. Range: 5-600 seconds"
)

subscription_interval = models.IntegerField(
    default=5000,  # 5 seconds - BALANCED
    help_text="How often to read values from OPC UA server."
)
```

**Current Timeout Settings:**
- Session Timeout: **30 seconds** (30,000 ms)
- Read/Subscription Interval: **5 seconds** (5,000 ms)
- Health Check Interval: **35 seconds**
- Request Timeout: **10 seconds**
- Connection Timeout: **5 seconds**

**Analysis:**
- ✅ **Good!** Read interval (5s) is faster than session timeout (30s)
- ✅ Session timeout is longer than health check (35s) - **slightly risky**
- ⚠️ **Issue:** Health check (35s) > Session timeout (30s) - **TIMEOUT POSSIBLE BETWEEN CHECKS!**

---

## ⚠️ IDENTIFIED GAPS

### Gap 1: Health Check Interval > Session Timeout

**Problem:**
```
Session Timeout: 30 seconds
Health Check: 35 seconds
↓
If no node reads happen between 30-35 seconds, session dies!
```

**Scenario:**
1. Last node read at 0:00
2. Session timeout expires at 0:30 (no activity)
3. Health check runs at 0:35
4. Connection is dead ✗

### Gap 2: No Active Keep-Alive Ping

The system relies entirely on reading data nodes. If:
- No nodes are configured
- All nodes fail to read
- Network is congested and reads are delayed

**Then:** Session will timeout!

### Gap 3: Single Point of Failure in Read Loop

If `read_and_log_nodes()` crashes, there's no keep-alive mechanism at all.

---

## ✅ RECOMMENDATIONS

### Priority 1: Implement Active Keep-Alive Subscription

**Recommendation:** Add explicit OPC UA subscription mechanism for keep-alive.

```python
# File: roams_backend/roams_opcua_mgr/opcua_client.py

def ensure_keep_alive(self):
    """
    Creates a minimal subscription ONLY for keep-alive.
    Reads a dummy node every 15 seconds (half the session timeout).
    Ensures connection stays alive even with no data nodes.
    """
    if not self.client:
        return
    
    try:
        # Subscribe to server node with 15-second interval
        subscription = self.client.create_subscription(
            period=15000,  # 15 seconds in milliseconds
            handler=KeepAliveHandler()
        )
        
        # Subscribe to a safe node that always exists
        server_node = self.client.get_node("i=20")  # Server object node
        subscription.subscribe_data_change(server_node)
        
        logger.info(f"✅ Keep-alive subscription created for {self.config.station_name}")
        return subscription
        
    except Exception as e:
        logger.warning(f"Keep-alive subscription failed: {e}")
        return None
```

**Benefits:**
- ✅ Explicit 15-second ping (keeps 30s session alive)
- ✅ Works even if no data nodes configured
- ✅ Minimal overhead (single node subscription)
- ✅ Standard OPC UA best practice

### Priority 2: Synchronize Timeout Settings

**Current:**
```
Session Timeout: 30 seconds
Health Check: 35 seconds  ❌ PROBLEM
Read Interval: 5 seconds  ✅ Good
```

**Recommended:**
```
Session Timeout: 60 seconds (increase)
Read Interval: 5 seconds
Health Check: 25 seconds (< session timeout)
```

**Configuration Change:**
```python
# In client_config_model.py
session_time_out = models.IntegerField(
    default=60000,  # 60 seconds (increased)
    validators=[MinValueValidator(10000), MaxValueValidator(600000)],
)

# Then in monitor_connection()
def monitor_connection(self):
    while True:
        # ... health check logic ...
        time.sleep(25)  # Changed from 35 to 25 (< 60s session)
```

### Priority 3: Add Connection State Validation

```python
def validate_connection_ready(self):
    """
    Ensures connection is actually ready for operations.
    Called before performing critical reads/writes.
    """
    if not self.connected or not self.client:
        logger.error("Connection not ready!")
        self.reconnect()
        return False
    
    try:
        # Quick server ping
        server_node = self.client.get_node("i=20")
        _ = server_node.get_browse_name()
        return True
    except Exception as e:
        logger.error(f"Connection validation failed: {e}")
        self.reconnect()
        return False
```

### Priority 4: Add Graceful Degradation

```python
def read_and_log_nodes(active_clients):
    """Enhanced to handle read failures gracefully."""
    read_failures = {}
    
    while True:
        for station_name, client_handler in active_clients.items():
            try:
                # Validate before operations
                if not client_handler.validate_connection_ready():
                    continue
                
                # ... node reading logic ...
                
            except Exception as e:
                read_failures[station_name] = read_failures.get(station_name, 0) + 1
                
                # After 3 failures, force reconnect
                if read_failures[station_name] >= 3:
                    logger.error(f"Too many failures for {station_name}, reconnecting...")
                    client_handler.reconnect()
                    read_failures[station_name] = 0
        
        time.sleep(20)
```

---

## 📊 Best Practices for OPC UA Keep-Alive

### 1. **Multiple Layers of Keep-Alive**

```
Layer 1: Implicit (node reads)        - Your current 5-second read
Layer 2: Explicit (subscription)      - Recommended 15-second ping
Layer 3: Health monitoring            - Your current 35-second check
```

### 2. **Session Timeout Rule of Thumb**

```
Session Timeout = 2-3 × (Max interval between any activity)

Your setup:
- Read Interval: 5 seconds
- Recommended Session Timeout: 15-30 seconds

Conservative approach:
- Session Timeout: 60 seconds
- Keep-Alive Ping: 30 seconds (half)
```

### 3. **Exponential Backoff for Reconnection**

✅ **Already implemented:**
```python
retry_delay = min(60, 2 ** retry_attempts)  # Doubles each attempt, capped at 60s
```

This is **excellent practice**!

### 4. **Connection State Tracking**

Your current approach (3 states):
- Connected
- Disconnected
- Faulty ✅

**Should add:**
- Connecting (during reconnection attempt)
- Degraded (read errors but still connected)

### 5. **Monitor Key Metrics**

```python
# Track in database
- Reconnection count per hour
- Average session lifetime
- Read failure rate
- Health check success rate
```

---

## Implementation Priority

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Adjust health check interval to < session timeout | 5 min | Critical |
| **P1** | Implement active keep-alive subscription | 30 min | High |
| **P2** | Add connection validation before reads | 15 min | Medium |
| **P3** | Add graceful degradation logic | 20 min | Medium |
| **P4** | Add metrics/monitoring dashboard | 2 hours | Low |

---

## Testing Checklist

- [ ] Disconnect network → observe automatic reconnection
- [ ] Kill OPC UA server → verify Faulty status within 35 seconds
- [ ] Leave idle > 30 seconds → verify keep-alive keeps connection alive
- [ ] Configure zero nodes → verify keep-alive still works
- [ ] Simulate network latency (tc command) → verify timeout handling
- [ ] Monitor reconnection attempts over 24 hours → verify no cascading failures

---

## Code Files to Review/Modify

1. ✅ `roams_backend/roams_opcua_mgr/opcua_client.py` - Main client handler
2. ✅ `roams_backend/roams_opcua_mgr/read_data.py` - Node reading loop
3. ✅ `roams_backend/roams_opcua_mgr/models/client_config_model.py` - Timeout config
4. ⚠️ `roams_backend/roams_opcua_mgr/apps.py` - Client initialization

---

## Current Status Summary

| Aspect | Status | Confidence |
|--------|--------|-----------|
| Keep-alive exists? | ✅ Yes (passive) | 95% |
| Prevents timeouts? | ⚠️ Mostly | 70% |
| Handles disconnects? | ✅ Yes | 90% |
| Follows OPC UA standards? | ⚠️ Partially | 65% |
| Production ready? | ⚠️ With changes | 60% |

**Verdict:** Your system works but has a **hidden timeout vulnerability** (health check > session timeout). Implementing the Priority 0 fix is **essential for stability**.

