# QX310 Port Forwarding Setup - Complete Checklist

## Pre-Setup Checklist

Before starting, verify these:

- [ ] **L2TP/IPsec VPN is working**
  - [ ] Router connected to VPS via L2TP
  - [ ] Router has VPN IP: 10.99.0.2 or similar
  - [ ] Can ping VPS: `ping 10.99.0.1` (from VPS after L2TP)
  - [ ] L2TP connection stable (uptime visible in router)

- [ ] **Know your internal device IP**
  - [ ] Found IP of device running OPC UA server
  - [ ] Example: 192.168.1.100
  - [ ] Verified service running: `telnet 192.168.1.100 4840`

- [ ] **Know service port**
  - [ ] OPC UA port: 4840 (default)
  - [ ] Or your specific service port
  - [ ] Verified with netstat on internal device

- [ ] **Have router access credentials**
  - [ ] Router admin username
  - [ ] Router admin password
  - [ ] Can access: `http://192.168.1.1`

---

## Step 1: Access Router Web Interface

### Checklist

- [ ] Open web browser
- [ ] Navigate to: `http://192.168.1.1`
- [ ] See login page (or already logged in)
- [ ] Login with credentials:
  - [ ] Username: (usually `admin`)
  - [ ] Password: (your admin password)
- [ ] Successfully logged in
- [ ] Can see router dashboard

### If Can't Access:

```bash
# Check your network connection
$ ping 192.168.1.1

# If no reply, try:
# - Different browser (Chrome, Firefox, Edge)
# - HTTPS: https://192.168.1.1
# - Alternate port: http://192.168.1.1:8080
# - Factory reset router (last resort)
```

**Troubleshooting**: See QX310_FIREWALL_PORT_FORWARDING.md → Step 1 → "Can't Reach Router"

---

## Step 2: Navigate to Port Forwarding

### Checklist

- [ ] Once logged in, look for menu items:
  - [ ] **Firewall** menu (main section)
  - [ ] **Port Forwarding** submenu
  
**Alternative menu locations to try:**
- [ ] Network → Firewall → Port Forwarding
- [ ] Network → Port Mapping
- [ ] Security → Firewall → Port Forwarding
- [ ] Advanced → Port Forwarding

- [ ] Found Port Forwarding page
- [ ] See button to **Add New Rule** or **+**
- [ ] Clicked to open new rule dialog

### If Can't Find Menu:

```bash
# QX310 firmware may vary
# Common menus:
- Look for "Firewall" (usually left sidebar)
- Look for "Network" (top menu)
- Or "Advanced" section

# If menus completely different:
- Check QX310 manual for your firmware version
- Visit https://portforward.com/ (search QX310)
```

---

## Step 3: Create Port Forwarding Rule

### Checklist - Fill in These Fields:

**Rule Name (or Description)**
- [ ] Enter: `OPC-UA-Server` (or any name)
- [ ] This is just for you to remember what it's for
- [ ] Example: `OPC-Server-Bombo`

**External Port**
- [ ] Enter: `4840`
- [ ] This is what VPS will connect to
- [ ] Must match service port (usually 4840 for OPC UA)

**Internal IP Address**
- [ ] Enter: `192.168.1.100`
- [ ] Must match actual device IP (check by pinging or router device list)
- [ ] Common: 192.168.1.100, 192.168.1.50, 192.168.1.200

**Internal Port**
- [ ] Enter: `4840`
- [ ] Same as external port (usually)
- [ ] Or different if service runs on non-standard port

**Protocol**
- [ ] Select: `TCP` (for OPC UA)
- [ ] Or: `TCP+UDP` (if unsure, safe default)
- [ ] Or: `UDP` (only for UDP-based services like DNS, Modbus UDP)

**Enable/Active/Checked**
- [ ] Check the box to **Enable** this rule
- [ ] Rule must be enabled or it won't work
- [ ] Box should show: ☑ (checked)

**Advanced Options (if available)**
- [ ] Keep defaults (usually fine)
- [ ] Or set Protocol to specific one (see table above)

### Filled Form Should Look Like:

```
┌─────────────────────────────────────┐
│ Port Forwarding Rule Configuration  │
├─────────────────────────────────────┤
│ ☑ Enable                           │
│ Rule Name: [OPC-UA-Server]          │
│ External Port: [4840]               │
│ Internal IP: [192.168.1.100]        │
│ Internal Port: [4840]               │
│ Protocol: [TCP] ▼                   │
│                                     │
│ [SAVE]              [CANCEL]        │
└─────────────────────────────────────┘
```

---

## Step 4: Save the Rule

### Checklist

- [ ] All fields filled correctly (review above)
- [ ] Enable checkbox is **checked** ☑
- [ ] Clicked **SAVE** or **OK** or **Apply** button
- [ ] Waited for page to process (may take 5-10 seconds)
- [ ] **Success message** appeared (or rule shows in list)
- [ ] Router may **reboot** (this is normal, wait 2-3 minutes)

