# 🔒 L2TP/IPsec VPN Server Setup for ROAMS Multi-Station Monitoring

## Overview

This guide configures your VPS as an L2TP/IPsec VPN server for secure connections to remote SCADA stations. L2TP/IPsec has native support in Windows, Android, and iOS - no additional client software required.

**Advantages over OpenVPN:**
- ✅ Built into all major operating systems (Windows, macOS, Android, iOS)
- ✅ No client software installation required
- ✅ Simpler firewall configuration
- ✅ Excellent compatibility with industrial routers and PLCs
- ✅ Suitable for mobile field operators

**What you'll achieve:**
- VPS acts as central L2TP/IPsec hub
- Multiple remote stations connect simultaneously
- Native client support on all platforms
- Secure encrypted connections (IPsec ESP + IKEv2)
- ROAMS can access all stations' OPC UA servers

**Time Required**: 30-40 minutes  
**Prerequisites**: VPS deployed with Ubuntu 22.04/24.04

---

## Architecture Diagram

```
Remote Stations                    VPS (Central Hub)
┌─────────────────────┐            ┌──────────────────────────┐
│ Station A (Windows) │            │                          │
│ L2TP/IPsec Client   │───────────>│  L2TP/IPsec Server       │
│ VPN IP: 10.99.0.2   │  Tunnel    │  UDP 500, 4500, 1701     │
│ LAN: 192.168.1.x    │            │                          │
└─────────────────────┘            │  ┌────────────────────┐  │
                                   │  │ ROAMS Backend      │  │
┌─────────────────────┐            │  │ Django + OPC UA    │  │
│ Station B (Android) │            │  │ Connects to all    │  │
│ L2TP/IPsec Client   │───────────>│  │ remote stations    │  │
│ VPN IP: 10.99.0.3   │  Tunnel    │  └────────────────────┘  │
│ LAN: 192.168.2.x    │            │                          │
└─────────────────────┘            │  PostgreSQL + Redis      │
                                   │  NGINX (443/80)          │
┌─────────────────────┐            │                          │
│ Station C (iOS)     │            │  Public IP:              │
│ L2TP/IPsec Client   │───────────>│  YOUR_VPS_IP             │
│ VPN IP: 10.99.0.4   │  Tunnel    │                          │
│ Mobile Operator     │            └──────────────────────────┘
└─────────────────────┘
```

**Network Flow:**
1. Remote station initiates IPsec connection (UDP 500)
2. IPsec establishes encrypted tunnel
3. L2TP tunnel created inside IPsec (UDP 1701)
4. Station gets VPN IP from 10.99.0.0/24 range
5. ROAMS backend connects to station's local OPC UA server

---

## Part 1: Install Required Packages (5 minutes)

### Step 1.1: SSH into Your VPS

```bash
# From your local machine
ssh deploy@YOUR_VPS_IP
# Or: ssh root@YOUR_VPS_IP (if using root)
```

### Step 1.2: Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### Step 1.3: Install strongSwan (IPsec) and xl2tpd (L2TP)

```bash
# Install VPN packages
sudo apt install strongswan strongswan-pki libstrongswan-extra-plugins -y
sudo apt install xl2tpd -y

# Verify installations
strongswan version  # Should show 5.9.x or newer
xl2tpd -v           # Should show xl2tpd version
```

✅ **Checkpoint 1**: Packages installed successfully

---

## Part 2: Configure IPsec (strongSwan) (10 minutes)

### Step 2.1: Backup Original Configuration

```bash
sudo cp /etc/ipsec.conf /etc/ipsec.conf.backup
sudo cp /etc/ipsec.secrets /etc/ipsec.secrets.backup
```

### Step 2.2: Configure IPsec Settings

```bash
sudo nano /etc/ipsec.conf
```

Replace entire file with:

```conf
# ROAMS L2TP/IPsec Server Configuration
# /etc/ipsec.conf

config setup
    charondebug="ike 2, knl 2, cfg 2, net 2, esp 2, dmn 2, mgr 2"
    uniqueids=no
    strictcrlpolicy=no

conn %default
    ikelifetime=60m
    keylife=20m
    rekeymargin=3m
    keyingtries=1
    keyexchange=ikev1
    authby=secret
    ike=aes128-sha1-modp1024,aes128-sha1-modp1536,aes128-sha1-modp2048,aes256-sha1-modp1024,aes256-sha1-modp1536,aes256-sha1-modp2048!
    esp=aes128-sha1-modp1024,aes128-sha1-modp1536,aes128-sha1-modp2048,aes256-sha1-modp1024,aes256-sha1-modp1536,aes256-sha1-modp2048!

conn L2TP-PSK
    type=transport
    keyexchange=ikev1
    authby=secret
    leftprotoport=17/1701
    left=%any
    right=%any
    rightprotoport=17/%any
    auto=add
    dpdaction=clear
    dpddelay=300s
    dpdtimeout=1000s
    forceencaps=yes
```

**Save**: `Ctrl+X`, `Y`, `Enter`

### Step 2.3: Configure Pre-Shared Key (PSK)

```bash
sudo nano /etc/ipsec.secrets
```

Add this line (replace YOUR_STRONG_PSK with a strong password):

```
# IPsec Pre-Shared Key for L2TP
# Format: local_ip remote_ip : PSK "password"
YOUR_VPS_IP %any : PSK "YOUR_STRONG_PSK"
```

**Example:**
```
144.91.79.167 %any : PSK "R0ams$ecure2024!VPN#Pass"
```

**Generate Strong PSK** (recommended):
```bash
# Generate random 32-character password
openssl rand -base64 32
# Copy output and use as PSK
```

