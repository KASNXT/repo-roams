# OPC UA Server Connectivity Diagnostic Report

**Date:** January 2, 2026  
**Status:** ⚠️ **CONNECTIVITY ISSUES IDENTIFIED**

---

## Executive Summary

The ROAMS system has **3 OPC UA servers configured**, but **connectivity issues prevent the system from detecting and reading node data**. Only 1 out of 3 servers can successfully connect.

### Current Status
- ✅ **Connected:** 0 servers (0%)
- 🔴 **Faulty:** 3 servers (100%)
- 📝 **Active:** 3 servers
- 📊 **Nodes Ready:** 10 nodes total (4 in testing, 6 in Lutete)

---

## Detailed Findings

### Server 1: **mityana bh1** 🔴
| Property | Value |
|----------|-------|
| Endpoint | `opc.tcp://kasmic.ddns.net:4840` |
| Status | ❌ **Faulty** |
| Last Connected | Never |
| Nodes Configured | 0 |

**Issue:** Network unreachable - `[Errno 101] Network is unreachable`

**Root Cause:**
- The hostname `kasmic.ddns.net` cannot be reached from the ROAMS server
- This could be due to:
  1. DNS resolution failure (DDNS service offline or misconfigured)
  2. Network firewall blocking outbound connection on port 4840
  3. OPC UA server is offline or the domain/IP is invalid
  4. The ROAMS backend is running in an isolated network

**Resolution Steps:**
```bash
# 1. Test if hostname resolves
ping kasmic.ddns.net

# 2. Test port connectivity
nc -zv kasmic.ddns.net 4840

# 3. Check if OPC UA server is running
# (depends on your infrastructure setup)
```

---

### Server 2: **testing** 🔴
| Property | Value |
|----------|-------|
| Endpoint | `opc.tcp://KASMIC_BA:53530/urn:KASMIC_BA:OPCUA:SimulationServer.prosy_test` |
| Status | ❌ **Faulty** |
| Last Connected | 2025-10-18 18:12:18 (old) |
| Nodes Configured | 4 |

**Issue:** Bad TCP Endpoint URL - `BadTcpEndpointUrlInvalid`

**Root Cause:**
- The endpoint URL contains an invalid query string path: `/urn:KASMIC_BA:OPCUA:SimulationServer.prosy_test`
- OPC UA expects the path format to be valid for the server's address space
- The server rejected the URL as malformed

**Resolution:**
You need to correct the endpoint URL. The correct URL should be:
```
opc.tcp://KASMIC_BA:53530/OPCUA/SimulationServer
```

(Same as "Lutete Bore hole" which works!)

---

### Server 3: **Lutete Bore hole** ✅
| Property | Value |
|----------|-------|
| Endpoint | `opc.tcp://KASMIC_BA:53530/OPCUA/SimulationServer` |
| Status | 🟡 **Faulty** (should be Connected) |
| Last Connected | 2025-12-29 22:53:42 |
| Nodes Configured | 6 |

**Status:** ✅ **Can connect** but currently showing as "faulty"

**Why it works:** 
- The endpoint URL is valid and properly formatted
- OPC UA server at KASMIC_BA:53530 is responding
- Connection test succeeded

**Why it shows as "Faulty":**
The connection status is "faulty" because the OPC UA client manager hasn't successfully re-established the connection since the last attempt. This is likely because:
1. The OPC UA client thread crashed or stopped
2. The client handler is not running for this server
3. There's a transient network issue that needs retry

---

## Recommended Actions

### Priority 1: Fix "testing" Server (Easy Fix)
The endpoint URL for the "testing" server is incorrect and needs to be corrected:

**Before:**
```
opc.tcp://KASMIC_BA:53530/urn:KASMIC_BA:OPCUA:SimulationServer.prosy_test
```

**After:**
```
opc.tcp://KASMIC_BA:53530/OPCUA/SimulationServer
```

**Steps:**
1. Go to Django Admin → OPC UA Client Config
2. Edit the "testing" server configuration
3. Change the endpoint URL to the correct one
4. Save and restart the OPC UA manager

---

### Priority 2: Diagnose kasmic.ddns.net Issue (Network Investigation)
The "mityana bh1" server at `kasmic.ddns.net:4840` cannot be reached.

