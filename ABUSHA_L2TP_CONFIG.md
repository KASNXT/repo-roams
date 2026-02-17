# Abusha Station - L2TP VPN Configuration

## Station Details
- **Station Name**: Abusha
- **Username**: `abusha`
- **Password**: `Abusha2026!`
- **VPN IP Address**: `10.99.0.6`
- **VPS Server**: `144.91.79.167`

---

## Step 1: Create User on VPS L2TP Server

**Run these commands on the VPS** (SSH as root):

```bash
# SSH to VPS
ssh root@144.91.79.167

# Add Abusha user to L2TP secrets file
sudo bash -c 'cat >> /etc/ppp/chap-secrets' << EOF
abusha L2TP-VPS Abusha2026! 10.99.0.6
EOF

# Verify the user was added
sudo tail -5 /etc/ppp/chap-secrets

# Restart xl2tpd service
sudo systemctl restart xl2tpd

# Check service status
sudo systemctl status xl2tpd
```

Expected output in `/etc/ppp/chap-secrets`:
```
abusha L2TP-VPS Abusha2026! 10.99.0.6
```

---

## Step 2: Configure QX310 Router at Abusha Station

### Access Router
1. Connect to router: `http://192.168.1.1` (or router's IP)
2. Login with admin credentials
3. Navigate to: **VPN → L2TP** or **Network → VPN → L2TP Client**

### Basic L2TP Settings

| Field | Value |
|-------|-------|
| **Enabled** | ✅ Checked |
| **Connection Name** | `ROAMS-VPS-Abusha` |
| **Server Address** | `144.91.79.167` |
| **Username** | `abusha` |
| **Password** | `Abusha2026!` |

### IPsec Settings

| Field | Value |
|-------|-------|
| **Enable IPsec** | ✅ Checked |
| **Authentication Method** | `Pre-Shared Key (PSK)` |
| **Pre-Shared Key (PSK)** | `pjwVSecL6gobvAaMzmpuT1tyUakJUWIXecGflbB9OEM=` |
| **IKE Version** | `IKEv1` |
| **Encryption** | `AES-128` or `AES-256` |
| **Authentication** | `SHA1` or `SHA256` |
| **DH Group** | `Group 2` or `Group 14` |

### Advanced Settings

| Field | Value |
|-------|-------|
| **MTU** | `1410` |
| **Keep-alive** | ✅ Enabled |
| **NAT Traversal** | ✅ Enabled |
| **Default Route** | ❌ Disabled (only route VPN traffic) |

---

## Step 3: Save and Connect

1. Click **Save** or **Apply**
2. **Enable/Start** the L2TP connection
3. Wait 10-15 seconds for connection to establish

---

## Step 4: Verify Connection

### On Router

Expected status:
```
✅ VPN Status: Connected
✅ VPN IP Address: 10.99.0.6
✅ Server: 144.91.79.167
```

### In Router Logs

Look for successful connection messages:
```
L2TP connection established
IPsec SA established
Assigned IP: 10.99.0.6
```

### On VPS

Test connectivity from VPS:

```bash
# SSH to VPS
ssh root@144.91.79.167

# Check connected clients
ip -brief addr show | grep ppp

# Should show:
# ppp0  UNKNOWN  10.99.0.1 peer 10.99.0.2/32
# ppp1  UNKNOWN  10.99.0.1 peer 10.99.0.6/32  ← Abusha

# Ping Abusha station
ping -c 3 10.99.0.6

# Check recent connections
sudo journalctl -u xl2tpd -n 20 --no-pager | grep abusha
```

---

## Step 5: Enable LAN Access

### Add Route on VPS

```bash
# On VPS (assumes Abusha LAN is 192.168.1.0/24)
ip route add 192.168.2.0/24 via 10.99.0.6 dev ppp1

# Or if same subnet as Bombo:
# (No need - route already exists to 192.168.1.0/24)

# Test LAN access
ping -c 3 192.168.1.1  # Router
```

### On Router - Enable IP Forwarding

Same steps as Bombo station:

1. **Network → Firewall → General Settings**
   - Enable: ✅ **IP Forwarding**

2. **Add Firewall Rule** (Custom Rules):
   ```bash
   iptables -I FORWARD -s 10.99.0.0/24 -d 192.168.1.0/24 -j ACCEPT
   iptables -I FORWARD -s 192.168.1.0/24 -d 10.99.0.0/24 -j ACCEPT
   ```

---

## Expected Verification Results

### ✅ Success Indicators

**On Router:**
```
VPN Status:     Connected
VPN IP:         10.99.0.6
Server:         144.91.79.167
Traffic:        RX/TX packets flowing
Uptime:         Continuous
```

**On VPS:**
```bash
# Check active PPP interfaces
ip addr | grep ppp1
# Output: inet 10.99.0.1 peer 10.99.0.6/32 scope global ppp1

# Ping test
ping -c 3 10.99.0.6
# Output: 0% packet loss

# Check logs
sudo grep "abusha" /var/log/syslog | tail -10
# Output: Connection established, authentication successful
```

**LAN Access Test:**
```bash
# From VPS to Abusha LAN device
ping -c 3 192.168.1.X  # Replace X with actual device IP
# Output: 0% packet loss
```

---

## Troubleshooting

### Connection Refused

**Check 1: User Credentials on VPS**
```bash
# Verify user exists
sudo cat /etc/ppp/chap-secrets | grep abusha
# Should show: abusha L2TP-VPS Abusha2026! 10.99.0.6
```

**Check 2: PSK Match**
```bash
# On VPS, verify PSK
sudo cat /etc/ipsec.secrets | grep PSK
# Should contain: pjwVSecL6gobvAaMzmpuT1tyUakJUWIXecGflbB9OEM=
```

**Check 3: Username/Password**
- Username: `abusha` (lowercase, no spaces)
- Password: `Abusha2026!` (exact match, case-sensitive)

### Logs Show Errors

```bash
# On VPS - Real-time monitoring
sudo tail -f /var/log/syslog | grep -E 'xl2tpd|abusha|ppp1'

# Check for authentication failures
sudo grep "authentication failed" /var/log/syslog | grep abusha

# Check IPsec status
sudo ipsec statusall
```

---

## Network Architecture with Abusha

```
Bombo (10.99.0.2)         Abusha (10.99.0.6)
     ↓                          ↓
     └────────→ VPS Hub ←───────┘
              (10.99.0.1)
                  ↕
           OpenVPN Server
              (10.8.0.1)
                  ↕
          Admin Laptop (10.8.0.2)
```

**From Admin Laptop:**
- Access Bombo: `10.99.0.2` → `192.168.1.x`
- Access Abusha: `10.99.0.6` → `192.168.X.x`

**From Django (VPS):**
- Access Bombo OPC UA: `opc.tcp://192.168.1.X:4840` (via 10.99.0.2)
- Access Abusha OPC UA: `opc.tcp://192.168.X.X:4840` (via 10.99.0.6)

---

## Django Configuration

After successful connection, update OPC UA config:

```bash
# Django Admin
http://144.91.79.167:8000/admin/roams_opcua_mgr/opccuaclientconfig/

# Create new client for Abusha:
Station Name:   Abusha
Endpoint URL:   opc.tcp://192.168.X.X:4840  # Replace with actual OPC UA server IP
Description:    Abusha Water Station
```

---

## Quick Reference

**Abusha Credentials:**
- Username: `abusha`
- Password: `Abusha2026!`
- VPN IP: `10.99.0.6`
- Server: `144.91.79.167`
- PSK: `pjwVSecL6gobvAaMzmpuT1tyUakJUWIXecGflbB9OEM=`

**Test Commands (on VPS):**
```bash
ping 10.99.0.6                    # VPN tunnel
ping 192.168.X.1                  # Router LAN
nc -zv 192.168.X.X 4840          # OPC UA port
```