**Save**: `Ctrl+X`, `Y`, `Enter`

### Step 2.4: Set Proper Permissions

```bash
sudo chmod 600 /etc/ipsec.secrets
sudo chmod 644 /etc/ipsec.conf
```

✅ **Checkpoint 2**: IPsec configured with PSK

---

## Part 3: Configure L2TP (xl2tpd) (10 minutes)

### Step 3.1: Backup Original Configuration

```bash
sudo cp /etc/xl2tpd/xl2tpd.conf /etc/xl2tpd/xl2tpd.conf.backup
```

### Step 3.2: Configure xl2tpd

```bash
sudo nano /etc/xl2tpd/xl2tpd.conf
```

Replace entire file with:

```conf
[global]
port = 1701
auth file = /etc/ppp/chap-secrets
debug avp = yes
debug network = yes
debug state = yes
debug tunnel = yes

[lns default]
ip range = 10.99.0.2-10.99.0.254
local ip = 10.99.0.1
require chap = yes
refuse pap = yes
require authentication = yes
name = L2TP-VPN
ppp debug = yes
pppoptfile = /etc/ppp/options.xl2tpd
length bit = yes
```

**Save**: `Ctrl+X`, `Y`, `Enter`

**Configuration Breakdown:**
- `ip range`: VPN clients get IPs from 10.99.0.2 to 10.99.0.254
- `local ip`: VPN server gets 10.99.0.1
- `require chap`: Use CHAP authentication (secure)
- `refuse pap`: Disable PAP (insecure)

### Step 3.3: Configure PPP Options

```bash
sudo nano /etc/ppp/options.xl2tpd
```

Create new file with:

```conf
# ROAMS L2TP PPP Options
# /etc/ppp/options.xl2tpd

ipcp-accept-local
ipcp-accept-remote
require-mschap-v2
ms-dns 8.8.8.8
ms-dns 8.8.4.4
noccp
auth
crtscts
idle 1800
mtu 1410
mru 1410
nodefaultroute
debug
lock
proxyarp
connect-delay 5000
```

**Save**: `Ctrl+X`, `Y`, `Enter`

**Key Options:**
- `ms-dns`: DNS servers pushed to clients (Google DNS)
- `require-mschap-v2`: Secure authentication
- `mtu 1410`: Optimized for L2TP/IPsec overhead
- `nodefaultroute`: Don't change client's default route (important!)

---

## Part 4: Create VPN User Accounts (5 minutes)

### Step 4.1: Configure CHAP Secrets (User Database)

```bash
sudo nano /etc/ppp/chap-secrets
```

Add users in this format:
```
# username  server  password  IP
station_a   *       Station_A_Pass_2024!   10.99.0.2
station_b   *       Station_B_Pass_2024!   10.99.0.3
station_c   *       Station_C_Pass_2024!   10.99.0.4
admin       *       Admin_VPN_Pass_2024!   10.99.0.10
```

**Format explanation:**
- Column 1: Username (client will use this)
- Column 2: Server name (* = any)
- Column 3: Password (strong passwords!)
- Column 4: Fixed IP for client (optional but recommended)

**Security Best Practices:**
- Use unique passwords for each station
- Minimum 16 characters with mixed case, numbers, symbols
- Document credentials securely (e.g., password manager)

**Save**: `Ctrl+X`, `Y`, `Enter`

### Step 4.2: Set Proper Permissions

```bash
sudo chmod 600 /etc/ppp/chap-secrets
```

✅ **Checkpoint 3**: User accounts created

---

## Part 5: Configure Firewall (UFW) (5 minutes)

### Step 5.1: Enable IP Forwarding

```bash
sudo nano /etc/sysctl.conf
```

Find and uncomment (or add) these lines:

```conf
net.ipv4.ip_forward = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.rp_filter = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.icmp_ignore_bogus_error_responses = 1
```

**Save**: `Ctrl+X`, `Y`, `Enter`

Apply changes:
```bash
sudo sysctl -p
```

### Step 5.2: Configure UFW Rules

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Allow IPsec (UDP 500 and 4500)
sudo ufw allow 500/udp
sudo ufw allow 4500/udp

# Allow L2TP (UDP 1701)
sudo ufw allow 1701/udp

# Allow HTTP/HTTPS for ROAMS web interface
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (if remote access needed)
# sudo ufw allow 5432/tcp  # Uncomment if needed

# Check rules
sudo ufw status verbose
```

### Step 5.3: Configure NAT and Forwarding

```bash
sudo nano /etc/ufw/before.rules
```

Add these lines **at the top** (before `*filter`):

```conf
# NAT table rules for L2TP/IPsec VPN
*nat
:POSTROUTING ACCEPT [0:0]

# Forward traffic from VPN clients
-A POSTROUTING -s 10.99.0.0/24 -o eth0 -j MASQUERADE

COMMIT

# Forwarding rules for IPsec
*mangle
-A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
COMMIT

# Don't delete the 'COMMIT' line or these rules won't be processed
```

**Note:** Replace `eth0` with your actual network interface (check with `ip a`)

**Save**: `Ctrl+X`, `Y`, `Enter`

### Step 5.4: Enable UFW (if not already enabled)

```bash
# Enable firewall
sudo ufw enable

# Reload to apply new rules
sudo ufw reload

# Verify status
sudo ufw status numbered
```

You should see:
```
Status: active

