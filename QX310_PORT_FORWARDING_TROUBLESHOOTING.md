# QX310 Port Forwarding - Troubleshooting Guide

## Symptom 1: "Connection Refused" Error

### What It Means
```
telnet 10.99.0.2 4840
→ Connection refused
```
Port forwarding rule exists, but the internal service isn't running.

### Diagnostic Steps

**Step 1: Verify Rule Exists**
```bash
# From VPS (after L2TP connects to router)
# Check if port is open (not refused, just not responding)
timeout 5 telnet 10.99.0.2 4840

Expected:
  ✅ "Connected" → Service running
  ❌ "Connection refused" → Service not running
  ❌ "Timeout/No route" → Rule not saved
```

**Step 2: Check Service on Internal Device**
```bash
# SSH to the device running OPC UA
ssh admin@192.168.1.100
# or: ssh 192.168.1.100

# Check what ports are listening
netstat -an | grep 4840
# or newer command:
ss -tulpn | grep 4840

Expected Output:
  ✅ 0.0.0.0:4840    LISTEN  (listening on all interfaces)
  ❌ 127.0.0.1:4840  LISTEN  (only localhost - needs config fix)
  ❌ (no output)     (service not running - start it)
```

**Step 3: Start the Service**

For OPC UA server (example):
```bash
# Check if running
ps aux | grep opcua
ps aux | grep python  # or whatever runs OPC UA

# Start the service
sudo systemctl start opcua-service
# or:
sudo service opcua start
# or run directly:
python3 /path/to/opc-server.py &
```

### Solution

1. **If service not running:** Start it first
2. **If only localhost:** Configure OPC UA to bind to all interfaces (0.0.0.0)
3. **If rule missing:** Go back and create rule in router

---

## Symptom 2: "Connection Timeout"

### What It Means
```
telnet 10.99.0.2 4840
→ (hangs for 30 seconds, then times out)
```
No response from router - either rule not saved or port is blocked elsewhere.

### Diagnostic Steps

**Step 1: Check Router Rule**
```bash
# Go to router web interface: 192.168.1.1
# Firewall → Port Forwarding
# Look for your rule - is it there?
```

