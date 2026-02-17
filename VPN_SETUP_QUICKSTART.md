# 🚀 Quick Start: VPN Setup on Your VPS

## Step 1: Connect to Your VPS

```bash
# From your local machine (Windows with WSL)
ssh YOUR_USERNAME@YOUR_VPS_IP

# Example:
# ssh deploy@144.91.79.167
# or
# ssh root@144.91.79.167
```

## Step 2: Download and Run Setup Script

Once connected to your VPS, run these commands:

```bash
# Create scripts directory
mkdir -p /opt/roams/scripts
cd /opt/roams/scripts

# Download the setup script (copy from your local machine)
# Or create it manually:
nano setup_l2tp.sh
```

Copy and paste the L2TP setup commands (simplified version below), then:

```bash
# Make executable
chmod +x setup_l2tp.sh

# Run the script
sudo ./setup_l2tp.sh
```

## Step 3: Simplified Manual Setup (If You Prefer)

### A. Install Packages

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install L2TP/IPsec packages
sudo apt install -y strongswan strongswan-pki libstrongswan-extra-plugins xl2tpd
```

### B. Configure IPsec

```bash
# Backup original config
sudo cp /etc/ipsec.conf /etc/ipsec.conf.backup

# Edit IPsec config
sudo nano /etc/ipsec.conf
```

Delete everything and paste:

```conf
config setup
    charondebug="ike 2, knl 2, cfg 2"
    uniqueids=no

conn %default
    ikelifetime=60m
    keylife=20m
    rekeymargin=3m
    keyingtries=1
    keyexchange=ikev1
    authby=secret
    ike=aes256-sha1-modp1024!
    esp=aes256-sha1!

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

Save: `Ctrl+X`, `Y`, `Enter`

### C. Configure PSK (Pre-Shared Key)

```bash
# Generate strong password
openssl rand -base64 32

# Example output: xK9mP2nQ7vL4sR8tY6uI1oE3wA5zC0bN...
# SAVE THIS PASSWORD!

# Edit secrets file
sudo nano /etc/ipsec.secrets
```

Add (replace YOUR_VPS_IP and YOUR_PSK):

```
YOUR_VPS_IP %any : PSK "YOUR_STRONG_PSK_HERE"
```

Example:
```
144.91.79.167 %any : PSK "xK9mP2nQ7vL4sR8tY6uI1oE3wA5zC0bN"
```

Save and set permissions:
```bash
sudo chmod 600 /etc/ipsec.secrets
```

### D. Configure L2TP (xl2tpd)

```bash
# Backup original config
sudo cp /etc/xl2tpd/xl2tpd.conf /etc/xl2tpd/xl2tpd.conf.backup

# Edit config
sudo nano /etc/xl2tpd/xl2tpd.conf
```

Delete everything and paste:

```conf
[global]
port = 1701
auth file = /etc/ppp/chap-secrets

[lns default]
ip range = 10.99.0.2-10.99.0.254
local ip = 10.99.0.1
require chap = yes
refuse pap = yes
require authentication = yes
name = L2TP-VPN
pppoptfile = /etc/ppp/options.xl2tpd
length bit = yes
```

Save: `Ctrl+X`, `Y`, `Enter`

### E. Configure PPP Options

```bash
sudo nano /etc/ppp/options.xl2tpd
```

Paste:

```conf
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

Save: `Ctrl+X`, `Y`, `Enter`

### F. Create VPN Users

```bash
sudo nano /etc/ppp/chap-secrets
```

Add users (format: username server password IP):

```
# username    server    password              IP
station_a     *         StationA_Pass123!     10.99.0.2
station_b     *         StationB_Pass456!     10.99.0.3
admin         *         Admin_VPN_Pass789!    10.99.0.10
```

**Security tip**: Use strong passwords (16+ characters, mixed case, numbers, symbols)

Save and set permissions:
```bash
sudo chmod 600 /etc/ppp/chap-secrets
```

### G. Enable IP Forwarding

```bash
sudo nano /etc/sysctl.conf
```

Add at the end:

```conf
net.ipv4.ip_forward = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
```

Apply changes:
```bash
sudo sysctl -p
```

### H. Configure Firewall

```bash
# Allow VPN ports
sudo ufw allow 500/udp
sudo ufw allow 4500/udp
sudo ufw allow 1701/udp

# Allow SSH (if not already)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (for ROAMS)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### I. Configure NAT

```bash
# Backup firewall rules
sudo cp /etc/ufw/before.rules /etc/ufw/before.rules.backup

# Edit rules
sudo nano /etc/ufw/before.rules
```

Add at the TOP (before `*filter`):

```conf
# NAT table rules for L2TP VPN
*nat
:POSTROUTING ACCEPT [0:0]

# Replace eth0 with your interface (check with: ip a)
-A POSTROUTING -s 10.99.0.0/24 -o eth0 -j MASQUERADE

COMMIT

# Mangle table for MTU
*mangle
-A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
COMMIT
```

