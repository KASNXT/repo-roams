# QX310 Router L2TP/IPsec VPN Configuration Guide

## Overview
This guide configures your Qixiang QX310 router to connect to the VPS using L2TP/IPsec VPN, which is much simpler than OpenVPN for industrial routers.

---

## Prerequisites
- VPS L2TP/IPsec server running (Port UDP 500, 4500, 1701)
- PSK (Pre-Shared Key) from VPS setup
- Station credentials (username/password)

---

## Step 1: Access QX310 Web Interface

1. Connect to router: `http://192.168.1.1` (or router's IP)
2. Login with admin credentials
3. Navigate to **VPN → L2TP** or **Network → VPN → L2TP Client**

---

## Step 2: L2TP/IPsec Configuration

### Basic Settings

| Field | Value | Notes |
|-------|-------|-------|
| **Enabled** | ✅ Checked | Enable the VPN connection |
| **Connection Name** | `ROAMS-VPS` | Any descriptive name |
| **Server Address** | `144.91.79.167` | VPS public IP |
| **Username** | `bombo` | Station-specific (see table below) |
| **Password** | `Bombo2026!` | Station-specific password |

### IPsec Settings

| Field | Value | Notes |
|-------|-------|-------|
| **Enable IPsec** | ✅ Checked | Required for security |
| **Authentication Method** | `Pre-Shared Key (PSK)` | NOT certificate |
| **Pre-Shared Key (PSK)** | `[FROM VPS SETUP]` | Get from `/root/l2tp_psk.txt` |
| **IKE Version** | `IKEv1` | QX310 usually supports v1 |
| **Encryption** | `AES-128` or `AES-256` | Router default is fine |
| **Authentication** | `SHA1` or `SHA256` | Router default is fine |
| **DH Group** | `Group 2` or `Group 14` | Router default is fine |

### Advanced Settings (if available)

| Field | Value | Notes |
|-------|-------|-------|
| **MTU** | `1410` | Prevents fragmentation |
| **Keep-alive** | ✅ Enabled | Maintains connection |
| **NAT Traversal** | ✅ Enabled | Required if behind NAT |
| **Default Route** | ❌ Disabled | Only route VPN traffic |

---

## Station Credentials

Configure each station with its specific credentials:

| Station | Username | Password | VPN IP Assigned |
|---------|----------|----------|-----------------|
| **Bombo** | `bombo` | `Bombo2026!` | `10.99.0.2` |
| **Nakasongola** | `nakasongola` | `Nakasongola2026!` | `10.99.0.3` |
| **Lutete** | `lutete` | `Lutete2026!` | `10.99.0.4` |
| **Kampala** | `kampala` | `Kampala2026!` | `10.99.0.5` |
| **Abusha** | `abusha` | `Abusha2026!` | `10.99.0.6` |

---

## Step 3: Save and Connect

1. **Save** the configuration
2. **Apply** changes
3. **Start/Enable** the L2TP connection
4. Wait 10-15 seconds for connection to establish

---

## Step 4: Verify Connection

### On Router

Check router status page for:
- ✅ **VPN Status**: Connected
- ✅ **VPN IP**: `10.99.0.x` (e.g., 10.99.0.2 for Bombo)
- ✅ **Server**: 144.91.79.167

### System Logs

Look for entries like:
```
L2TP connection established
IPsec SA established
Assigned IP: 10.99.0.2
```

### On VPS

SSH to VPS and check:
```bash
# Check connected clients
sudo cat /var/log/syslog | grep xl2tpd | tail -20

# Check IPsec status
sudo ipsec statusall

# Ping the station
ping 10.99.0.2
```

---

## Step 5: Enable LAN Access Through VPN

**CRITICAL**: By default, the router blocks traffic between VPN and LAN interfaces. You must enable forwarding.

### Method A: Web Interface (Recommended)

1. **Access Router**: `http://192.168.1.1`

2. **Navigate to Firewall Settings**:
   - Go to: **Network → Firewall → General Settings**
   - OR: **System → Firewall → Zones**
   - OR: **Advanced → Firewall**

3. **Enable IP Forwarding**:
   - Find: **IP Forwarding** or **Enable Routing**
   - Set to: ✅ **Enabled**
   - Click **Save**

4. **Configure Zone Forwarding** (if available):
   - Source Zone: `VPN` or `WAN`
   - Destination Zone: `LAN`
   - Policy: **ACCEPT** or **Allow**
   - Click **Add** and **Save**

5. **Add Firewall Rule** (Network → Firewall → Custom Rules):
   ```bash
   # Allow VPN to LAN
   iptables -I FORWARD -s 10.99.0.0/24 -d 192.168.1.0/24 -j ACCEPT
   iptables -I FORWARD -s 192.168.1.0/24 -d 10.99.0.0/24 -j ACCEPT
   ```
   Click **Apply**

### Method B: Router CLI (via SSH/Telnet)

If you have SSH access to the router:

```bash
# SSH to router
ssh admin@192.168.1.1

# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# Check current iptables rules
iptables -L FORWARD -n -v

# Add forwarding rules
iptables -I FORWARD -i ppp+ -o br-lan -j ACCEPT
iptables -I FORWARD -i br-lan -o ppp+ -j ACCEPT

# OR specific subnets
iptables -I FORWARD -s 10.99.0.0/24 -d 192.168.1.0/24 -j ACCEPT
iptables -I FORWARD -s 192.168.1.0/24 -d 10.99.0.0/24 -j ACCEPT

# Save rules (varies by router firmware)
# For OpenWrt/LEDE:
/etc/init.d/firewall restart

# For custom firmware:
iptables-save > /etc/iptables.rules
```

### Verify LAN Access from VPS

After configuring the router, test from VPS:

```bash
# On VPS
ssh root@144.91.79.167

# Add route to remote LAN
ip route add 192.168.1.0/24 via 10.99.0.2 dev ppp0

# Test connectivity
ping -c 3 192.168.1.1        # Router LAN IP
ping -c 3 192.168.1.100      # Any device on LAN

# Make route permanent
echo "ip route add 192.168.1.0/24 via 10.99.0.2 dev ppp0 || true" >> /etc/rc.local
chmod +x /etc/rc.local
```

### Common QX310 Locations for Firewall Settings

| Firmware Type | Location |
|---------------|----------|
| **Standard** | Network → Firewall → General Settings |
| **OpenWrt** | Network → Firewall → Zones |
| **Custom UI** | System → Security → Firewall |
| **Advanced** | Advanced → Firewall → Custom Rules |

### Verify Forwarding is Enabled

```bash
# On router (via SSH)
cat /proc/sys/net/ipv4/ip_forward
# Should return: 1

# Check forwarding rules
iptables -L FORWARD -n
# Should show ACCEPT rules for 10.99.0.0/24 ↔ 192.168.1.0/24
```

---

## Troubleshooting

### Connection Fails

**Check 1: PSK Mismatch**
- Verify PSK on router matches `/root/l2tp_psk.txt` on VPS
- PSK is case-sensitive

**Check 2: Credentials**
- Username: lowercase (e.g., `bombo` not `Bombo`)
- Password: exact match (e.g., `Bombo2026!`)

**Check 3: Firewall**
```bash
# On VPS
sudo ufw status | grep -E '500|4500|1701'
# Should show: 500/udp, 4500/udp, 1701/udp ALLOW
```

**Check 4: Services Running**
```bash
# On VPS
sudo systemctl status strongswan-starter
sudo systemctl status xl2tpd
# Both should be "active (running)"
```

### Connected but No Traffic

**Issue**: VPN connected but can't ping/access services

**Solution**: Check routing on router
- Ensure router routes 10.8.0.0/24 (OpenVPN subnet) through VPN
- Ensure router routes 10.99.0.0/24 (L2TP subnet) through VPN

---

## QX310-Specific Notes

### If No Dedicated L2TP Menu

Some QX310 firmware versions have L2TP under:
- **VPN → PPTP/L2TP** (combined menu)
- **Network → Dialup → L2TP**
- **WAN → VPN → L2TP Client**

### If PSK Field is Limited

Some routers have PSK length limits (16-32 characters). If your PSK is too long:
1. SSH to VPS: `ssh root@144.91.79.167`
2. Generate shorter PSK: `openssl rand -base64 24`
3. Update `/etc/ipsec.secrets` with new PSK
4. Restart: `sudo systemctl restart strongswan-starter`

---

## Network Architecture After Setup

```
Bombo Station (QX310)           VPS Hub                      Admin Laptop
┌─────────────────┐             ┌──────────────┐             ┌──────────────┐
│ L2TP Client     │━━━━━━━━━━━>│ L2TP Server  │             │ OpenVPN      │
│ 10.99.0.2       │  IPsec      │ 10.99.0.1    │<━━━━━━━━━━━│ Client       │
│                 │  Encrypted  │              │  TLS        │ 10.8.0.2     │
│ OPC UA :4840    │             │ OpenVPN      │  Encrypted  └──────────────┘
└─────────────────┘             │ 10.8.0.1     │
                                │              │
                                │ Django       │
                                │ Backend      │
                                └──────────────┘
```

**From Admin Laptop (10.8.0.2):**
- Access Bombo OPC UA: `opc.tcp://10.99.0.2:4840`
- Access Django: `http://10.8.0.1:8000` or `http://144.91.79.167:8000`

**From Django (VPS):**
- Access Bombo: `opc.tcp://10.99.0.2:4840`
- Stable permanent connection 24/7

---

## Next Steps After Connection

1. **Update Django OPC UA Config**:
   ```bash
   # In Django admin
   OPC UA Client Config for Bombo:
   endpoint_url = opc.tcp://10.99.0.2:4840
   ```

2. **Test OPC UA Connection**:
   ```bash
   # On VPS
   cd ~/roams_backend
   source venv_new/bin/activate
   python diagnose_opcua.py
   ```

3. **Connect Admin Laptop**:
   - Import `/mnt/d/admin-laptop.ovpn` to OpenVPN client
   - Connect to access both 10.8.0.x and 10.99.0.x networks

---

## Security Notes

- ✅ **IPsec Encryption**: All traffic encrypted with AES
- ✅ **Authentication**: PSK + username/password (2-factor)
- ✅ **Firewall**: Only VPN ports open on VPS
- ✅ **Isolated Subnets**: OpenVPN (10.8.0.0/24) and L2TP (10.99.0.0/24) are separate
- ✅ **Static IPs**: Each station gets fixed IP for reliable OPC UA connections

---

## Support

**View VPS Logs**:
```bash
sudo tail -f /var/log/syslog | grep -E 'xl2tpd|charon'
```

**Restart VPN Services**:
```bash
sudo systemctl restart strongswan-starter xl2tpd
```

**Check Firewall**:
```bash
sudo ufw status verbose
```
