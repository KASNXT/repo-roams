# QX310 Port Forwarding - OpenWrt Firewall Interface Guide

## Your Router Interface Identified

Your QX310 is running **OpenWrt-style firewall** with **zone-based rules**. This is more powerful than simple port forwarding.

---

## Option 1: Using "New Forward Rule" (Port Forwarding)

This is the best approach for your interface.

### Step 1: Fill in "New forward rule" Form

You see this on your screen:
```
New forward rule

Name:                [Input field]
Source zone:        [wan ▼]
Destination zone:   [lan ▼]
                    [ADD AND EDIT...]
```

### Step 2: Fill in Fields

1. **Name field** (left side)
   - Enter: `OPC_UA_Bombo`
   - This is just for you to remember the rule

2. **Source zone**: Should be `wan` (already selected ✓)
   - This means "traffic coming from external/internet"

3. **Destination zone**: Should be `lan` (already selected ✓)
   - This means "forward to internal LAN network"

4. **Click: "ADD AND EDIT..."** button
   - This opens detailed configuration

### Step 3: Configure Port Forwarding Details

After clicking "ADD AND EDIT...", you'll get a detailed edit form:

```
Port Forward Configuration

☑ Enable

Source port: [blank or 4840]
Destination address: [192.168.1.106]
Destination port: [4840]
Protocol: [TCP+UDP ▼]
```

**Fill in:**
- **Enable**: Check the box ☑
- **Source port**: 4840
- **Destination address**: 192.168.1.106
- **Destination port**: 4840
- **Protocol**: TCP (or TCP+UDP for both)

### Step 4: Save

Your form should look like:
```
┌─────────────────────────────────────┐
│ Name: OPC_UA_Bombo                  │
│ Source zone: wan                    │
│ Destination zone: lan               │
│ ☑ Enable                           │
│ Source port: 4840                   │
│ Dest address: 192.168.1.106         │
│ Dest port: 4840                     │
│ Protocol: TCP                       │
│                                     │
│      [SAVE]      [CANCEL]          │
└─────────────────────────────────────┘
```

Click **SAVE**

### Step 5: Rule Should Appear

Back on main firewall page, you should see your rule in the "Forward rule" section:
```
Forward rule
Name              Enable
OPC_UA_Bombo      ☑
```

---

## Understanding Your Router's Zone System

Your router has this architecture:

```
Internet (External)
        │
        ▼
    ┌─────────┐
    │   WAN   │ ← External traffic comes here
    │  Zone   │
    └────┬────┘
         │
    [FIREWALL RULES HERE]
         │
    ┌────▼────┐
    │  LAN    │ ← Internal devices on 192.168.1.x
    │  Zone   │
    └─────────┘
         │
    192.168.1.106 (OPC UA Server)
```

**Port Forwarding Rule Does:**
```
WAN:4840 → [FORWARD RULE] → LAN:192.168.1.106:4840
```

---

## Option 2: Enable "VPN → LAN Routing" (Alternative, Simpler)

This approach doesn't use port forwarding. Instead, it allows the entire VPN network to access your LAN.

### When to Use Option 2:
- If port forwarding interface is confusing
- If you want to access all LAN devices (192.168.1.0/24), not just port 4840
- If you want simpler configuration

### How to Setup Option 2:

#### Step 1: Go to VPN Settings
1. **Menu**: Network → VPN 
   - OR: System → VPN Settings
   - Look for: **L2TP Client** or **L2TP Settings**

#### Step 2: Look for These Options

Find and check these boxes:

```
☑ Enable
☑ Enable VPN to LAN routing
☑ Allow remote access to local network
☑ Enable NAT traversal
```

If these exact options don't exist, look for:
```
☑ Allow clients to access LAN
☑ Route LAN traffic through VPN
☑ Permit forwarding to LAN
```

#### Step 3: Set Interface

Look for:
```
VPN Interface: [ppp0 ▼]   (or similar)
OR
Tunnel Interface: [L2TP]
```

Select the L2TP interface (usually auto-selected).

#### Step 4: Add Static Route (Optional but Recommended)

If there's a "Static Routes" section:

```
Destination: 192.168.1.0/24
Gateway: 0.0.0.0 (or leave blank)
Interface: ppp0 (L2TP interface)
Enable: ☑
```

This tells router: "VPN users can access 192.168.1.0/24 network"

### Result of Option 2:

After enabling, you can access OPC UA using:
```
opc.tcp://192.168.1.106:4840

(No need to use VPN IP 10.99.0.x)
(Your VPS connects directly to local IP through VPN tunnel)
```

---

## Comparison: Option 1 vs Option 2

| Aspect | Option 1 (Port Forward) | Option 2 (Routes) |
|--------|------------------------|-------------------|
| **Complexity** | Medium (detailed config) | Easy (2-3 checkboxes) |
| **Security** | ✅ Only port 4840 exposed | ⚠️ Whole LAN accessible |
| **Setup time** | 15-20 minutes | 5 minutes |
| **Best for** | Single specific service | Multi-service access |
| **ROAMS access** | VPN IP: 10.99.0.2:4840 | Local IP: 192.168.1.106:4840 |
| **Troubleshooting** | More complex | Simpler |

**Recommendation:** Start with **Option 2** (routing) - simpler and less likely to have issues.

---

## Step-by-Step: Option 2 (Recommended Route)

### Step 1: Find VPN Settings

Your router menu should have:
```
Network 
  ├─ Interfaces
  ├─ Firewall
  ├─ QoS
  ├─ DHCP and DNS
  └─ VPN ← Look here
```

OR under:
```
System
  ├─ System Settings
  ├─ Administration
  └─ VPN Settings ← Or here
```

### Step 2: Look for "L2TP Client" Configuration