**Problem Checklist:**
- [ ] Rule was not saved (clicked OK but didn't click Save/Apply)
- [ ] Rule is disabled (unchecked box)
- [ ] Wrong port number (typo in port field)
- [ ] Wrong internal IP (typo in IP address)
- [ ] Wrong protocol selected

**Step 2: Check Network Connectivity**

```bash
# Can you reach VPS via L2TP at all?
ping 10.99.0.1
# From inside L2TP connection

# Result:
# ✅ Reply → Connection OK, problem is port-specific
# ❌ Timeout → L2TP connection issue first
```

**Step 3: Check Router Firewall (Advanced)**

Some QX310 models have additional firewall rules:
```bash
# From internal network (device on LAN):
telnet 192.168.1.100 4840
# Should work immediately

# If internal works but external (via VPN) doesn't:
# → Router has extra firewall blocking external access
```

### Solution

1. **Rule wasn't saved:** Re-do the rule, make sure to click Save/Apply
2. **If still timeout:** Temporarily disable router firewall (factory reset button)
3. **If still timeout:** ISP may be blocking port (try port 14840 instead)
4. **If internal works, external doesn't:** Configure firewall to allow VPN access

---

## Symptom 3: Port Works, But OPC UA Still Fails

### What It Means
```
telnet 10.99.0.2 4840
→ Connected (port forwarding works!)

But in ROAMS:
→ Cannot connect to OPC.tcp://10.99.0.2:4840
```

Port is open, but application fails to connect.

### Common Causes

**Cause 1: Wrong Port on Internal Device**

```bash
# Your rule says forward to port 4840
# But OPC UA is actually running on port 4841

# Check actual port:
ssh 192.168.1.100
netstat -an | grep LISTEN | grep -E "(opcua|python)"

# If you see port 4841 instead of 4840:
# Fix: Update rule
# Internal Port: change from 4840 to 4841
```

**Cause 2: Firewall on Internal Device**

```bash
# Internal server may have its own firewall (Windows Firewall, ufw, etc)

# Check on internal device:
sudo ufw status
# or Windows: netsh advfirewall show allprofiles | grep State

# If blocked, allow port 4840:
sudo ufw allow 4840/tcp
```

**Cause 3: OPC UA Server Configuration**

```bash
# OPC server may be configured to listen only on localhost

# On the internal device running OPC UA:
# Check config file (often XML or JSON)
# Look for: <host>127.0.0.1</host> or "localhost"
# Change to: <host>0.0.0.0</host> or empty

# Example (check your OPC UA server docs for exact method):
grep -r "127.0.0.1\|localhost" /opt/opc-ua/config/
```

### Solution

1. Verify actual OPC UA port: `netstat -an | grep LISTEN`
2. Update router rule if port different
3. Check internal device firewall: `sudo ufw status`
4. Check OPC UA server config (binding to 0.0.0.0)
5. Restart OPC UA service: `sudo systemctl restart opcua`

---

## Symptom 4: Intermittent (Works Sometimes, Not Always)

### What It Means
```
First test: telnet 10.99.0.2 4840 → Connected ✅
Second test: telnet 10.99.0.2 4840 → Timeout ❌
Third test: telnet 10.99.0.2 4840 → Connected ✅
```

Service or connection is unstable.

### Most Common Cause: Router Overheats or Crashes

```bash
# Check router stability
# Go to router admin: System → Status or About
# Look at: Uptime

Expected: Days (e.g., 23 days 15:30 hours)
Problem:  Hours (e.g., 2 hours - router is rebooting frequently)

# If low uptime:
# 1. Check room temperature (routers shutdown if overheating)
# 2. Ensure ventilation around router
# 3. Check power supply (should be steady OA watts)
# 4. Reduce number of connections
```

### Second Most Common: L2TP Connection Drops

```bash
# From VPS, check L2TP connection stability
watch -n 5 'ipsec statusall'

# Should show GREEN/ESTABLISHED for hours without change
# If connection drops and reconnects:
# → Problem in L2TP config (see L2TP guide)
```

### Third Most Common: Internal Service Crashes

```bash
# On device running OPC UA, check logs
sudo tail -f /var/log/opcua.log
# or:
sudo journalctl -u opcua -f

# Watch for errors or crashes
# If crashes frequently, check:
# - Memory usage (is device low on RAM?)
# - Disk space (is /tmp full?)
# - High CPU load
```

### Solution

1. **Check router uptime** - if low, address overheating
2. **Stabilize L2TP** - see L2TP guide for MTU/keepalive settings
3. **Monitor service logs** - watch for crashes
4. **Increase MTU:** L2TP settings → MTU: 1410
5. **Restart daily:** Create cron job to restart service nightly

```bash
# Restart OPC UA service daily at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * sudo systemctl restart opcua") | crontab -
```

---

## Symptom 5: "Port Already in Use" Error When Adding Rule

### What It Means
```
Router says: "Cannot use port 4840 - already in use or reserved"
```

The port is already forwarded to another device, or reserved by router.

### Solution

**Option 1: Use Different External Port**
```
Change from:
  External Port: 4840
To:
  External Port: 14840 (high number, less likely to conflict)
```

**Option 2: Check for Duplicate Rules**
```bash
# Router admin → Firewall → Port Forwarding
# Look for multiple entries with same port
# Delete the duplicate
```

**Option 3: Check if Port is Reserved**
```bash
# Reserved ports that may conflict:
# 80, 443, 53, 22, 23, 25, 110, 143, 3306, 3389
# (web, SSH, email, DNS, database, RDP)

# If you need to use port 4840:
# Use alternative: 14840, 24840, 34840, etc.
```

---

## Symptom 6: Works Internally, Not from VPN

### What It Means
```
From local network (192.168.1.x):
  telnet 192.168.1.100 4840 → ✅ Connected

From VPN (10.99.0.2):
  telnet 10.99.0.2 4840 → ❌ Timeout/Refused
```

Internal forwarding works, but VPN access blocked.

### Cause: Router Advanced Firewall Rules

Some QX310 firmware versions have separate inbound access rules:

```bash
# Go to router admin:
# Firewall → Advanced → Access Control or Inbound Rules
# Look for rules like:
#   "Block external access to port 4840"
# OR:
#   "Allow only LAN to port 4840"
```

### Solution

1. **Disable advanced firewall rules** for testing:
   - Router Admin → Firewall → Advanced Firewall
   - Uncheck/disable any restrictive rules
   - Test again

2. **Or create allow rule** (if firewall GUI supports):
   - Allow: VPN Network (10.99.0.0/24) → Port 4840
   - Allow: LAN Network (192.168.1.0/24) → Port 4840
   - Deny: All others

3. **If firewall doesn't have GUI rules**, may need to:
   - SSH to router (if SSH enabled)
   - Edit `/etc/firewall` config (advanced)
   - Contact Qixiang for firmware with better ACL support

---

## Symptom 7: "Can't Reach Router" (192.168.1.1)

### What It Means
```
telnet 192.168.1.1 (or 192.168.1.254)
→ Connection refused or timeout
```

Can't access router admin panel to configure port forwarding.

### Troubleshooting

**Step 1: Physical Connection**
```bash
# Make sure you're connected to router's network
# Check network settings:
ip addr show  # Linux/Mac
ipconfig      # Windows

# Should show:
# inet 192.168.1.x netmask 255.255.255.0

# If showing different network:
#   - Connect to router's WiFi SSID
#   - Or plug in Ethernet cable
```

**Step 2: Find Correct Router IP**

```bash
# Linux/Mac
arp -a | grep -i qixiang
ifconfig | grep broadcast

# Windows
ipconfig /all
arp -a

# Common QX310 IPs:
# - 192.168.1.1 (most common)
# - 192.168.1.254 (some models)
# - 192.168.0.1 (if using different subnet)
# - 10.0.0.1 (less common)
```

**Step 3: Ping Router First**
```bash
ping 192.168.1.1 -c 4

# Result:
# ✅ Reply → Network working
# ❌ No reply → Router offline or wrong IP
```

**Step 4: If Still Can't Reach**
```bash
# Try direct Ethernet connection (not WiFi)
# Try different browser (Chrome, Firefox, Edge)
# Try IP with different port (usually :8080)
#   http://192.168.1.1:8080
# Try IP with https:
#   https://192.168.1.1
```

### Solution

1. Check physical connection to router
2. Verify correct IP address
3. Try both HTTP and HTTPS
4. Try port 8080 instead of web port
5. Restart router (power cycle)
6. Factory reset if all else fails

---

## Quick Diagnosis Script (Run from VPS)

Save this to a file, use to troubleshoot:

```bash
#!/bin/bash
# qx310_diagnose.sh - QX310 Port Forwarding Diagnostics

echo "=== QX310 Port Forwarding Diagnostics ==="
echo ""

# Test 1: L2TP Connection
echo "1. Testing L2TP connection..."
if ping -c 1 10.99.0.1 &> /dev/null; then
    echo "   ✅ L2TP connected, can reach VPN gateway"
else
    echo "   ❌ L2TP not working - see L2TP troubleshooting"
    exit 1
fi

# Test 2: Router Reachable
echo ""
echo "2. Testing router reachability..."
if ping -c 1 10.99.0.2 &> /dev/null; then
    echo "   ✅ Router responding via VPN"
else
    echo "   ⚠️  Router not responding - may be offline"
fi

# Test 3: Port Forwarding
echo ""
echo "3. Testing port forwarding (OPC UA 4840)..."
timeout 5 telnet 10.99.0.2 4840 &> /dev/null
RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo "   ✅ Port 4840 is OPEN - forwarding working!"
elif [ $RESULT -eq 124 ]; then
    echo "   ❌ Port 4840 TIMEOUT - rule not saved or blocked"
elif [ $RESULT -eq 1 ]; then
    echo "   ❌ Port 4840 REFUSED - service not running"
else
    echo "   ⚠️  Unexpected result: $RESULT"
fi

# Test 4: Alternate Ports
echo ""
echo "4. Testing common alternate ports..."
for port in 8080 80 443 502 22; do
    timeout 2 telnet 10.99.0.2 $port &> /dev/null
    if [ $? -eq 0 ]; then
        echo "   ℹ️  Port $port is open"
    fi
done

# Test 5: Show Current Routes
echo ""
echo "5. Current routing table (VPN routes)..."
ip route | grep -E 'tun|ppp|10.99'

echo ""
echo "=== Diagnosis Complete ==="
echo ""
echo "Results:"
echo "  ✅ = working correctly"
echo "  ❌ = needs fixing"
echo "  ⚠️  = potential issue"
echo "  ℹ️  = informational"
```

**Usage:**
```bash
# Save to file
cat > diagnose_qx310.sh << 'EOF'
[paste script above]
EOF

# Make executable
chmod +x diagnose_qx310.sh

# Run it
./diagnose_qx310.sh
```

---

## When All Else Fails: Factory Reset

If router is completely misconfigured:

```bash
1. Hold RESET button for 10 seconds (small button on back)
2. Router will reboot and reset to defaults
3. Access at 192.168.1.1 with default password (check manual)
4. Reconfigure L2TP and port forwarding from scratch
```

⚠️ **Warning:** This erases all configurations, including L2TP settings!

---

## Contact Support Flow

If you've tried everything above:

1. Collect diagnostics:
   ```bash
   # On device with OPC UA
   netstat -an | grep 4840 > opc_status.txt
   systemctl status opcua >> opc_status.txt
   
   # On VPS
   ./diagnose_qx310.sh > vpn_status.txt
   
   # Get router config
   # From router admin: System → Backup → Export
   # Save qx310_backup.bin
   ```

2. Contact QX310 support with:
   - Router model and firmware version
   - Configuration file (backup)
   - Diagnostic output (opc_status.txt, vpn_status.txt)
   - Description of issue

---

## Preventive Measures

Keep things running smoothly:

```bash
# 1. Weekly: Check uptime
# Router Admin → Status → Uptime
# Should be days, not hours

# 2. Monthly: Test port forwarding
./diagnose_qx310.sh

# 3. Quarterly: Backup configuration
# Router Admin → System → Backup → Export
# Save file somewhere safe

# 4. Yearly: Update firmware
# Router Admin → System → Firmware Update
# Check manufacturer website for latest
```

---

## Still Not Working?

1. **Check L2TP first** → If L2TP not stable, port forwarding won't help
2. **Test internally first** → If internal device can't reach service, neither can router
3. **Try with verbose output** → See what's actually happening
4. **Run diagnostics** → Use script above to identify exact problem
5. **Contact manufacturer** → If it's a router-specific issue

---

Last Updated: February 2026
Covers QX310 Firmware 3.x - 5.x
