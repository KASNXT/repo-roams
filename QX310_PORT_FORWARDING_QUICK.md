# QX310 Port Forwarding Quick Reference

## 5-Minute Setup

### Step 1: Open Router Dashboard
```
Browser: http://192.168.1.1
Login: admin / admin
Timeout: 5 seconds
```

### Step 2: Navigate to Firewall Settings
```
Click: Firewall (or Network Security)
       ↓
     Port Forwarding (or Port Mapping)
       ↓
    Add New Rule (+ button)
```

### Step 3: Fill in OPC UA Server Rule

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  PORT FORWARDING RULE                   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ □ Enabled:               ☑ (check this) ┃
┃ Name:                [OPC-UA-Station]    ┃
┃ External Port:              4840         ┃
┃ Protocol:           TCP (or TCP+UDP)     ┃
┃ Internal IP:        192.168.1.100        ┃
┃ Internal Port:              4840         ┃
┃                                          ┃
┃         [SAVE]           [CANCEL]        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Step 4: Click SAVE
- Wait for success message
- Router may reboot (normal)

### Step 5: Verify It Works

**From VPS (after L2TP connects):**
```bash
telnet 10.99.0.2 4840

# Expected: Connected (or Connection established)
# If timeout/refused: Check rule is saved and enabled
```

---

## Common QX310 Field Layouts

### Layout Variant A (Modern Firmware)
```
Port Forwarding Configuration
┌─ Rule Details ───────────────────────┐
│ ☑ Enable this rule                   │
│ Service Name:    [________________]   │
│ External Port:   [________________]   │
│ Internal IP:     [________________]   │
│ Internal Port:   [________________]   │
│ Protocol:   [▼ TCP+UDP]               │
│                                       │
│        [OK]  [Apply]  [Reset]        │
└───────────────────────────────────────┘
```

### Layout Variant B (Older Firmware)
```
Virtual Server / Port Mapping
┌─────────────────────────────────────┐
│ Incoming Port: [4840]               │
│ Internal Port: [4840]               │
│ Server IP:     [192.168.1.100]      │
│ Enabled: ☑                          │
│                                     │
│      [Apply]    [Delete]            │
└─────────────────────────────────────┘
```

---

## Pre-Filled Rules Ready to Use

### RULE 1: OPC UA (Most Common)
```
Name:              OPC-UA-Server
External Port:     4840
Internal IP:       192.168.1.100
Internal Port:     4840
Protocol:          TCP
Enable:            ✓
```

### RULE 2: Web Admin Interface
```
Name:              Web-Admin
External Port:     8080
Internal IP:       192.168.1.100
Internal Port:     8080
Protocol:          TCP
Enable:            ✓
```

### RULE 3: SSH Remote Access
```
Name:              SSH-Remote
External Port:     2222
Internal IP:       192.168.1.50
Internal Port:     22
Protocol:          TCP
Enable:            ✓
```

### RULE 4: Modbus PLC
```
Name:              Modbus-PLC
External Port:     502
Internal IP:       192.168.1.50
Internal Port:     502
Protocol:          TCP+UDP
Enable:            ✓
```

---

## Troubleshooting in 60 Seconds

### Is port open?
```bash
# From VPS terminal
telnet 10.99.0.2 4840

Result:
  Connected     → ✅ Working
  Timeout       → ❌ Rule not saved
  Refused       → ❌ Service not running
```

### Is service running?
```bash
# SSH to device
ssh 192.168.1.100

# Check port running
netstat -an | grep 4840

Result:
  0.0.0.0:4840   → ✅ Listening (correct)
  127.0.0.1:4840 → ❌ Localhost only (needs config fix)
  (nothing)       → ❌ Service stopped (start it first)
```

### Quick Fixes
| Issue | Fix |
|-------|-----|
| Rule not saving | Disable router firewall temporarily |
| Says port in use | Service already running on port |
| Can't reach router | Try `192.168.1.254` instead of `.1` |
| Still timeout | Try different port: `14840` instead of `4840` |

---

## Protocol Selection Guide