**Important**: Replace `eth0` with your actual interface. Check with:
```bash
ip route | grep default
# Look for the interface name (e.g., eth0, ens3, enp0s3)
```

Save and reload:
```bash
sudo ufw --force enable
sudo ufw reload
```

### J. Start Services

```bash
# Restart IPsec
sudo systemctl restart strongswan-starter
sudo systemctl enable strongswan-starter

# Restart L2TP
sudo systemctl restart xl2tpd
sudo systemctl enable xl2tpd

# Check status
sudo systemctl status strongswan-starter
sudo systemctl status xl2tpd
```

Both should show: `Active: active (running)`

### K. Verify Installation

```bash
# Check if ports are listening
sudo netstat -tulpn | grep -E '500|4500|1701'

# Should see:
# udp   0.0.0.0:500
# udp   0.0.0.0:4500
# udp   0.0.0.0:1701

# Check IPsec status
sudo ipsec status

# View logs
sudo tail -f /var/log/syslog | grep -E 'xl2tpd|charon'
```

## Step 4: Test Connection from Client

### Windows 10/11:

1. **Settings** → **Network & Internet** → **VPN** → **Add VPN**
2. Fill in:
   - VPN Provider: `Windows (built-in)`
   - Connection name: `ROAMS VPN`
   - Server: `YOUR_VPS_IP`
   - VPN type: `L2TP/IPsec with pre-shared key`
   - Pre-shared key: `YOUR_PSK`
   - Username: `station_a`
   - Password: `StationA_Pass123!`
3. **Save**
4. Click connection → **Connect**
5. Test:
   ```cmd
   ipconfig
   # Look for PPP adapter with IP 10.99.0.x
   
   ping 10.99.0.1
   # Should reply
   ```

### Android:

1. **Settings** → **Network & Internet** → **VPN** → **+**
2. Fill in:
   - Name: `ROAMS VPN`
   - Type: `L2TP/IPsec PSK`
   - Server: `YOUR_VPS_IP`
   - IPsec pre-shared key: `YOUR_PSK`
   - Username: `station_a`
   - Password: `StationA_Pass123!`
3. **Save** → **Connect**

### iOS:

1. **Settings** → **General** → **VPN** → **Add VPN Configuration**
2. Type: `L2TP`
3. Fill in server, username, password, secret (PSK)
4. **Done** → Toggle **ON**

## Step 5: Troubleshooting

### Connection Fails:

```bash
# Check logs in real-time
sudo tail -f /var/log/syslog | grep -E 'xl2tpd|pluto|charon'

# Check services
sudo systemctl status strongswan-starter xl2tpd

# Restart services
sudo systemctl restart strongswan-starter xl2tpd

# Check firewall
sudo ufw status verbose
```

### Can't Reach Internet from VPN:

```bash
# Check IP forwarding
sysctl net.ipv4.ip_forward
# Should be 1

# Check NAT rules
sudo iptables -t nat -L POSTROUTING -v
# Should see MASQUERADE rule
```

### Windows Error 789:

On Windows client:
1. Press `Win+R` → type `regedit`
2. Navigate to: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\PolicyAgent`
3. Create new `DWORD (32-bit)`: `AssumeUDPEncapsulationContextOnSendRule`
4. Set value: `2`
5. Reboot Windows

## Step 6: Save Your Configuration

Create a backup of your settings:

```bash
# On VPS
cat > ~/vpn_config.txt << EOF
ROAMS L2TP/IPsec VPN Configuration
Generated: $(date)

Server IP: $(curl -s ifconfig.me)
VPN Type: L2TP/IPsec PSK
VPN Network: 10.99.0.0/24

PSK: [YOUR_PSK_HERE]

Users:
$(sudo cat /etc/ppp/chap-secrets | grep -v "^#" | grep -v "^$")
EOF

# View it
cat ~/vpn_config.txt
```

## Next Steps

Once L2TP is working:
1. ✅ Test connection from at least one client
2. ✅ Verify you get IP 10.99.0.x
3. ✅ Test ping to 10.99.0.1
4. Then set up OpenVPN for admin access
5. Configure ROAMS to use VPN IPs for OPC UA endpoints

## Quick Reference

**Server Info:**
- Public IP: YOUR_VPS_IP
- VPN Server IP: 10.99.0.1
- Client IP Range: 10.99.0.2 - 10.99.0.254

**Important Files:**
- IPsec config: `/etc/ipsec.conf`
- IPsec secrets: `/etc/ipsec.secrets`
- L2TP config: `/etc/xl2tpd/xl2tpd.conf`
- VPN users: `/etc/ppp/chap-secrets`
- PPP options: `/etc/ppp/options.xl2tpd`

**Useful Commands:**
```bash
# Status
sudo systemctl status strongswan-starter xl2tpd
sudo ipsec status

# Logs
sudo tail -f /var/log/syslog | grep -E 'xl2tpd|charon'

# Restart
sudo systemctl restart strongswan-starter xl2tpd

# Active connections
sudo ipsec statusall
```

---

**Ready?** Connect to your VPS and start with Step 3A! 🚀