**Steps:**
1. Verify the OPC UA server is running at that address
2. Check network connectivity from ROAMS backend server:
   ```bash
   ping kasmic.ddns.net
   nc -zv kasmic.ddns.net 4840
   ```
3. If network is blocked, configure firewall rules
4. If DDNS is misconfigured, update the address to a static IP

---

### Priority 3: Restart Lutete Bore hole Connection
Once other issues are resolved, force the Lutete connection to reconnect:

1. In Django Admin, go to OPC UA Client Config
2. Toggle "Active" off → Save
3. Toggle "Active" on → Save
4. Monitor the connection status

---

## OPC UA Client Manager Troubleshooting

### How to Check Client Status
```bash
# SSH into the ROAMS backend server
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend

# Check if Django is running
ps aux | grep runserver

# Check if OPC UA client threads are active
source venv_new/bin/activate
python manage.py shell
```

### How to Force Restart OPC UA Clients
```bash
# From Django shell
from roams_opcua_mgr.opcua_client import start_opcua_clients
start_opcua_clients()  # This will restart all connections
```

### Monitoring the Connection
```python
from roams_opcua_mgr.models import OpcUaClientConfig

# Check current status
for config in OpcUaClientConfig.objects.all():
    print(f"{config.station_name}: {config.connection_status}")
```

---

## Technical Details

### OPC UA Connection Flow
1. Django starts → `roams_opcua_mgr.apps.OpcuaMgrConfig.ready()`
2. Signals trigger → `roams_opcua_mgr.signals.refresh_clients()`
3. `start_opcua_clients()` runs in background thread
4. For each active server, `OPCUAClientHandler` attempts to connect
5. If connection succeeds → Connection status = "Connected"
6. If connection fails → Connection status = "Faulty"
7. `read_data.start_station_monitoring()` reads node values continuously

### Why Node Data Isn't Showing Up
- **Root cause:** OPC UA connections are all "Faulty"
- **Result:** `read_data.read_and_log_nodes()` skips disconnected servers
- **Impact:** No nodes are being read, no telemetry data is logged

### What Happens Once Fixed
1. Fix endpoint URLs
2. Resolve network connectivity
3. OPC UA clients reconnect with status = "Connected"
4. Node reading service resumes
5. Telemetry appears in the dashboard and database

---

## Next Steps

1. ✅ **Review this report** - Understand the root causes
2. 🔧 **Fix Priority 1** - Correct the "testing" endpoint URL
3. 🌐 **Fix Priority 2** - Diagnose kasmic.ddns.net network issue
4. 🚀 **Restart** - Force OPC UA client manager to reconnect
5. ✓ **Verify** - Check that servers show "Connected" status
6. 📊 **Monitor** - Verify node data appears in dashboards

---

## Files Involved

```
roams_backend/
├── roams_opcua_mgr/
│   ├── opcua_client.py         (Connection logic)
│   ├── read_data.py            (Node reading service)
│   ├── models/
│   │   ├── client_config_model.py  (Server configs - FIX THIS)
│   │   └── node_config_model.py    (Node definitions)
│   ├── apps.py                 (Startup logic)
│   └── signals.py              (Auto-restart on config change)
└── roams_pro/
    └── settings.py             (Django configuration)
```

---

## Diagnostic Commands

Run these commands for quick diagnosis:

```bash
# 1. Check server configuration
python manage.py shell << 'EOF'
from roams_opcua_mgr.models import OpcUaClientConfig
for config in OpcUaClientConfig.objects.all():
    print(f"{config.station_name}: {config.connection_status}")
EOF

# 2. Test endpoint connectivity
python << 'EOF'
from opcua import Client
client = Client("opc.tcp://KASMIC_BA:53530/OPCUA/SimulationServer")
client.connect()
print("✅ Connected!")
client.disconnect()
EOF

# 3. Check node count
python manage.py shell << 'EOF'
from roams_opcua_mgr.models import OPCUANode
print(f"Total nodes: {OPCUANode.objects.count()}")
EOF
```

---

**Generated:** 2026-01-02  
**Severity:** 🔴 Critical - System cannot detect or read OPC UA data
