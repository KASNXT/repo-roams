# QX310 OpenWrt Firewall - Visual Configuration Guide

## What Your Screenshots Show

Looking at your router interface, you have **OpenWrt firewall** with two main areas visible:

### Area 1: "Open ports on router" (Top Section)
```
Open ports on router
┌─ Input rule (for blocking/allowing ports) ───┐
│ Name: [New input rule]                        │
│ Protocol: [TCP ▼]                             │
│ External port: [______]                       │
│                              [ADD]  button    │
└───────────────────────────────────────────────┘
```

### Area 2: "New forward rule" (What You Need!)
```
New forward rule
┌─────────────────────────────────────────────────┐
│ Name: [New forward rule]                        │
│ Source zone: [wan ▼]                           │
│ Destination zone: [lan ▼]                      │
│                        [ADD AND EDIT...] button│
└─────────────────────────────────────────────────┘
```

### Area 3: "Source NAT" (Advanced - Don't Use This)
```
Source NAT (for masquerading/IP rewriting)
[Skip this for your setup]
```

---

## Your Solution: Use "New forward rule"

This is exactly what you need.

### Visual Step-by-Step

#### STEP 1: Fill in the Name Field

```
Click here:
          ↓
New forward rule
Name: [New forward rule] ← Click in this field and clear it
      └──────────────┬──────────────┘
                     │
            Type here: OPC_UA_Bombo
```

**Result after typing:**
```
Name: [OPC_UA_Bombo]
```

---

#### STEP 2: Verify Source and Destination Zones

```
These should already be correct:

Source zone:      [wan ▼]   ← Correct (traffic from internet)
Destination zone: [lan ▼]   ← Correct (forward to internal LAN)

If NOT correct, click dropdowns to change:
  Source zone: Should be WAN
  Destination zone: Should be LAN
```

---

#### STEP 3: Click "ADD AND EDIT..." Button

```
When you click this button:
          ↓
    [ADD AND EDIT...]
          ↓
Opens detailed configuration screen
```

---

#### STEP 4: Fill in Detail Configuration

After clicking "ADD AND EDIT...", you'll see a form like:

```
Port Forwarding Details
┌─────────────────────────────────────────────────────────┐
│                                                         │
│ ☑ Enable                    (Check this box!)          │
│                                                         │
│ Name:        [OPC_UA_Bombo]                            │
│                                                         │
│ Traffic in:  Source port   [4840]                      │
│                                                         │
│ Traffic to:  Destination IP   [192.168.1.106]         │
│              Destination port [4840]                   │
│                                                         │
│ Protocol:    [TCP ▼]  (or TCP+UDP if available)       │
│                                                         │
│ More options (if available):                           │
│   ☑ Restrict access to    [Do not restrict]           │
│   ☑ NAT loopback          [Enabled]                   │
│                                                         │
│                    [SAVE]     [CANCEL]                │
└─────────────────────────────────────────────────────────┘
```

**Fill in these fields:**

1. **Enable checkbox**: ☑ (must be checked!)
2. **Name**: OPC_UA_Bombo (descriptive name)
3. **Source port**: 4840
4. **Destination IP**: 192.168.1.106
5. **Destination port**: 4840
6. **Protocol**: TCP (or TCP+UDP)

---

#### STEP 5: Click SAVE

```
After filling everything:

        Click: [SAVE]
              ↓
Returns to main firewall page
```

---

#### STEP 6: Verify Rule Appears

Back on main page, you should now see:

```
Forward rule
┌──────────────────────────────────────┐
│ Name          Enable                 │
│ OPC_UA_Bombo  ☑ (checked)            │
└──────────────────────────────────────┘
```

If you see this, **port forwarding is configured!** ✅

---

## Testing Your Configuration

After saving, test immediately:

### From VPS Terminal:

```bash
# SSH to VPS
ssh deploy@your_vps_ip

# Test port connectivity
telnet 10.99.0.2 4840

# Screen should show:
# Trying 10.99.0.2...
# Connected to 10.99.0.2.
# (or: Connection established)

# Type: Ctrl+] then "quit" to exit
```

