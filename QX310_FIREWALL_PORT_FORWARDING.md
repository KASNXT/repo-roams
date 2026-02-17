# QX310 Router: Firewall Port Forwarding Configuration Guide

## Overview

This guide explains how to configure firewall port forwarding on your Qixiang QX310 router to expose services (like OPC UA servers) from your local network to the VPS or remote administrators via VPN.

**Why Port Forwarding is Needed:**
- You have an OPC UA server at `192.168.1.100:4840` on your local network
- You want ROAMS backend to access it via VPN (10.99.0.2:4840)
- Without port forwarding, the router blocks external access to internal services
- Port forwarding creates a rule: "External connections to port X → Forward to internal IP:port Y"

---

## Network Topology

```
Local Network              QX310 Router              VPS/VPN
┌─────────────────┐       ┌──────────────┐         ┌──────────────┐
│ OPC UA Server   │       │              │         │ ROAMS Backend│
│ 192.168.1.100   │───→   │  Firewall    │◄────────│ 10.99.0.1   │
│ Port: 4840      │       │  Port-Forward│ L2TP    │ Wants access │
└─────────────────┘       └──────────────┘         └──────────────┘
                                │
                          [Port 4840]
                          Forward Rule:
                          4840 → 192.168.1.100:4840
```

---

## Step 1: Common Port Forwarding Rules for ROAMS

| Service | Port | Internal IP | Internal Port | Usage |
|---------|------|-------------|---------------|-------|
| **OPC UA Server** | 4840 | 192.168.1.100 | 4840 | SCADA data access |
| **Web Interface** | 8080 | 192.168.1.100 | 8080 | Station management |
| **SSH (Remote Admin)** | 2222 | 192.168.1.100 | 22 | Remote access |
| **Modbus** | 502 | 192.168.1.50 | 502 | PLC communication |
| **HTTP** | 80 | 192.168.1.100 | 80 | Web page access |

---

## Step 2: Access QX310 Firewall Settings

### Via Web Interface