### If Error Appeared:

```
Error: "Port already in use"
  → Try different port: 14840 instead of 4840

Error: "Invalid IP address"
  → Check IP doesn't have typo
  → Must be format: 192.168.1.100 (not 192.168.1.100/24)

Error: "Failed to save"
  → Try again
  → Or refresh page and try again
```

---

## Step 5: Verify the Rule Was Saved

### Checklist - Confirm Rule in List

- [ ] Port Forwarding page now shows your rule in the list
- [ ] Rule shows as **Enabled** (not grayed out)
- [ ] Rule shows correct:
  - [ ] External port: 4840
  - [ ] Internal IP: 192.168.1.100
  - [ ] Internal port: 4840

### Rule List Should Look Like:

```
Port Forwarding Rules
┌────────┬──────┬────────────┬───────┬────────┐
│ Name   │ Ext  │ Int IP     │ Int P │ Status │
├────────┼──────┼────────────┼───────┼────────┤
│ OPC-UA │ 4840 │ 192.168.1. │ 4840  │ ON     │
│        │      │ 100        │       │        │
└────────┴──────┴────────────┴───────┴────────┘
```

---

## Step 6: Test Port Forwarding

### Test Method A: From VPS Terminal (Best Method)

```bash
# SSH to VPS
ssh deploy@YOUR_VPS_IP

# Check if port opens (assuming already connected via L2TP)
telnet 10.99.0.2 4840

# Expected Result:
# ✅ "Connected to 10.99.0.2." → PORT FORWARDING WORKS!
# ⏱️  Hangs for 30 seconds → Rule not saved/working
# ❌ "Connection refused" → Service not running on internal device
```

**Save these results:**
- [ ] Test succeeded (port is open)
- [ ] Record time: ___________
- [ ] Record date: ___________

### Test Method B: From Another Device on LAN

```bash
# Use any laptop/phone on same WiFi as router
$ telnet 192.168.1.100 4840

# Should connect immediately
# If doesn't work internally:
# - Internal device service not running
# - Device firewall blocking (Windows Firewall, ufw, etc)
```

- [ ] Internal test passed (connects to 192.168.1.100:4840)

### Test Method C: Online Port Scanner (Optional)

1. Visit: `https://www.yougetsignal.com/tools/open-ports/`
2. Enter: `YOUR_ROUTER_PUBLIC_IP` and port `4840`
3. Click **Check**
4. Should show: **Open** or **Connected**

- [ ] Online port check shows port is open

---

## Step 7: Verify OPC UA Connection from ROAMS

### On VPS ROAMS Backend

```bash
# SSH to VPS
ssh deploy@YOUR_VPS_IP

# Go to ROAMS directory
cd /opt/roams/roams_backend

# Activate environment
source venv_new/bin/activate

# Test OPC UA connection
python3 << 'EOF'
from opcua import Client

try:
    # Connect to OPC UA through VPN IP
    client = Client("opc.tcp://10.99.0.2:4840")
    client.connect()
    print("✅ OPC UA connection SUCCESSFUL!")
    
    # Get root node
    root = client.get_root_node()
    print(f"Root node: {root}")
    
    client.disconnect()
except Exception as e:
    print(f"❌ Connection failed: {e}")
EOF
```

### Expected Output:

```
✅ OPC UA connection SUCCESSFUL!
Root node: <Node...>
```

### If Connection Fails:

**Check these (in order):**
- [ ] Port forwarding test passed (Step 6)
- [ ] OPC UA service running on internal device
- [ ] Correct IP in rule (192.168.1.100)
- [ ] Correct port in rule (4840)
- [ ] See troubleshooting guide for more detailed steps

---

## Step 8: Create Backup of Configuration

### Safeguard Your Setup

1. **Backup Router Configuration:**
   - [ ] Router Admin → System (or Administration)
   - [ ] Look for: **Backup**, **Export**, **Save Configuration**
   - [ ] Click to download file: `qx310-backup-[DATE].bin`
   - [ ] Save in secure location (Google Drive, etc)

2. **Document Your Rules:**
   - [ ] Create text file: `qx310_port_forwarding.txt`
   - [ ] Record:
     ```
     STATION NAME: Bombo
     Rule Name: OPC-UA-Server
     External Port: 4840
     Internal IP: 192.168.1.100
     Internal Port: 4840
     Protocol: TCP
     Status: Enabled ✓
     Test Date: ___________
     Test Result: ✓ Working
     ```
   - [ ] Save in same secure location

- [ ] Backup downloaded and saved
- [ ] Documentation created and saved
- [ ] Have copies in at least 2 locations (local + cloud)

---

## Step 9: Monitor and Maintain

### Weekly Checks

- [ ] Router still responds: `ping 10.99.0.1` (from VPS)
- [ ] Port still open: `telnet 10.99.0.2 4840`
- [ ] OPC UA still reachable in ROAMS dashboard