To                         Action      From
--                         ------      ----
[ 1] 22/tcp                 ALLOW IN    Anywhere
[ 2] 500/udp                ALLOW IN    Anywhere
[ 3] 4500/udp               ALLOW IN    Anywhere
[ 4] 1701/udp               ALLOW IN    Anywhere
[ 5] 80/tcp                 ALLOW IN    Anywhere
[ 6] 443/tcp                ALLOW IN    Anywhere
```

✅ **Checkpoint 4**: Firewall configured

---

## Part 6: Start and Enable Services (3 minutes)

### Step 6.1: Restart Services

```bash
# Restart IPsec (strongSwan)
sudo systemctl restart strongswan-starter
sudo systemctl enable strongswan-starter

# Restart L2TP (xl2tpd)
sudo systemctl restart xl2tpd
sudo systemctl enable xl2tpd

# Check service status
sudo systemctl status strongswan-starter
sudo systemctl status xl2tpd
```

Both should show: `Active: active (running)`

### Step 6.2: Verify Services are Listening

```bash
# Check IPsec ports
sudo netstat -tulpn | grep -E '500|4500'

# Check L2TP port
sudo netstat -tulpn | grep 1701
```

Expected output:
```
udp   0   0 0.0.0.0:500    0.0.0.0:*    -
udp   0   0 0.0.0.0:4500   0.0.0.0:*    -
udp   0   0 0.0.0.0:1701   0.0.0.0:*    xl2tpd
```

✅ **Checkpoint 5**: Services running

---

## Part 7: Client Configuration

### 7.1: Windows 10/11 Setup

#### Step 1: Open VPN Settings
1. Press `Win + I` → **Network & Internet**
2. Click **VPN** → **Add VPN**

#### Step 2: Configure Connection
- **VPN Provider**: Windows (built-in)
- **Connection Name**: ROAMS VPN
- **Server name or address**: `YOUR_VPS_IP` (e.g., 144.91.79.167)
- **VPN Type**: L2TP/IPsec with pre-shared key
- **Pre-shared key**: `YOUR_STRONG_PSK` (from `/etc/ipsec.secrets`)
- **Type of sign-in info**: Username and password
- **Username**: `station_a` (from `/etc/ppp/chap-secrets`)
- **Password**: `Station_A_Pass_2024!`

#### Step 3: Advanced Settings (Important!)
1. Right-click VPN connection → **Properties**
2. **Security** tab:
   - Type of VPN: L2TP/IPsec with pre-shared key
   - Data encryption: Optional encryption
   - Check: **Allow these protocols**
   - Select: **Challenge Handshake Authentication Protocol (CHAP)**
   - Uncheck: **Microsoft CHAP Version 2 (MS-CHAP v2)** if issues occur
3. **Networking** tab:
   - Uncheck **Internet Protocol Version 6 (TCP/IPv6)**
   - Select **Internet Protocol Version 4 (TCP/IPv4)** → **Properties**
   - Click **Advanced**
   - Uncheck **Use default gateway on remote network** (critical for split tunneling)

#### Step 4: Connect
1. Click VPN connection → **Connect**
2. Enter credentials
3. Should connect within 10-20 seconds

#### Verify Connection:
```cmd
ipconfig
# Look for "PPP adapter ROAMS VPN" with IP 10.99.0.x

ping 10.99.0.1
# Should reply (VPN server)
```

---

### 7.2: Android Setup

1. **Settings** → **Network & Internet** → **VPN**
2. Tap **+** to add VPN
3. Configure:
   - **Name**: ROAMS VPN
   - **Type**: L2TP/IPsec PSK
   - **Server address**: YOUR_VPS_IP
   - **IPsec pre-shared key**: YOUR_STRONG_PSK
   - **Username**: station_b
   - **Password**: Station_B_Pass_2024!
4. **Save** and **Connect**

---

### 7.3: iOS/iPad Setup

1. **Settings** → **General** → **VPN**
2. **Add VPN Configuration**
3. **Type**: L2TP
4. **Description**: ROAMS VPN
5. **Server**: YOUR_VPS_IP
6. **Account**: station_c
7. **Password**: Station_C_Pass_2024!
8. **Secret (PSK)**: YOUR_STRONG_PSK
9. **Send All Traffic**: OFF (for split tunneling)
10. **Save** and toggle VPN **ON**

---

### 7.4: Linux (NetworkManager) Setup

```bash
# Install L2TP plugins
sudo apt install network-manager-l2tp network-manager-l2tp-gnome -y

# Restart NetworkManager
sudo systemctl restart NetworkManager
```

**GUI Configuration:**
1. Click network icon → **VPN** → **Add VPN**
2. **Connection Type**: Layer 2 Tunneling Protocol (L2TP)
3. **Gateway**: YOUR_VPS_IP
4. **User name**: station_a
5. **Password**: Station_A_Pass_2024!
6. Click **IPsec Settings**:
   - Enable IPsec tunnel to L2TP host
   - **Pre-shared key**: YOUR_STRONG_PSK
7. **Save** and **Connect**

---

### 7.5: MikroTik Router Setup (For Station-to-VPS Links)

If remote stations use MikroTik routers:

```bash
# Via Winbox or SSH:
/interface l2tp-client
add connect-to=YOUR_VPS_IP \
    disabled=no \
    ipsec-secret=YOUR_STRONG_PSK \
    name=vpn-roams \
    password=station_a \
    use-ipsec=yes \
    user=station_a

# Add firewall NAT rule (if needed)
/ip firewall nat
add action=masquerade chain=srcnat out-interface=vpn-roams

# Add routing (if needed)
/ip route
add distance=1 dst-address=10.99.0.0/24 gateway=vpn-roams
```

---

## Part 8: Testing and Verification

### 8.1: Test from VPS Side

```bash
# Monitor real-time logs
sudo tail -f /var/log/syslog | grep -E 'xl2tpd|pluto|charon'