1. **Open browser**: `http://192.168.1.1` (or your router's IP)
2. **Login** with admin credentials
3. **Navigate to:**
   - **Firewall** or **Network Security**
   - Look for: **Port Forwarding**, **Port Mapping**, or **Virtual Server**

### Menu Paths (May Vary by Firmware):
```
- Firewall → Port Forwarding
- Network → Firewall → Port Forwarding
- Security → Firewall → Port Mapping
- Advanced → Firewall → Virtual Server
```

---

## Step 3: Configure Port Forwarding Rule

### Example: Forward OPC UA (4840)

#### Method A: Auto-Discovery (If Available)

1. Go to **Firewall → Port Forwarding**
2. Look for **"Click here to add a new service"** or similar button
3. Select predefined service (may have OPC UA or custom options)
4. Choose internal device/IP
5. Click **Add** or **Apply**

#### Method B: Manual Configuration

1. **Go to**: Firewall → Port Forwarding
2. **Click**: Add Rule / New Mapping / + Button
3. **Fill in fields:**

```
┌─────────────────────────────────────────────┐
│ Port Forwarding Rule                         │
├─────────────────────────────────────────────┤
│ Enable:                    [✓] Checked       │
│ Rule Name:                 OPC-UA-Server     │
│ External Port:             4840              │
│ Internal IP:               192.168.1.100     │
│ Internal Port:             4840              │
│ Protocol:                  TCP               │
│ (or TCP+UDP if server uses both)            │
└─────────────────────────────────────────────┘
```

4. **Click Save / Apply**
5. Router may ask to reboot - click **Yes**

---

## Step 4: Complete Port Forwarding Examples

### Example 1: OPC UA Server (Recommended)

```
Rule Name:          OPC-UA-Bombo
External Port:      4840
Internal Device:    OPC UA Server (192.168.1.100)
Internal Port:      4840
Protocol:           TCP+UDP (or check server docs)
Enable:             ✓ Yes
```

**Why TCP+UDP?** OPC UA can use either; most use TCP. Use both to be safe.

### Example 2: Web Interface for Station Management

```
Rule Name:          Web-Admin-Bombo
External Port:      8080
Internal Device:    Web Server (192.168.1.100)
Internal Port:      8080
Protocol:           TCP
Enable:             ✓ Yes
```

### Example 3: SSH for Remote Terminal Access

```
Rule Name:          SSH-Bombo
External Port:      2222          # (using non-standard port for security)
Internal Device:    Linux Device (192.168.1.50)
Internal Port:      22
Protocol:           TCP
Enable:             ✓ Yes
```

**Note:** Use non-standard port (2222 instead of 22) to reduce automated attacks.

### Example 4: Modbus PLC

```
Rule Name:          Modbus-PLC
External Port:      502
Internal Device:    PLC (192.168.1.50)
Internal Port:      502
Protocol:           TCP+UDP
Enable:             ✓ Yes
```

---

## Step 5: Verify Port Forwarding is Working

### Test from VPS (After Connecting to L2TP)

```bash
# SSH to VPS
ssh deploy@YOUR_VPS_IP

# Test OPC UA port (4840)
nc -zv 10.99.0.2 4840
# OR
telnet 10.99.0.2 4840

# If successful, you'll see: "Connection successful" or similar
# If failed: "Connection refused" or timeout
```

### Test from External Network

Use an online port checking tool:
1. Go to: `https://www.yougetsignal.com/tools/open-ports/` (or similar)
2. Enter: `Your_Router_Public_IP` and port (e.g., `4840`)
3. Click Check
4. Should show: **Open** or **Connected**

### Detailed Test from VPS

```bash
# Test OPC UA connection
python3 << 'EOF'
from opcua import Client

try:
    client = Client("opc.tcp://10.99.0.2:4840")
    client.connect()
    print("✅ OPC UA connection successful!")
    root = client.get_root_node()
    print(f"Root node: {root}")
    client.disconnect()
except Exception as e:
    print(f"❌ Connection failed: {e}")
EOF
```

---

## Step 6: Security Hardening

### Important: Use L2TP VPN, Not Direct Internet Access

```
❌ BAD: Exposing OPC UA directly to internet
        opc.tcp://your_public_ip:4840
        
✅ GOOD: Access only via VPN
         Only ROAMS backend on VPS connects
         Access via: opc.tcp://10.99.0.2:4840 (VPN IP)
```

### Firewall Inbound Rules

**Disable direct internet access** to port forwarded ports:

1. **Advanced Firewall** section (if available)
2. Look for **Inbound Rules** or **Access Control**
3. Block external WAN access to port-forwarded ports
4. Allow only VPN network (10.99.0.0/24) access

**Example Rule:**
```
Deny:   External WAN → 4840
Allow:  VPN Network (10.99.0.0/24) → 4840
Allow:  Internal LAN (192.168.1.0/24) → 4840
```

### Change Default Credentials

```
1. Firewall settings → Administration → System
2. Change router admin password
3. Disable remote management (if available)
4. Disable UPnP (if enabled)
```

---

## Step 7: Troubleshooting Port Forwarding

### Issue 1: Port Shows as Closed in Tests

**Possible Causes:**
1. Rule not saved correctly
2. Rule disabled in firewall
3. Internal IP/port wrong
4. Service not running on internal device
5. Router firewall still blocking

**Fix:**
```bash
# 1. Verify rule in router admin panel
# 2. Check service is running: ssh to internal device
ssh 192.168.1.100
netstat -an | grep 4840  # Should show LISTENING

# 3. Try from internal network first
# From another device on LAN:
telnet 192.168.1.100 4840  # Should work

# 4. If internal works but external doesn't:
# - Rule may be disabled
# - Try disabling router firewall temporarily (not recommended long-term)
# - Check if ISP blocks port (rare but possible)
```

### Issue 2: Some Ports Work, Others Don't

**Possible Causes:**
1. ISP blocks common ports (22, 23, 80, 443)
2. Rule typo (port number wrong)
3. Protocol mismatch (TCP vs UDP)

**Fix:**
```bash
# Test from different port
# Instead of 4840, try 14840

Router Rule:
  External Port: 14840
  Internal Port: 4840

Then test: telnet your_ip 14840
```

### Issue 3: Port Forwarding Works, But OPC UA Fails

**Possible Causes:**
1. OPC UA server not bound to all interfaces
2. Server only listening on localhost (127.0.0.1)
3. Server listening on different port

**Fix - Check OPC UA Server Config:**
```bash
# SSH to device running OPC UA
ssh admin@192.168.1.100

# Check listening ports
netstat -an | grep 4840
# Should show: 0.0.0.0:4840 (all interfaces)
# NOT just: 127.0.0.1:4840 (localhost only)

# If only 127.0.0.1, configure OPC UA to bind to all interfaces
# This usually requires editing OPC UA server config
```

### Issue 4: Connection Drops or Times Out

**Possible Causes:**
1. Router resets/reboots frequently
2. L2TP connection unstable
3. MTU size issues
4. NAT session timeout

**Fix:**
```bash
# 1. Check router uptime
# In router admin: System → Status or About
# Should show days/weeks (not hours)

# 2. Reduce MTU in L2TP settings
# L2TP configuration → MTU: 1410

# 3. Increase keep-alive settings
# L2TP configuration → Keep-alive: Enabled
# Interval: 30 seconds

# 4. Restart router (safe)
# Router admin → System → Reboot
```

---

## Step 8: Port Forwarding Configuration Summary

### Quick Checklist

- [ ] Accessed router web interface (192.168.1.1)
- [ ] Found Firewall → Port Forwarding section
- [ ] Created port forwarding rule
- [ ] Filled in correct External Port
- [ ] Filled in correct Internal IP (192.168.1.x)
- [ ] Filled in correct Internal Port
- [ ] Selected correct Protocol (TCP, UDP, or both)
- [ ] Enabled the rule
- [ ] Clicked Save/Apply
- [ ] Rebooted router if prompted
- [ ] Tested port from external network
- [ ] Verified OPC UA/service is accessible

### Save Configuration Backup

1. Router Admin → **System** or **Administration**
2. Look for **Backup Configuration** or **Export Settings**
3. Download backup file (keep in safe place)
4. Restore if needed: **Upload Configuration** option

---

## Step 9: Multiple Services (Advanced)

If you need to forward multiple services:

### Port Forwarding Rules for Multi-Station Setup

```
Station: BOMBO
┌───────────────────────────────────────┐
│ external_port  →  internal_ip:port    │
├───────────────────────────────────────┤
│ 4840           →  192.168.1.100:4840  │ (OPC UA)
│ 8080           →  192.168.1.100:8080  │ (Web)
│ 2222           →  192.168.1.50:22     │ (SSH to PLC)
└───────────────────────────────────────┘

Station: NAKASONGOLA
┌───────────────────────────────────────┐
│ external_port  →  internal_ip:port    │
├───────────────────────────────────────┤
│ 4841           →  192.168.1.100:4840  │ (OPC UA - same port, diff ext)
│ 8081           →  192.168.1.100:8080  │ (Web)
└───────────────────────────────────────┘
```

**Important:** Use different external ports for different stations on same port.

---

## Step 10: Verify Configuration in ROAMS

After port forwarding is working:

### Update ROAMS Backend OPC UA Endpoint

```bash
# SSH to VPS
ssh deploy@your_vps_ip

# Access Django shell
cd /opt/roams/roams_backend
source venv_new/bin/activate
python manage.py shell
```

```python
from roams_opcua_mgr.models import OpcUaClientConfig

# Find station
station = OpcUaClientConfig.objects.get(station_name="Bombo")

# Update endpoint to use VPN IP
station.endpoint_url = "opc.tcp://10.99.0.2:4840"
station.save()

print(f"Updated: {station.endpoint_url}")

# Test connection
from roams_opcua_mgr.opcua_client import OpcUaClient
client = OpcUaClient(station)
if client.connect():
    print("✅ Connected successfully!")
    client.disconnect()
else:
    print("❌ Connection failed")
```

---

## Troubleshooting Matrix

| Problem | Symptom | Solution |
|---------|---------|----------|
| **Port Closed** | `telnet` fails | Check rule exists, enabled, correct port/IP |
| **Connection Refused** | `Connection refused` | Service not running on internal device |
| **Timeout** | No response | Firewall blocking, ISP blocking, or wrong IP |
| **OPC UA Fails** | Port works, OPC fails | OPC server config issue, wrong data types |
| **Intermittent** | Works then fails | Router restarts, L2TP disconnects, MTU issue |
| **Slow** | Response takes 5+ seconds | MTU too large, NAT timeout, overloaded router |

---

## Best Practices Summary

✅ **DO:**
- Use non-standard ports for sensitive services (SSH on 2222 instead of 22)
- Keep router firmware updated
- Use strong admin password
- Configure firewall to allow only VPN access
- Test port forwarding after configuration
- Document all forwarding rules
- Use L2TP VPN instead of exposing to internet

❌ **DON'T:**
- Use default router credentials
- Expose unnecessary ports
- Use port 80/443 unless needed for web
- Disable firewall completely
- Use standard ports for sensitive services (SSH on 22, etc.)
- Leave unused rules enabled

---

## Advanced: Access Control Lists (ACL)

If QX310 supports ACLs, create rules to restrict access:

**Example Rule:**
```
Port 4840 (OPC UA):
  Allow:  10.99.0.0/24 (VPN network)
  Allow:  192.168.1.0/24 (Local network)
  Deny:   All other sources
```

This ensures OPC UA is only accessible from VPN and local network, not from random internet users.

---

## Support Resources

- **QX310 Manual**: Check vendor documentation for your firmware version
- **Port Forwarding Guide**: https://portforward.com/ (has QX310 guides)
- **OPC UA on Port 4840**: Standard port, most OPC servers use this
- **Test Tools**: 
  - `netstat -an | grep PORT` (check if port is open)
  - `telnet IP PORT` (test connection)
  - Online port scanners (quick test)

---

## Next Steps

1. ✅ Configure port forwarding for OPC UA (4840)
2. ✅ Test from external network
3. ✅ Verify ROAMS can access via VPN
4. ✅ Add additional port rules as needed
5. ✅ Monitor stability (check logs weekly)
6. ✅ Update documentation with your rules

---

**Configuration Complete!** 🎉

Your QX310 router is now forwarding traffic to your internal services, accessible securely via L2TP/IPsec VPN to ROAMS backend.

For questions about specific services or ports, refer to the service documentation or contact support.