### Monthly Checks

```bash
# Re-run diagnostic script
./diagnose_qx310.sh

# Look for issues
# Fix any warnings
```

- [ ] Ran diagnostics
- [ ] No issues found
- [ ] Logged results

### Quarterly Tasks

- [ ] Updated router firmware (if available)
- [ ] Verified backup file still exists
- [ ] Tested backup can be restored (restore to secondary device)

---

## Multiple Stations Setup

### If Setting Up Multiple Remote Stations

Each station needs its own:

**Station 1: BOMBO**
- [ ] L2TP configured: username `bombo`, password `***`
- [ ] Gets VPN IP: 10.99.0.2
- [ ] Port forwarding: 4840 → 192.168.1.100:4840
- [ ] ROAMS endpoint: `opc.tcp://10.99.0.2:4840`
- [ ] Testing: ✓ Works

**Station 2: NAKASONGOLA**
- [ ] L2TP configured: username `nakasongola`, password `***`
- [ ] Gets VPN IP: 10.99.0.3
- [ ] Port forwarding: 4841 → 192.168.1.100:4840 (different external port)
- [ ] ROAMS endpoint: `opc.tcp://10.99.0.3:4840`
- [ ] Testing: ✓ Works

**Station 3: LUTETE**
- [ ] L2TP configured: username `lutete`, password `***`
- [ ] Gets VPN IP: 10.99.0.4
- [ ] Port forwarding: 4842 → 192.168.1.100:4840 (different external port)
- [ ] ROAMS endpoint: `opc.tcp://10.99.0.4:4840`
- [ ] Testing: ✓ Works

---

## Summary Checklist: "Ready for Production"

You're ready to deploy when ALL of these are checked:

- [ ] L2TP/IPsec VPN working stably (verified for 24+ hours)
- [ ] Port forwarding rule created and saved
- [ ] Port forwarding verified working (`telnet` test passed)
- [ ] OPC UA connection verified from ROAMS
- [ ] ROAMS dashboard shows live data from station
- [ ] Data continues flowing for 24+ hours without issues
- [ ] Backup configuration created and verified
- [ ] Documentation completed with all credentials
- [ ] Router uptime stable (days, not hours)
- [ ] Team members trained on setup
- [ ] Monitoring alerts configured (if applicable)

---

## Troubleshooting Quick Links

If something goes wrong:

| Symptom | Guide |
|---------|-------|
| Connection timeout | QX310_PORT_FORWARDING_TROUBLESHOOTING.md → Symptom 2 |
| Connection refused | QX310_PORT_FORWARDING_TROUBLESHOOTING.md → Symptom 1 |
| Port works, OPC fails | QX310_PORT_FORWARDING_TROUBLESHOOTING.md → Symptom 3 |
| Intermittent issues | QX310_PORT_FORWARDING_TROUBLESHOOTING.md → Symptom 4 |
| Works locally, not via VPN | QX310_PORT_FORWARDING_TROUBLESHOOTING.md → Symptom 6 |
| Can't reach router | QX310_PORT_FORWARDING_TROUBLESHOOTING.md → Symptom 7 |

---

## Final Production Verification

After completing all steps, verify once more:

```bash
# From VPS
ssh deploy@your_vps_ip

# 1. L2TP connection
ping 10.99.0.2
# Expected: Reply

# 2. Port forwarding
telnet 10.99.0.2 4840
# Expected: Connected

# 3. ROAMS OPC UA
python3 << 'EOF'
from opcua import Client
client = Client("opc.tcp://10.99.0.2:4840")
client.connect()
print("✅ ALL SYSTEMS GO!")
client.disconnect()
EOF
```

All three tests passing? **You're in production!** 🎉

---

## Support

| Issue | Checklist | Document |
|-------|-----------|----------|
| Setup | This file | QX310_PORT_FORWARDING_SETUP_CHECKLIST.md |
| Quick reference | QX310_PORT_FORWARDING_QUICK.md | 5-minute visual guide |
| Complete guide | QX310_FIREWALL_PORT_FORWARDING.md | Full documentation |
| Troubleshooting | QX310_PORT_FORWARDING_TROUBLESHOOTING.md | Problem diagnosis |
| L2TP setup | QX310_L2TP_SETUP_GUIDE.md | VPN configuration |

---

**Estimated Time to Complete:**
- Setup: 15-20 minutes
- Testing: 5-10 minutes
- Troubleshooting (if needed): 10-30 minutes
- **Total: 30-60 minutes**

**Support Time:**
- Quick questions: QX310_PORT_FORWARDING_QUICK.md
- Stuck on a step: This checklist
- Something broken: QX310_PORT_FORWARDING_TROUBLESHOOTING.md
- Complete details: QX310_FIREWALL_PORT_FORWARDING.md

---

Last Updated: February 2026
Version: 1.0 (Complete)
Status: Ready for Production Use ✅