# Check active connections
sudo ipsec status

# Check L2TP sessions
sudo xl2tpd-control show all
```

### 8.2: Test from Client Side

After connecting VPN from remote station:

**Windows:**
```cmd
# Check VPN IP
ipconfig
# Look for: PPP adapter ROAMS VPN - IPv4: 10.99.0.x

# Test connectivity to VPS
ping 10.99.0.1

# Test connectivity to other VPN clients (if client-to-client enabled)
ping 10.99.0.2

# Trace route
tracert 10.99.0.1
```

**Linux:**
```bash
# Check VPN interface
ip addr show ppp0

# Test connectivity
ping -c 4 10.99.0.1

# Check routing
ip route | grep ppp0
```

### 8.3: Test OPC UA Connection Through VPN

Assuming station has OPC UA server at `192.168.1.100:4840`:

**From VPS (ROAMS backend):**
```bash
# Install OPC UA test client (if not installed)
pip install opcua

# Python test script
python3 << EOF
from opcua import Client
client = Client("opc.tcp://10.99.0.2:4840")  # Station A's VPN IP
try:
    client.connect()
    print("✅ OPC UA connected successfully via VPN!")
    root = client.get_root_node()
    print(f"Root node: {root}")
    client.disconnect()
except Exception as e:
    print(f"❌ Connection failed: {e}")
EOF
```

---

## Part 9: Troubleshooting

### Issue 1: Client Can't Connect (No Response)

**Check server logs:**
```bash
sudo tail -n 50 /var/log/syslog | grep pluto
```

**Common causes:**
- ❌ Firewall blocking UDP 500/4500/1701
- ❌ Wrong PSK
- ❌ Services not running

**Fix:**
```bash
# Verify firewall
sudo ufw status
sudo ufw allow 500/udp
sudo ufw allow 4500/udp
sudo ufw allow 1701/udp

# Restart services
sudo systemctl restart strongswan-starter xl2tpd

# Check PSK matches in /etc/ipsec.secrets and client config
```

---

### Issue 2: IPsec Connects, L2TP Fails

**Symptoms:** Client shows "Connecting..." then fails

**Check logs:**
```bash
sudo tail -f /var/log/syslog | grep xl2tpd
```

**Common causes:**
- ❌ Wrong username/password in `/etc/ppp/chap-secrets`
- ❌ xl2tpd not running

**Fix:**
```bash
# Verify CHAP secrets
sudo cat /etc/ppp/chap-secrets

# Restart xl2tpd
sudo systemctl restart xl2tpd
sudo systemctl status xl2tpd
```

---

### Issue 3: Connection Drops After Few Minutes

**Check logs:**
```bash
sudo journalctl -u xl2tpd -f
```

**Common causes:**
- ❌ NAT traversal issues
- ❌ Keepalive settings too aggressive

**Fix in `/etc/ipsec.conf`:**
```conf
conn L2TP-PSK
    # Add these lines:
    dpdaction=clear
    dpddelay=300s
    dpdtimeout=1000s
```

```bash
sudo systemctl restart strongswan-starter
```

---

### Issue 4: Can Ping VPS but Not Internet/Other Stations

**Cause:** NAT not working or routing issues

**Fix:**
```bash
# Check IP forwarding
sysctl net.ipv4.ip_forward
# Should be: net.ipv4.ip_forward = 1

# If 0, enable it:
sudo sysctl -w net.ipv4.ip_forward=1

# Check NAT rules
sudo iptables -t nat -L POSTROUTING -v

# Should see MASQUERADE rule for 10.99.0.0/24

# If missing, add manually:
sudo iptables -t nat -A POSTROUTING -s 10.99.0.0/24 -o eth0 -j MASQUERADE
```

---

### Issue 5: Windows Error 789 (L2TP Connection Failed)

**Common on Windows 10/11 behind NAT**

**Fix on Windows client:**
1. Press `Win + R` → `regedit`
2. Navigate to: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\PolicyAgent`
3. Right-click → **New** → **DWORD (32-bit) Value**
4. Name: `AssumeUDPEncapsulationContextOnSendRule`
5. Value: `2`
6. Reboot Windows
7. Try connecting again

**Alternative:** Use IKEv2 instead (requires additional certificate setup)

---

## Part 10: Security Hardening

### 10.1: Fail2Ban for VPN Brute Force Protection

```bash
# Install Fail2Ban
sudo apt install fail2ban -y

# Create L2TP jail
sudo nano /etc/fail2ban/jail.d/l2tp.conf
```

Add:
```conf
[xl2tpd]
enabled = true
port = 1701
protocol = udp
filter = xl2tpd
logpath = /var/log/syslog
maxretry = 5
bantime = 3600
findtime = 600
```

Create filter:
```bash
sudo nano /etc/fail2ban/filter.d/xl2tpd.conf
```

Add:
```conf
[Definition]
failregex = xl2tpd.*Maximum retries exceeded for tunnel.*Host: <HOST>
            xl2tpd.*tunnel.*authentication failed.*<HOST>
ignoreregex =
```

Restart:
```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status xl2tpd
```

### 10.2: Rate Limiting with UFW

```bash
# Limit connection attempts
sudo ufw limit 500/udp
sudo ufw limit 4500/udp
sudo ufw limit 1701/udp
```

### 10.3: Regular Security Audits

```bash
# Monitor active VPN sessions
sudo xl2tpd-control show all

# Check IPsec status
sudo ipsec statusall

# Review authentication attempts
sudo grep "xl2tpd" /var/log/syslog | grep -i "auth"

# Check for failed login attempts
sudo grep "pppd" /var/log/syslog | grep -i "fail"
```