**Result:**
- ✅ **Connected** = Port forwarding works!
- ❌ **Connection refused** = Service not running
- ⏱️ **Timeout/No response** = Rule not saved

---

## Alternative: Don't Want Port Forwarding?

If the detailed port forwarding is confusing, use **VPN → LAN Routing** instead (much simpler).

### Option 2: Enable VPN to LAN Routing

```
Go to router: Network → VPN (or System → VPN)

Look for L2TP Client settings:

Find and CHECK these boxes:
  ☑ Enable VPN to LAN routing
  ☑ Allow remote access to local network
  ☑ Route VPN traffic to LAN

Save and Apply
```

**After this, you can access:**
```
opc.tcp://192.168.1.106:4840

(directly, via VPN tunnel - no port forwarding needed!)
```

---

## Visual Comparison: Both Methods

### Method 1: Port Forwarding (Via "Forward rule")
```
VPS (10.99.0.2) 
    →  Router port 4840
    →  [FORWARD RULE]
    →  Internal IP 192.168.1.106:4840
    →  OPC UA Server
```

### Method 2: VPN → LAN Routing
```
VPS (10.99.0.2) via L2TP tunnel
    →  Router allows VPN→LAN access
    →  Direct route to 192.168.1.106:4840
    →  OPC UA Server
```

**Both work!** Method 2 is simpler.

---

## If You're Confused About Zones

**WAN Zone** = External world (Internet)
- Traffic coming FROM the internet
- Port forwarding START point

**LAN Zone** = Your internal network (192.168.1.x)
- Your internal devices
- Port forwarding END point

So the rule says:
> "Forward incoming traffic FROM WAN on port 4840 TO LAN device 192.168.1.106 on port 4840"

---

## Full Example (What Your Setup Should Look Like)

### Your Completed Configuration:

```
┌─────────────────────────────────────────────────────────┐
│                     Forward Rules                       │
├─────────────────────────────────────────────────────────┤
│ Name              Source  Dest   SrcPort  Dest         │
│                   Zone    Zone           Port  IP       │
├─────────────────────────────────────────────────────────┤
│ OPC_UA_Bombo      wan     lan    4840     192.168.1.106:4840 │
│ ☑ Enabled                                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting Checklist

If port forwarding doesn't work:

- [ ] **Save was clicked** (not just filled form)
- [ ] **Enable checkbox is checked** ☑
- [ ] **Rule appears in list** after save
- [ ] **VPN is connected** (L2TP status shows Connected)
- [ ] **OPC UA service is running** on 192.168.1.106
- [ ] **Internal device has correct IP** (verify with ping)
- [ ] **Firewall doesn't have conflicting rules**
- [ ] **Protocol is set correctly** (TCP for OPC UA)

### If Still Not Working:

**Check 1: Is service running?**
```bash
# SSH to device
ssh 192.168.1.106

# Check if OPC UA listens on port 4840
netstat -an | grep 4840

# Should see: 0.0.0.0:4840 LISTEN (or similar)
```

**Check 2: Can you reach it internally?**
```bash
# From any device on LAN
telnet 192.168.1.106 4840

# Should connect immediately
```

**Check 3: Are firewall rules blocking it?**
```
Router → Firewall → Input rules (not forward rules)
Check if there's a rule blocking port 4840
If blocked, you need to allow it
```

---

## After Port Forwarding Works: Update ROAMS

Once you confirm `telnet 10.99.0.2 4840` works:

```bash
# SSH to VPS
ssh deploy@your_vps_ip

# Go to ROAMS backend
cd /opt/roams/roams_backend
source venv_new/bin/activate

# Update Django
python manage.py shell
```

```python
from roams_opcua_mgr.models import OpcUaClientConfig

# Find station
station = OpcUaClientConfig.objects.get(station_name="Bombo")

# Option A: If using port forwarding, use VPN IP
# station.endpoint_url = "opc.tcp://10.99.0.2:4840"

# Option B: If using VPN routing, use local IP
station.endpoint_url = "opc.tcp://192.168.1.106:4840"

station.save()
print(f"✅ Updated: {station.endpoint_url}")

# Test connection
from roams_opcua_mgr.opcua_client import OpcUaClient
client = OpcUaClient(station)
if client.connect():
    print("✅ OPC UA connected!")
    client.disconnect()