| Service | Protocol | Why |
|---------|----------|-----|
| OPC UA | TCP | Most implementations use TCP |
| SSH | TCP | Always TCP for terminal |
| Modbus | TCP+UDP | Device may use either |
| DNS | UDP | DNS is always UDP |
| HTTP/HTTPS | TCP | Web traffic is always TCP |
| MQTT | TCP | Message protocol uses TCP |

**When in doubt: Use TCP** ✓

---

## Internal IP Quick Find

Find what IP to forward to:

```bash
# From router's local network, ping device
ping 192.168.1.100

# or check router admin panel:
# Devices → Connected Devices → (list)

# Common IPs in Bombo setup:
OPC UA Server:  192.168.1.100 (port 4840)
Web Interface:  192.168.1.100 (port 8080)
PLC/RTU:        192.168.1.50  (port 502)
```

---

## Verification Checklist

After creating rule, verify with ✓:

- [ ] Rule name entered (any name is fine)
- [ ] External Port: 4840
- [ ] Internal IP: 192.168.1.100
- [ ] Internal Port: 4840
- [ ] Protocol: TCP (or specified protocol)
- [ ] Enable checkbox: ✓ CHECKED
- [ ] Clicked SAVE (not just Next)
- [ ] No error message appeared
- [ ] Router rebooted (if auto-reboot enabled)
- [ ] Test: telnet 10.99.0.2 4840 works

---

## Visual Flow Diagram

```
User Input in ROAMS
        ↓
VPS receives request
        ↓
VPS connects via L2TP (10.99.0.2)
        ↓
QX310 receives on external port: 4840
        ↓
[PORT FORWARDING RULE ACTIVATES]
        ↓
Routes to internal device: 192.168.1.100:4840
        ↓
OPC UA Server responds
        ↓
Response goes back: 192.168.1.100 → 4840 → VPS → ROAMS
```

---

## Network Command Reference

```bash
# Test port connectivity (from VPS after L2TP)
telnet 10.99.0.2 4840

# Detailed port test
nc -zv 10.99.0.2 4840

# Check if port is open (nmap)
nmap -p 4840 10.99.0.2

# View active connections on device
netstat -an | grep 4840

# Check listening ports
ss -tulpn | grep 4840

# Continuous ping test
ping -c 10 10.99.0.2

# Check routing table
ip route
```

---

## Save Your Rules

Once configured, save a backup:

1. Router Admin Panel
2. System → Backup/Export (or similar)
3. Save file: `qx310-portforward-backup-[DATE].bin`
4. Store in safe location (Google Drive, etc)

**Why?** Easy restore if router resets or is replaced.

---

## Multi-Station Port Forwarding Example

For multiple stations with same port (4840):

```
BOMBO Station:
  External: 4840 → Internal: 192.168.1.100:4840

NAKASONGOLA Station:
  External: 4841 → Internal: 192.168.1.100:4840

LUTETE Station:
  External: 4842 → Internal: 192.168.1.100:4840
```

This way each station can use same port internally, but external access uses different ports.

---

## Firewall Security Settings (Optional)

If QX310 has advanced firewall options:

**Recommended:**
```
Inbound Rules:
  Allow:  10.99.0.0/24 → 4840 (VPN network)
  Allow:  192.168.1.0/24 → 4840 (Local network)
  Deny:   0.0.0.0/0 → 4840 (All others)
```

This restricts OPC UA access ONLY to VPN users and local network.

---

## Useful Vendor Links

- **QX310 Manual**: Search "Qixiang QX310 manual PDF"
- **Port Forwarding Guide**: https://portforward.com/ → Search QX310
- **Test Port Online**: https://yougetsignal.com/tools/open-ports/

---

## When to Use Each Port

| Scenario | Use This |
|----------|----------|
| Remote ROAMS access | 4840 (OPC UA) |
| Field technician admin | 8080 (Web) |
| Remote terminal on PLC | 2222 (SSH) |
| Legacy system integration | 502 (Modbus) |

---

## 30-Second Summary

1. Go to: Router (192.168.1.1) → Firewall → Port Forwarding
2. Add Rule:
   - External: 4840
   - Internal: 192.168.1.100:4840
   - Enable: ✓
3. Save
4. Test from VPS: `telnet 10.99.0.2 4840`
5. Should work! ✅

**That's it.** 🎉

---

Last Updated: February 2026
For QX310 Firmware: 3.x to 5.x