---

## Part 11: Integration with ROAMS Backend

### 11.1: Update OPC UA Client Configurations

Once stations are connected via VPN, update ROAMS to use VPN IPs:

**Django Admin** (`http://YOUR_VPS_IP:8000/admin/`):
1. Navigate to **ROAMS OPC UA Mgr** → **OPC UA Client Configs**
2. For each station, update:
   - **Endpoint URL**: Change from `opc.tcp://192.168.1.100:4840` to `opc.tcp://10.99.0.2:4840` (use station's VPN IP)
   - **Station Name**: Keep descriptive (e.g., "Bombo Station A")
3. Save changes

**Or via Django shell:**
```bash
cd /opt/roams/roams_backend
source venv_new/bin/activate
python manage.py shell
```

```python
from roams_opcua_mgr.models import OpcUaClientConfig

# Update station A
station_a = OpcUaClientConfig.objects.get(station_name="Station A")
station_a.endpoint_url = "opc.tcp://10.99.0.2:4840"
station_a.save()

# Update station B
station_b = OpcUaClientConfig.objects.get(station_name="Station B")
station_b.endpoint_url = "opc.tcp://10.99.0.3:4840"
station_b.save()

print("✅ OPC UA endpoints updated to use VPN IPs")
```

### 11.2: Test OPC UA Connections

```bash
# From ROAMS backend directory
cd /opt/roams/roams_backend
source venv_new/bin/activate

# Run diagnostic script
python diagnose_opcua.py
```

Should show:
```
✅ Connected to Station A via VPN (10.99.0.2)
✅ Connected to Station B via VPN (10.99.0.3)
```

### 11.3: Configure Station Mappings in Frontend

Update `roams_frontend/src/config/stations.ts` (if exists):
```typescript
export const STATION_VPN_MAP = {
  'Station A': {
    localIp: '192.168.1.100',
    vpnIp: '10.99.0.2',
    opcuaPort: 4840
  },
  'Station B': {
    localIp: '192.168.2.100',
    vpnIp: '10.99.0.3',
    opcuaPort: 4840
  }
};
```

---

## Part 12: Maintenance and Monitoring

### 12.1: Daily Health Checks

Create monitoring script:
```bash
sudo nano /opt/roams/scripts/vpn_health_check.sh
```

Add:
```bash
#!/bin/bash
# VPN Health Check Script

echo "=== VPN Health Check - $(date) ===" >> /var/log/vpn_health.log

# Check IPsec
if systemctl is-active --quiet strongswan-starter; then
    echo "✅ IPsec running" >> /var/log/vpn_health.log
else
    echo "❌ IPsec down - restarting" >> /var/log/vpn_health.log
    systemctl restart strongswan-starter
fi

# Check L2TP
if systemctl is-active --quiet xl2tpd; then
    echo "✅ L2TP running" >> /var/log/vpn_health.log
else
    echo "❌ L2TP down - restarting" >> /var/log/vpn_health.log
    systemctl restart xl2tpd
fi

# Count active sessions
SESSIONS=$(pgrep -c pppd)
echo "Active VPN sessions: $SESSIONS" >> /var/log/vpn_health.log

echo "" >> /var/log/vpn_health.log
```

Make executable and schedule:
```bash
sudo chmod +x /opt/roams/scripts/vpn_health_check.sh

# Add to crontab (run every hour)
(crontab -l 2>/dev/null; echo "0 * * * * /opt/roams/scripts/vpn_health_check.sh") | crontab -
```

### 12.2: View Connection Logs

```bash
# Real-time monitoring
sudo tail -f /var/log/syslog | grep -E 'xl2tpd|charon|pluto'

# View health log
sudo tail -f /var/log/vpn_health.log

# Active connections
sudo ipsec statusall | grep ESTABLISHED
```

### 12.3: Backup VPN Configuration

```bash
# Create backup script
sudo nano /opt/roams/scripts/backup_vpn_config.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/opt/roams/backups/vpn_$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

cp /etc/ipsec.conf $BACKUP_DIR/
cp /etc/ipsec.secrets $BACKUP_DIR/
cp /etc/xl2tpd/xl2tpd.conf $BACKUP_DIR/
cp /etc/ppp/chap-secrets $BACKUP_DIR/
cp /etc/ppp/options.xl2tpd $BACKUP_DIR/

tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

echo "✅ VPN config backed up to $BACKUP_DIR.tar.gz"
```

```bash
sudo chmod +x /opt/roams/scripts/backup_vpn_config.sh

# Run weekly (every Sunday at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * 0 /opt/roams/scripts/backup_vpn_config.sh") | crontab -
```

---

## Part 13: Performance Optimization

### 13.1: MTU Optimization

Test optimal MTU for your VPN:
```bash
# From VPN client, ping VPS with don't fragment flag
ping -M do -s 1472 10.99.0.1  # Linux
ping -f -l 1472 10.99.0.1     # Windows

# If packets fragment, reduce size until no fragmentation
# Optimal MTU = (largest non-fragmenting size + 28)
```

Update `/etc/ppp/options.xl2tpd`:
```conf
mtu 1400  # Adjust based on testing
mru 1400
```

### 13.2: Increase Connection Limits

For many simultaneous stations:
```bash
sudo nano /etc/xl2tpd/xl2tpd.conf
```

Add:
```conf
[global]
max connections = 50  # Increase from default
```

### 13.3: Kernel Tuning

```bash
sudo nano /etc/sysctl.d/99-vpn-tuning.conf
```

Add:
```conf
# VPN Performance Tuning
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.udp_rmem_min = 16384
net.ipv4.udp_wmem_min = 16384
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
```

Apply:
```bash
sudo sysctl -p /etc/sysctl.d/99-vpn-tuning.conf
```

---

## Quick Reference Card

### VPN Server IPs
- **VPS Public IP**: YOUR_VPS_IP
- **VPN Server IP**: 10.99.0.1
- **VPN Client Range**: 10.99.0.2 - 10.99.0.254

### Required Ports (UFW)
```bash
500/udp   # IPsec IKE
4500/udp  # IPsec NAT-T
1701/udp  # L2TP
```

### Configuration Files
- IPsec: `/etc/ipsec.conf` + `/etc/ipsec.secrets`
- L2TP: `/etc/xl2tpd/xl2tpd.conf`
- Users: `/etc/ppp/chap-secrets`
- PPP Options: `/etc/ppp/options.xl2tpd`

### Service Commands
```bash
# Restart VPN
sudo systemctl restart strongswan-starter xl2tpd

# Check status
sudo systemctl status strongswan-starter xl2tpd

# View logs
sudo tail -f /var/log/syslog | grep -E 'xl2tpd|charon'

# Active connections
sudo ipsec statusall
```

### Add New Station
1. Add user to `/etc/ppp/chap-secrets`
2. Assign fixed IP (e.g., 10.99.0.5)
3. Provide credentials + PSK to station
4. Update ROAMS OPC UA endpoint to use VPN IP

---

## Comparison: L2TP/IPsec vs OpenVPN

| Feature | L2TP/IPsec | OpenVPN |
|---------|------------|---------|
| **Client Installation** | ✅ Native (no install) | ❌ Requires software |
| **Windows Support** | ✅ Built-in | ⚠️ Client needed |
| **Android/iOS Support** | ✅ Built-in | ⚠️ App required |
| **Firewall Complexity** | ✅ Simple (3 ports) | ⚠️ More complex |
| **NAT Compatibility** | ⚠️ Can have issues | ✅ Excellent |
| **Speed** | ✅ Fast | ✅ Fast |
| **Security** | ✅ Strong (IPsec) | ✅ Strong (TLS) |
| **Industrial Devices** | ✅ Wide support | ⚠️ Limited |
| **Certificate Management** | ✅ PSK (simple) | ⚠️ PKI (complex) |

**Recommendation for ROAMS:**
- **L2TP/IPsec**: Best for field operators with mobile devices, simple station setups
- **OpenVPN**: Better for complex routing, NAT traversal issues, Linux-heavy deployments
- **Both**: Can run simultaneously (different ports)

---

## Hybrid VPN Architecture: L2TP + OpenVPN Together

### Why Use Both?

**Best of Both Worlds:**
- ✅ Remote stations use L2TP (simple, native, always-on)
- ✅ Administrators use OpenVPN (secure, flexible, on-demand)
- ✅ Access all sites from anywhere without exposing them to internet

### Architecture Diagram

```
Remote Sites (24/7)           VPS Hub (Central)              Admin Access (On-Demand)
┌──────────────────┐         ┌───────────────────┐          ┌──────────────────┐
│ Station A        │         │                   │          │ Admin Laptop     │
│ L2TP Client      │────────>│ L2TP Server       │          │ OpenVPN Client   │
│ VPN: 10.99.0.2   │ IPsec   │ 10.99.0.1         │<─────────│ VPN: 10.8.0.2    │
│ LAN: 192.168.1.x │         │                   │ TLS 1194 │                  │
└──────────────────┘         │ OpenVPN Server    │          └──────────────────┘
                             │ 10.8.0.1          │
┌──────────────────┐         │                   │          ┌──────────────────┐
│ Station B        │         │ Routing Between   │          │ Field Tech Phone │
│ L2TP Client      │────────>│ Both Networks     │          │ OpenVPN Client   │
│ VPN: 10.99.0.3   │ IPsec   │ Enabled           │<─────────│ VPN: 10.8.0.3    │
│ LAN: 192.168.2.x │         │                   │ TLS 1194 │ (Android/iOS)    │
└──────────────────┘         └───────────────────┘          └──────────────────┘
                                      │
                              ┌───────┴────────┐
                              │ ROAMS Backend  │
                              │ PostgreSQL     │
                              │ Redis, NGINX   │
                              └────────────────┘
```

### Network Configuration

**IP Ranges:**
- L2TP Network: `10.99.0.0/24` (Stations: .2-.254, Server: .1)
- OpenVPN Network: `10.8.0.0/24` (Admins: .2-.254, Server: .1)
- Separate subnets prevent conflicts

### Setup Steps

#### 1. Enable Routing Between VPN Networks

After setting up both L2TP and OpenVPN, enable routing between them:

```bash
# Edit OpenVPN server config
sudo nano /etc/openvpn/server/server.conf
```

Add these lines to allow OpenVPN clients to reach L2TP network:

```conf
# Push route to L2TP network for OpenVPN clients
push "route 10.99.0.0 255.255.255.0"

# Allow routing between networks
client-to-client
```

Restart OpenVPN:
```bash
sudo systemctl restart openvpn-server@server
```

#### 2. Update Firewall for Inter-VPN Routing

```bash
sudo nano /etc/ufw/before.rules
```

Add forwarding rules (in the existing NAT section):

```conf
# Existing NAT rules...
*nat
:POSTROUTING ACCEPT [0:0]

# L2TP clients NAT
-A POSTROUTING -s 10.99.0.0/24 -o eth0 -j MASQUERADE

# OpenVPN clients NAT
-A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE

# Allow OpenVPN clients to reach L2TP network (no NAT)
# -A POSTROUTING -s 10.8.0.0/24 -d 10.99.0.0/24 -j ACCEPT

COMMIT

*filter
# Allow forwarding between VPN networks
-A FORWARD -s 10.8.0.0/24 -d 10.99.0.0/24 -j ACCEPT
-A FORWARD -s 10.99.0.0/24 -d 10.8.0.0/24 -j ACCEPT

# Existing filter rules...
```

Reload UFW:
```bash
sudo ufw reload
```

#### 3. Test Cross-VPN Connectivity

**From OpenVPN client (admin laptop):**
```bash
# Connect via OpenVPN first
# Then test connectivity to L2TP station

ping 10.99.0.2  # Station A via L2TP
ping 10.99.0.3  # Station B via L2TP

# Test OPC UA connection
telnet 10.99.0.2 4840  # Should connect
```

**From VPS:**
```bash
# Verify routing table
ip route show

# Should see both networks:
# 10.8.0.0/24 dev tun0
# 10.99.0.0/24 dev ppp0
```

### Use Cases

#### Use Case 1: Remote Station Monitoring
**Scenario:** Permanent SCADA stations need 24/7 connection

**Solution:**
- Configure L2TP client on station's router/PC
- Auto-connect on boot
- ROAMS backend continuously monitors via 10.99.0.x IPs

**Configuration:**
```python
# roams_backend OPC UA config
station_a = OpcUaClientConfig.objects.get(station_name="Station A")
station_a.endpoint_url = "opc.tcp://10.99.0.2:4840"  # L2TP IP
station_a.save()
```

#### Use Case 2: Admin Remote Access
**Scenario:** Admin needs to troubleshoot station from home

**Solution:**
1. Connect to VPS via OpenVPN (secure, certificate-based)
2. Access any L2TP-connected station
3. Use SSH, RDP, OPC UA, web interfaces

**Example:**
```bash
# From admin laptop (connected via OpenVPN)

# SSH to station A's local server
ssh admin@10.99.0.2

# RDP to Windows station
rdesktop 10.99.0.3

# Access station's web interface
firefox http://10.99.0.2:8080
```

#### Use Case 3: Mobile Field Operators
**Scenario:** Technician needs to check station from mobile phone

**Solution:**
- Install OpenVPN app on Android/iOS
- Connect when needed (on-demand)
- View ROAMS dashboard at `https://10.8.0.1`
- Access station diagnostics via VPN

#### Use Case 4: Multi-Site Access from Single Connection
**Scenario:** Need to access 10+ stations without configuring 10 VPN connections

**Solution:**
- Each station connects via L2TP (always-on)
- Admin connects once via OpenVPN
- Access all stations through single VPN connection

### Security Considerations

**Separation of Concerns:**
- **L2TP**: Simple PSK auth (stations are trusted, physical security)
- **OpenVPN**: Certificate-based auth (admins, stricter security)

**Access Control:**
```bash
# Optional: Restrict OpenVPN users from accessing L2TP network
# (if you only want ROAMS backend to access stations)

sudo nano /etc/openvpn/server/server.conf
```

```conf
# Remove or comment out:
# push "route 10.99.0.0 255.255.255.0"

# Only allow specific OpenVPN clients to access L2TP network
# Use client-config-dir for per-user routing
```

**Firewall Rules for Restricted Access:**
```bash
# Only allow ROAMS backend user to access L2TP network
sudo ufw allow from 10.8.0.5 to 10.99.0.0/24  # Admin user
sudo ufw deny from 10.8.0.0/24 to 10.99.0.0/24  # Other users
```

### Monitoring Both VPN Networks

Create unified monitoring script:

```bash
sudo nano /opt/roams/scripts/vpn_unified_monitor.sh
```

```bash
#!/bin/bash
# Unified VPN Monitoring

echo "=== VPN Status - $(date) ===" | tee /var/log/vpn_unified.log

# L2TP Connections
echo "=== L2TP Connections ===" | tee -a /var/log/vpn_unified.log
pgrep -a pppd | wc -l | xargs echo "Active L2TP clients:" | tee -a /var/log/vpn_unified.log
sudo xl2tpd-control show all | tee -a /var/log/vpn_unified.log

# OpenVPN Connections  
echo "=== OpenVPN Connections ===" | tee -a /var/log/vpn_unified.log
sudo cat /var/log/openvpn/openvpn-status.log | grep "CLIENT_LIST" | wc -l | xargs echo "Active OpenVPN clients:" | tee -a /var/log/vpn_unified.log

# Routing Table
echo "=== VPN Routes ===" | tee -a /var/log/vpn_unified.log
ip route | grep -E 'tun0|ppp' | tee -a /var/log/vpn_unified.log

echo "" | tee -a /var/log/vpn_unified.log
```

```bash
sudo chmod +x /opt/roams/scripts/vpn_unified_monitor.sh

# Run every 15 minutes
(crontab -l 2>/dev/null; echo "*/15 * * * * /opt/roams/scripts/vpn_unified_monitor.sh") | crontab -
```

### Troubleshooting Hybrid Setup

**Issue: OpenVPN clients can't reach L2TP network**

```bash
# 1. Check IP forwarding
sysctl net.ipv4.ip_forward  # Should be 1

# 2. Check routing on VPS
ip route | grep 10.99.0.0  # Should exist

# 3. Check OpenVPN config pushes route
sudo grep "push.*10.99" /etc/openvpn/server/server.conf

# 4. Check firewall allows forwarding
sudo ufw status verbose | grep FORWARD

# 5. Test from VPS
ping 10.99.0.2  # Should work from VPS

# 6. Check OpenVPN client routing table
# From OpenVPN client:
route -n | grep 10.99  # Should show route via tun0
```

**Issue: Slow performance when accessing L2TP stations via OpenVPN**

```bash
# Optimize MTU for double-tunneled traffic
sudo nano /etc/openvpn/server/server.conf
```

```conf
# Reduce MTU for nested VPN
tun-mtu 1400
push "tun-mtu 1400"
```

### Best Practices

**Network Segmentation:**
- ✅ L2TP: Remote stations (10.99.0.0/24)
- ✅ OpenVPN: Human users (10.8.0.0/24)
- ✅ Public: ROAMS web interface (NGINX reverse proxy)

**Authentication:**
- ✅ L2TP: Shared PSK + per-user passwords (simpler for devices)
- ✅ OpenVPN: Individual certificates (stronger for humans)

**Connectivity:**
- ✅ L2TP: Always-on (auto-reconnect on boot)
- ✅ OpenVPN: On-demand (connect when needed)

**Monitoring:**
- ✅ Alert if L2TP station disconnects (critical)
- ✅ Log OpenVPN admin connections (audit trail)

### Configuration Summary

**For Remote Stations (L2TP):**
```
Server: YOUR_VPS_IP
Type: L2TP/IPsec PSK
PSK: YOUR_STRONG_PSK
Username: station_a
Password: Station_A_Pass_2024!
Auto-connect: Yes
```

**For Administrators (OpenVPN):**
```
Server: YOUR_VPS_IP:1194
Protocol: UDP
Certificate: admin.ovpn (includes certificates)
Auto-connect: No (on-demand)
```

**ROAMS Backend Config:**
```python
# OPC UA endpoints use L2TP IPs
endpoint_url = "opc.tcp://10.99.0.2:4840"

# Backend can be accessed from:
# - L2TP network: http://10.99.0.1:8000
# - OpenVPN network: http://10.8.0.1:8000
# - Public internet: https://YOUR_DOMAIN
```

---

## Deployment Checklist: Hybrid VPN

- [ ] L2TP/IPsec installed and configured
- [ ] OpenVPN installed and configured  
- [ ] IP forwarding enabled between networks
- [ ] Firewall rules allow inter-VPN routing
- [ ] OpenVPN config pushes L2TP route
- [ ] Tested L2TP station connection
- [ ] Tested OpenVPN admin connection
- [ ] Tested cross-VPN connectivity (OpenVPN → L2TP)
- [ ] ROAMS OPC UA endpoints updated to L2TP IPs
- [ ] Monitoring scripts deployed
- [ ] Documentation updated with all credentials
- [ ] Backup both VPN configurations

**Quick Test:**
```bash
# 1. Connect Station A via L2TP → Gets 10.99.0.2
# 2. Connect Admin via OpenVPN → Gets 10.8.0.2
# 3. From admin laptop: ping 10.99.0.2
# 4. From admin laptop: telnet 10.99.0.2 4840
# ✅ Both should succeed
```

---

## Next Steps

After VPN setup complete:

1. ✅ Connect all remote stations to VPN
2. ✅ Update ROAMS OPC UA endpoints to use VPN IPs (10.99.0.x)
3. ✅ Test data flow: Station → VPN → ROAMS Backend
4. ✅ Configure monitoring/alerts for VPN downtime
5. ✅ Train field operators on VPN client setup
6. ✅ Document station-specific credentials securely
7. ✅ Setup backup VPN server (optional redundancy)

**Related Documentation:**
- `CONTABO_VPS_DEPLOYMENT.md` - VPS initial setup
- `VPN_SERVER_SETUP_GUIDE.md` - OpenVPN alternative
- `API_ENDPOINTS_GUIDE.md` - ROAMS API reference
- `ARCHITECTURE_DIAGRAMS.md` - System overview

---

## Support and Troubleshooting

**Common Issues Checklist:**
- [ ] Firewall allows UDP 500, 4500, 1701
- [ ] IP forwarding enabled (`net.ipv4.ip_forward = 1`)
- [ ] Services running (`systemctl status strongswan-starter xl2tpd`)
- [ ] PSK matches between server and client
- [ ] Username/password in `/etc/ppp/chap-secrets`
- [ ] Client using correct VPN type (L2TP/IPsec PSK)
- [ ] NAT rules configured in `/etc/ufw/before.rules`

**Get Help:**
```bash
# Generate diagnostic report
sudo xl2tpd-control show all > /tmp/l2tp_status.txt
sudo ipsec statusall > /tmp/ipsec_status.txt
sudo tail -200 /var/log/syslog | grep -E 'xl2tpd|charon' > /tmp/vpn_logs.txt

# Send to admin for review
tar -czf vpn_diagnostics.tar.gz /tmp/*_status.txt /tmp/vpn_logs.txt
```

---

**Setup Complete! 🎉**

Your ROAMS system now has secure L2TP/IPsec VPN connectivity to all remote stations.

**Quick Test:**
1. Connect from client: VPN should connect in <20 seconds
2. Verify IP: `ipconfig` (Windows) or `ip a` (Linux) shows 10.99.0.x
3. Test ROAMS: Navigate to dashboard, confirm real-time data from stations

**Production Checklist:**
- ✅ All stations connected and tested
- ✅ OPC UA endpoints updated to VPN IPs
- ✅ Monitoring scripts running (health checks)
- ✅ Credentials documented securely
- ✅ Backup configurations saved
- ✅ Firewall rules verified
- ✅ Field operators trained on VPN client

---

**Author**: ROAMS Development Team  
**Last Updated**: February 2026  
**Version**: 1.0