```

---

## OpenWrt Firewall Terminology (For Reference)

If you see these terms, here's what they mean:

| Term | Meaning | For Your Setup |
|------|---------|-----------------|
| **Zone** | Network group (WAN/LAN) | Use wan→lan |
| **Forward rule** | Route traffic between zones | This is what you need! |
| **Input rule** | Traffic going to router itself | Not needed |
| **Output rule** | Traffic leaving router | Not needed |
| **Source NAT** | Change sender IP (masquerade) | Leave alone |
| **Destination NAT** | Change target IP (port forward) | This is what forward rule does |
| **Interface** | Network adapter (eth0, ppp0, etc) | Auto-handled by zones |

---

## Your Next Steps

### Option A: Use Port Forwarding (What I showed above)
1. ✅ Fill "New forward rule" form
2. ✅ Click "ADD AND EDIT..."
3. ✅ Configure port forwarding
4. ✅ Click SAVE
5. ✅ Test with telnet
6. ✅ Update ROAMS

**Time: 20-30 minutes**

### Option B: Use VPN → LAN Routing (Simpler)
1. ✅ Go to Network → VPN
2. ✅ Find L2TP Client settings
3. ✅ Check "Enable VPN to LAN routing"
4. ✅ Check "Allow LAN access"
5. ✅ Save and apply
6. ✅ Test with telnet
7. ✅ Update ROAMS

**Time: 10-15 minutes**

---

## Visual Quick Reference: What to Fill

```
When you click "ADD AND EDIT..." you'll see this form:

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          Port Forward Configuration         ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                             ┃
┃  ☑ Enable                                  ┃
┃     ↑                                       ┃
┃     Must check this!                        ┃
┃                                             ┃
┃  Name: [OPC_UA_Bombo________________]      ┃
┃         ↑                                    ┃
┃         Descriptive name (you choose)       ┃
┃                                             ┃
┃  Source port: [4840____________________]   ┃
┃                  ↑                           ┃
┃                  Same as service port       ┃
┃                                             ┃
┃  Destination IP: [192.168.1.106_______]    ┃
┃                   ↑                          ┃
┃                   Your OPC UA server IP     ┃
┃                                             ┃
┃  Destination port: [4840_______________]   ┃
┃                        ↑                     ┃
┃                        Same source port     ┃
┃                                             ┃
┃  Protocol: [TCP_▼]                         ┃
┃            ↑                                 ┃
┃            Must be TCP for OPC UA           ┃
┃                                             ┃
┃         [SAVE]      [CANCEL]               ┃
┃          ↑                                   ┃
┃          Click this when done               ┃
┃                                             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Support Decision Tree

Start here:

```
Is your VPN (L2TP) already working?
  ├─ NO → First set up L2TP VPN (see QX310_L2TP_SETUP_GUIDE.md)
  └─ YES → Continue below

Want simplest setup?
  ├─ YES → Use Option 2 (VPN → LAN routing)
  └─ NO → Continue below

Want port forwarding?
  ├─ YES → Use "New forward rule" (this guide)
  └─ NO → Reconsider Option 2

Ready to configure?
  └─ YES → Follow "Visual Step-by-Step" above

Having issues?
  ├─ Port forwarding form confusing → Read "Troubleshooting Checklist"
  ├─ Test shows "timeout" → Check firewall isn't blocking
  ├─ Test shows "refused" → Check OPC UA service is running
  └─ Still stuck → See QX310_PORT_FORWARDING_TROUBLESHOOTING.md
```

---

## Summary

Your QX310 router:
- ✅ Has OpenWrt firewall (zone-based)
- ✅ Shows port forwarding via "Forward rule"
- ✅ Can do port forwarding OR VPN→LAN routing
- ✅ Both methods work for ROAMS

**Choose one:**
- **Simpler**: VPN → LAN routing (5 min)
- **More control**: Port forwarding via "Forward rule" (20 min)

**Next**: Implement Option 1 or 2 above, then test with telnet command.

---

**Ready to proceed?** 🚀

Let me know which option you like better, or if you have questions about the form fields!