Once in VPN settings, find the L2TP client you already configured and look for section:

```
Advanced Options
│
├─ ☑ Enable VPN to LAN routing
├─ ☑ Route all through VPN (UNCHECK this)
├─ ☑ Allow LAN access
├─ ☑ VPN firewall zone
└─ VPN Interface: ppp0
```

### Step 3: Check Required Boxes

```
☑ Enable VPN to LAN routing
☑ Allow clients to access LAN
☑ NAT traversal enabled
```

### Step 4: Save and Apply

- Click **Save**
- Click **Apply** (if separate button)
- Wait 10-15 seconds
- L2TP should reconnect automatically

### Step 5: Verify It Works

**From VPS:**
```bash
# SSH to VPS
ssh deploy@your_vps_ip

# Test direct access to local IP (not VPN IP)
telnet 192.168.1.106 4840

# Expected: Connected!

# Test OPC UA
python3 << 'EOF'
from opcua import Client
client = Client("opc.tcp://192.168.1.106:4840")
client.connect()
print("✅ OPC UA working via VPN routing!")
client.disconnect()
EOF
```

---

## Troubleshooting Option 2

### If routing doesn't work:

**Check 1: Is VPN connected?**
```bash
# From VPS
ping 10.99.0.1
# Should reply

# Check router VPN status
# Router admin → Status → VPN
# Should show "Connected"
```

**Check 2: Is LAN routing enabled?**
```bash
# Go back to VPN settings
# Verify checkboxes are still checked
# Try saving again
```

**Check 3: Firewall blocking access?**
```bash
# Go to Firewall section
# Look for "Input" rules
# Make sure there's no rule blocking 192.168.1.x
```

**Check 4: Static route needed?**
```bash
# Go to Network → Static Routes (or similar)
# Add route:
  Destination: 192.168.1.0/24
  Gateway: 0.0.0.0
  Interface: ppp0
# Save and apply
```

---

## Which Option To Choose?

### Choose Option 1 (Port Forwarding) If:
- [ ] You only want port 4840 accessible
- [ ] You have strong security requirements
- [ ] You need to control exactly what's exposed
- [ ] You're comfortable with detailed firewall config

### Choose Option 2 (Routing) If:
- [ ] You want simpler setup ← **Recommended**
- [ ] You want to access multiple services (SSH, web, etc.)
- [ ] You just want it working quickly
- [ ] You trust your VPN authentication
- [ ] This is for testing/development

---

## My Recommendation

For your ROAMS setup: **Use Option 2 (Routing)**

**Why?**
1. ✅ Simpler - just enable a few checkboxes
2. ✅ Faster - 5 minutes vs 20 minutes
3. ✅ More reliable - less configuration = fewer issues
4. ✅ More flexible - can access any service on LAN
5. ✅ Better for ROAMS - OPC UA works, plus SSH, web interfaces, etc.
6. ✅ Secure - still VPN-protected, not exposed to internet

**After setup:**
- ROAMS uses: `opc.tcp://192.168.1.106:4840`
- Admins can SSH: `ssh 192.168.1.106` (via VPN)
- Web access: `http://192.168.1.106:8080` (if available)

---

## Quick Comparison to My Documentation

The guides I created mention port forwarding generically, but your router interface is more advanced.

**How to use my existing guides:**

| My Guide | Applies To Your Router? | Notes |
|----------|------------------------|-------|
| Quick Reference | Partially | Basic concepts apply, but interface is different |
| Checklist | Partially | Use for testing and verification steps |
| Complete Guide | Mostly | Theory applies; use Option 2 instead of port forwarding |
| Troubleshooting | Yes | Diagnostic commands still work |

---

## Your Specific Router Path

Based on your interface, here's your exact path:

```
1. Login to router: 192.168.1.1

2. Go to: Network → VPN (or System → VPN)

3. Find: L2TP Client Configuration

4. Look for Advanced Options section

5. Check boxes:
   ☑ Enable VPN to LAN routing
   ☑ Allow clients to access LAN

6. Save and Apply

7. Wait 10-15 seconds for reconnection

8. Test: telnet 192.168.1.106 4840
```

---

## After Setup: Update ROAMS

Once Option 2 (routing) is working:

```bash
# SSH to VPS
ssh deploy@your_vps_ip

# Go to ROAMS
cd /opt/roams/roams_backend
source venv_new/bin/activate

# Open Django shell
python manage.py shell

# Update OPC UA endpoint
from roams_opcua_mgr.models import OpcUaClientConfig

station = OpcUaClientConfig.objects.get(station_name="Bombo")
station.endpoint_url = "opc.tcp://192.168.1.106:4840"  # Local IP (not VPN IP)
station.save()

print(f"Updated: {station.endpoint_url}")
```

---

## Final Checklist

- [ ] Access router at 192.168.1.1
- [ ] Find VPN → L2TP Settings
- [ ] Look for "Enable VPN to LAN routing" option
- [ ] Check box ☑
- [ ] Look for "Allow clients to access LAN" option
- [ ] Check box ☑
- [ ] Click Save
- [ ] Click Apply (if present)
- [ ] Wait 15 seconds
- [ ] Test: `telnet 192.168.1.106 4840`
- [ ] Should connect ✅
- [ ] Update ROAMS endpoint to use local IP

---

**Questions?** 

- **Port forwarding showing as error?** → Use routing instead
- **Routing doesn't work?** → Check firewall isn't blocking
- **Can access local IP but OPC UA fails?** → Service not running or listening on 0.0.0.0
- **Still stuck?** → Run diagnostic and check QX310_PORT_FORWARDING_TROUBLESHOOTING.md

---

**Status: Ready to implement!** 🎉

Let me know if you see "Enable VPN to LAN routing" option in your VPN settings, or if you want to try the port forwarding approach instead.
