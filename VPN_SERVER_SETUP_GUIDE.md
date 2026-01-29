# 🔒 OpenVPN Server Setup for ROAMS Multi-Station Monitoring

## Overview

This guide will help you configure your Contabo VPS as a central OpenVPN server that multiple remote stations can connect to. Each station will get a secure tunnel to access OPC UA servers behind their routers.

**What you'll achieve:**
- VPS acts as central VPN hub
- Multiple remote stations connect simultaneously
- Each station gets unique certificates
- Secure encrypted connections
- ROAMS can access all stations' OPC UA servers

**Time Required**: 45-60 minutes  
**Prerequisites**: VPS deployed (see CONTABO_VPS_DEPLOYMENT.md)

---

## Architecture Diagram

```
Remote Stations                    Contabo VPS (Central Hub)
┌─────────────────┐                ┌──────────────────────┐
│ Station A       │                │                      │
│ OpenVPN Client  │───────────────>│  OpenVPN Server      │
│ IP: 10.8.0.2   │    Tunnel      │  Port: 1194          │
│ LAN: 192.168.1.x│                │                      │
└─────────────────┘                │  ┌────────────────┐  │
                                   │  │ ROAMS Backend  │  │
┌─────────────────┐                │  │ Connects to:   │  │
│ Station B       │                │  │ - Station A    │  │
│ OpenVPN Client  │───────────────>│  │ - Station B    │  │
│ IP: 10.8.0.3   │    Tunnel      │  │ - Station C... │  │
│ LAN: 192.168.2.x│                │  └────────────────┘  │
└─────────────────┘                │                      │
                                   │  PostgreSQL + Redis  │
┌─────────────────┐                │  NGINX (Port 80/443) │
│ Station C       │                │                      │
│ OpenVPN Client  │───────────────>│  Public IP:          │
│ IP: 10.8.0.4   │    Tunnel      │  144.91.79.167       │
│ LAN: 192.168.3.x│                └──────────────────────┘
└─────────────────┘
```

---

## Part 1: Install OpenVPN Server (10 minutes)

### Step 1.1: SSH into Your VPS

```bash
# From your local machine
ssh deploy@YOUR_VPS_IP
```

### Step 1.2: Install OpenVPN and Easy-RSA

```bash
# Update package list
sudo apt update

# Install OpenVPN and Easy-RSA (certificate management)
sudo apt install openvpn easy-rsa -y

# Verify installation
openvpn --version
# Should show: OpenVPN 2.5.x or newer
```

✅ **Checkpoint 1**: OpenVPN installed successfully

---

## Part 2: Setup Certificate Authority (20 minutes)

### Step 2.1: Initialize Easy-RSA

```bash
# Create directory for certificate authority
make-cadir ~/openvpn-ca
cd ~/openvpn-ca

# Initialize the PKI (Public Key Infrastructure)
./easyrsa init-pki
```

### Step 2.2: Build Certificate Authority (CA)

```bash
# Build CA without password (easier for automation)
./easyrsa build-ca nopass

# When prompted for Common Name, enter: ROAMS-VPN-CA
# Press Enter to accept
```

You should see: `CA creation complete`

### Step 2.3: Generate Server Certificate

```bash
# Generate server certificate and key
./easyrsa build-server-full server nopass

# This creates:
# - pki/issued/server.crt (certificate)
# - pki/private/server.key (private key)
```

### Step 2.4: Generate Diffie-Hellman Parameters

```bash
# Generate DH params (takes 5-10 minutes on slower VPS)
./easyrsa gen-dh

# You'll see dots appearing as it progresses...
# DH parameters of size 2048 created
```

### Step 2.5: Generate TLS Authentication Key

```bash
# Generate additional security layer
openvpn --genkey secret ta.key
```

### Step 2.6: Copy Certificates to OpenVPN Directory

```bash
# Create server directory
sudo mkdir -p /etc/openvpn/server

# Copy all required files
sudo cp pki/ca.crt /etc/openvpn/server/
sudo cp pki/issued/server.crt /etc/openvpn/server/
sudo cp pki/private/server.key /etc/openvpn/server/
sudo cp pki/dh.pem /etc/openvpn/server/
sudo cp ta.key /etc/openvpn/server/

# Verify files are in place
ls -lh /etc/openvpn/server/
```

You should see: `ca.crt`, `server.crt`, `server.key`, `dh.pem`, `ta.key`

✅ **Checkpoint 2**: Certificates created and installed

---

## Part 3: Configure OpenVPN Server (15 minutes)

### Step 3.1: Create Server Configuration

```bash
sudo nano /etc/openvpn/server/server.conf
```

Paste this configuration:

```conf
# ROAMS OpenVPN Server Configuration
# Multi-station SCADA monitoring

# Network settings
port 1194
proto udp
dev tun

# SSL/TLS certificates
ca ca.crt
cert server.crt
key server.key
dh dh.pem
tls-auth ta.key 0

# VPN subnet (clients get IPs from this range)
server 10.8.0.0 255.255.255.0

# Maintain client IP assignments
ifconfig-pool-persist /var/log/openvpn/ipp.txt

# Push routes to clients (so they can reach VPS services)
push "route 10.8.0.0 255.255.255.0"

# Allow clients to communicate with each other (optional)
client-to-client

# Keepalive settings
# Ping every 10 seconds, assume down after 120 seconds
keepalive 10 120

# Compression (recommended for slow connections)
compress lz4-v2
push "compress lz4-v2"

# Security settings
cipher AES-256-GCM
auth SHA256
tls-version-min 1.2

# Connection options
max-clients 50
duplicate-cn  # Allow multiple connections with same cert (NOT recommended for production)

# Persist settings
persist-key
persist-tun

# Logging
status /var/log/openvpn/openvpn-status.log
log-append /var/log/openvpn/openvpn.log
verb 3

# Run as unprivileged user
user nobody
group nogroup

# Explicit exit notify
explicit-exit-notify 1
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 3.2: Create Log Directory

```bash
# Create directory for logs
sudo mkdir -p /var/log/openvpn

# Set permissions
sudo chown -R nobody:nogroup /var/log/openvpn
```

### Step 3.3: Enable IP Forwarding

```bash
# Enable IP forwarding permanently
sudo nano /etc/sysctl.conf
```

Find and uncomment (or add if not present):
```conf
net.ipv4.ip_forward=1
```

Save and apply:
```bash
sudo sysctl -p

# Verify it's enabled
cat /proc/sys/net/ipv4/ip_forward
# Should output: 1
```

### Step 3.4: Configure Firewall (UFW)

```bash
# Allow OpenVPN port
sudo ufw allow 1194/udp comment 'OpenVPN'

# Configure NAT for VPN clients
sudo nano /etc/ufw/before.rules
```

Add these lines **at the very top** (before `*filter`):

```
# START OPENVPN RULES
# NAT table rules
*nat
:POSTROUTING ACCEPT [0:0]

# Allow traffic from OpenVPN clients to reach internet/other networks
-A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE

COMMIT
# END OPENVPN RULES
```

**Note**: Replace `eth0` with your actual network interface name. Check with:
```bash
ip addr show | grep "state UP"
# Common names: eth0, ens3, enp0s3
```

Now edit UFW default forward policy:
```bash
sudo nano /etc/default/ufw
```

Change:
```
DEFAULT_FORWARD_POLICY="DROP"
```

To:
```
DEFAULT_FORWARD_POLICY="ACCEPT"
```

Apply firewall changes:
```bash
sudo ufw disable
sudo ufw enable
# Type 'y' to confirm
```

✅ **Checkpoint 3**: Server configured and firewall ready

---

## Part 4: Start OpenVPN Server (5 minutes)

### Step 4.1: Enable and Start Service

```bash
# Enable OpenVPN to start on boot
sudo systemctl enable openvpn-server@server

# Start the service
sudo systemctl start openvpn-server@server

# Check status
sudo systemctl status openvpn-server@server
```

You should see:
```
● openvpn-server@server.service - OpenVPN service for server
   Loaded: loaded
   Active: active (running)
```

### Step 4.2: Verify Server is Listening

```bash
# Check if OpenVPN is listening on port 1194
sudo ss -tulpn | grep 1194

# Should show:
# udp   UNCONN   0   0   0.0.0.0:1194   0.0.0.0:*   users:(("openvpn",pid=XXXX,fd=X))
```

### Step 4.3: Check VPN Interface Created

```bash
# Verify tun0 interface exists
ip addr show tun0

# Should show:
# tun0: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP>
#     inet 10.8.0.1/24 scope global tun0
```

✅ **Checkpoint 4**: OpenVPN server running successfully!

---

## Part 5: Generate Client Configurations (10 minutes per station)

### Step 5.1: Create Client Certificate Generation Script

```bash
cd ~/openvpn-ca

# Create helper script
nano ~/create-vpn-client.sh
```

Paste this script:

```bash
#!/bin/bash
# Script to generate OpenVPN client configuration

if [ -z "$1" ]; then
    echo "Usage: $0 <client-name>"
    echo "Example: $0 station-bombo"
    exit 1
fi

CLIENT_NAME=$1
OVPN_DIR=~/openvpn-clients
CA_DIR=~/openvpn-ca

# Generate client certificate
cd $CA_DIR
./easyrsa build-client-full $CLIENT_NAME nopass

# Create output directory
mkdir -p $OVPN_DIR/$CLIENT_NAME

# Get VPS public IP
VPS_IP=$(curl -s ifconfig.me)

# Create .ovpn file
cat > $OVPN_DIR/$CLIENT_NAME/$CLIENT_NAME.ovpn << EOF
client
dev tun
proto udp

# VPS Public IP and Port
remote $VPS_IP 1194

resolv-retry infinite
nobind
persist-key
persist-tun

remote-cert-tls server
cipher AES-256-GCM
auth SHA256
compress lz4-v2

verb 3
key-direction 1

# Inline certificates
<ca>
$(cat $CA_DIR/pki/ca.crt)
</ca>

<cert>
$(cat $CA_DIR/pki/issued/$CLIENT_NAME.crt)
</cert>

<key>
$(cat $CA_DIR/pki/private/$CLIENT_NAME.key)
</key>

<tls-auth>
$(cat $CA_DIR/ta.key)
</tls-auth>
EOF

echo "✅ Client config created: $OVPN_DIR/$CLIENT_NAME/$CLIENT_NAME.ovpn"
echo ""
echo "Download this file and import it to your router/device at the remote station."
echo "File location: $OVPN_DIR/$CLIENT_NAME/$CLIENT_NAME.ovpn"
```

Make it executable:
```bash
chmod +x ~/create-vpn-client.sh
```

### Step 5.2: Generate Configs for Your Stations

```bash
# Create config for Station A (Bombo)
~/create-vpn-client.sh station-bombo

# Create config for Station B (Nakasongola)
~/create-vpn-client.sh station-nakasongola

# Create config for Station C
~/create-vpn-client.sh station-kampala

# List all generated configs
ls -lh ~/openvpn-clients/*/
```

### Step 5.3: Download Client Configs

**From your local machine:**

```bash
# Download Station A config
scp deploy@YOUR_VPS_IP:~/openvpn-clients/station-bombo/station-bombo.ovpn .

# Download Station B config
scp deploy@YOUR_VPS_IP:~/openvpn-clients/station-nakasongola/station-nakasongola.ovpn .

# Or download all at once
scp -r deploy@YOUR_VPS_IP:~/openvpn-clients/ .
```

✅ **Checkpoint 5**: Client configurations generated

---

## Part 6: Configure Remote Stations (Varies by Router)

### Option A: MikroTik Router

1. **Upload .ovpn file** to router:
   - **Files** → Upload `station-bombo.ovpn`

2. **Import Certificate:**
   - **System** → **Certificates** → **Import**
   - Select uploaded .ovpn file

3. **Create OVPN Client Interface:**
   - **PPP** → **Interface** → **OVPN Client** → Add
   - **Name**: `VPN-to-ROAMS`
   - **Connect To**: `YOUR_VPS_IP`
   - **Port**: `1194`
   - **Mode**: `ip`
   - **User**: Leave empty (cert-based auth)
   - **Certificate**: Select imported certificate
   - **Auth**: `sha256`
   - **Cipher**: `aes-256-gcm`

4. **Enable** the interface

5. **Check connection:**
   - **PPP** → **Interface** → Should show `R` (running) status
   - Check IP address assigned (should be 10.8.0.x)

### Option B: Linux-Based Station (PC/Server)

```bash
# On the remote station Linux machine

# Install OpenVPN
sudo apt install openvpn -y

# Copy the .ovpn file to the station
# (use USB drive, SCP, or other method)

# Test connection manually
sudo openvpn --config station-bombo.ovpn

# If successful, make it auto-start:
sudo cp station-bombo.ovpn /etc/openvpn/client/station-bombo.conf
sudo systemctl enable openvpn-client@station-bombo
sudo systemctl start openvpn-client@station-bombo
```

### Option C: Windows Router/PC

1. **Download OpenVPN GUI**: [https://openvpn.net/community-downloads/](https://openvpn.net/community-downloads/)
2. **Install** OpenVPN GUI
3. **Copy** `station-bombo.ovpn` to `C:\Program Files\OpenVPN\config\`
4. **Right-click** OpenVPN GUI icon → **Connect**

### Option D: TP-Link/D-Link Business Router

1. **VPN** → **OpenVPN Client**
2. **Import** `.ovpn` file
3. **Enable** connection
4. **Save & Apply**

---

## Part 7: Verify Connections (5 minutes)

### On VPS - Check Connected Clients

```bash
# View current connections
sudo cat /var/log/openvpn/openvpn-status.log

# You should see:
# CLIENT_LIST,station-bombo,10.8.0.2,REMOTE_IP,1194,XXX_bytes,XXX_bytes,date
```

### Test Connectivity from VPS

```bash
# Ping Station A (Bombo) - should get 10.8.0.2
ping -c 3 10.8.0.2

# Ping Station B (Nakasongola) - should get 10.8.0.3
ping -c 3 10.8.0.3
```

### From Remote Station - Test VPS Connection

```bash
# On the remote station, ping VPS VPN gateway
ping 10.8.0.1

# Should get replies from VPS
```

✅ **Checkpoint 6**: Stations connected successfully!

---

## Part 8: Configure ROAMS to Access OPC UA Servers (10 minutes)

### Option 1: Access via VPN Tunnel IP (If OPC UA on Router)

If your OPC UA server runs ON the router itself:

**Django Admin** (`http://YOUR_VPS_IP/admin/`) → **OPC UA Client Configs**:

1. **Station A (Bombo)**:
   - Endpoint URL: `opc.tcp://10.8.0.2:4840`
   - Station Name: `Bombo Station`

2. **Station B (Nakasongola)**:
   - Endpoint URL: `opc.tcp://10.8.0.3:4840`
   - Station Name: `Nakasongola Station`

### Option 2: Access LAN IPs Behind Router (Recommended)

If OPC UA servers are on devices BEHIND the router (e.g., 192.168.1.100):

**On Each Remote Station Router**, add routing/NAT rule:

**MikroTik Example:**
```
# Allow VPS (10.8.0.1) to access local network
/ip firewall nat
add chain=srcnat src-address=10.8.0.0/24 dst-address=192.168.1.0/24 action=accept

# Allow forwarding
/ip firewall filter
add chain=forward src-address=10.8.0.0/24 dst-address=192.168.1.0/24 action=accept
```

**Then in ROAMS Django Admin:**

1. **Station A**:
   - Endpoint URL: `opc.tcp://192.168.1.100:4840`
   - (VPS can reach it via VPN tunnel)

### Restart ROAMS OPC UA Service

```bash
# On VPS
sudo systemctl restart roams-opcua

# Check logs
sudo tail -f /var/log/roams/opcua.log

# You should see:
# "Connected to Bombo Station"
# "Connected to Nakasongola Station"
```

---

## Part 9: Monitoring & Maintenance

### View Connected Clients

```bash
# Real-time status
sudo tail -f /var/log/openvpn/openvpn-status.log

# Summary
sudo cat /var/log/openvpn/openvpn-status.log | grep CLIENT_LIST
```

### View OpenVPN Logs

```bash
# Live logs
sudo journalctl -u openvpn-server@server -f

# Last 50 lines
sudo journalctl -u openvpn-server@server -n 50
```

### Restart OpenVPN Server

```bash
sudo systemctl restart openvpn-server@server

# Check status
sudo systemctl status openvpn-server@server
```

### Check VPN Tunnel Interface

```bash
# Show tun0 details
ip addr show tun0

# Show routing table
ip route show
```

### Create Monitoring Script

```bash
sudo nano /opt/roams/monitor-vpn.sh
```

```bash
#!/bin/bash
# Monitor VPN connections

LOG_FILE="/var/log/roams/vpn-monitor.log"
STATUS_FILE="/var/log/openvpn/openvpn-status.log"

echo "=== VPN Monitor - $(date) ===" >> $LOG_FILE

# Count connected clients
CLIENTS=$(grep "CLIENT_LIST" $STATUS_FILE | wc -l)
echo "Connected stations: $CLIENTS" >> $LOG_FILE

# List each station
grep "CLIENT_LIST" $STATUS_FILE | while read line; do
    STATION=$(echo $line | cut -d',' -f2)
    VPN_IP=$(echo $line | cut -d',' -f3)
    echo "  ✓ $STATION - $VPN_IP" >> $LOG_FILE
done

echo "" >> $LOG_FILE
```

```bash
chmod +x /opt/roams/monitor-vpn.sh

# Add to crontab (run every hour)
(crontab -l 2>/dev/null; echo "0 * * * * /opt/roams/monitor-vpn.sh") | crontab -
```

---

## Part 10: Security Best Practices

### 1. Use Unique Certificates Per Station

```bash
# NEVER reuse certificates
# Generate new cert for each station:
~/create-vpn-client.sh station-new
```

### 2. Revoke Compromised Certificates

```bash
cd ~/openvpn-ca

# Revoke a client
./easyrsa revoke station-old

# Generate CRL (Certificate Revocation List)
./easyrsa gen-crl

# Copy to OpenVPN directory
sudo cp pki/crl.pem /etc/openvpn/server/

# Add to server.conf
sudo nano /etc/openvpn/server/server.conf
# Add line: crl-verify crl.pem

# Restart server
sudo systemctl restart openvpn-server@server
```

### 3. Enable TLS Authentication

Already configured in the setup with `tls-auth ta.key 0`

### 4. Disable `duplicate-cn` for Production

```bash
sudo nano /etc/openvpn/server/server.conf

# Comment out or remove:
# duplicate-cn

# This prevents multiple connections with same certificate
```

### 5. Monitor Failed Connection Attempts

```bash
# Watch for authentication failures
sudo grep "TLS Error" /var/log/openvpn/openvpn.log

# Set up alert for failed attempts (optional)
sudo apt install fail2ban -y
```

---

## Troubleshooting

### Issue: Client Can't Connect

**Check on VPS:**
```bash
# Is OpenVPN running?
sudo systemctl status openvpn-server@server

# Is port 1194 open?
sudo ufw status | grep 1194

# Check logs
sudo tail -f /var/log/openvpn/openvpn.log
```

**Check on Remote Station:**
```bash
# Can it reach VPS?
ping YOUR_VPS_IP

# Is port 1194 reachable?
nc -zvu YOUR_VPS_IP 1194
```

### Issue: Connected but Can't Ping

**Check routing:**
```bash
# On VPS
ip route show

# On remote station
ip route show
```

**Check IP forwarding:**
```bash
cat /proc/sys/net/ipv4/ip_forward
# Should be: 1
```

### Issue: Can Ping VPS but Not Reach OPC UA

**Check firewall on remote station:**
```bash
# Allow VPN subnet to access LAN
# (Configuration varies by router)
```

**Test OPC UA connectivity:**
```bash
# From VPS
nc -zv 10.8.0.2 4840  # Test port 4840 on Station A
```

### Issue: Certificate Errors

**Regenerate certificates:**
```bash
cd ~/openvpn-ca

# Remove old cert
./easyrsa revoke station-bombo

# Generate new one
~/create-vpn-client.sh station-bombo-new
```

---

## Quick Reference Commands

```bash
# Start/Stop/Restart OpenVPN
sudo systemctl start openvpn-server@server
sudo systemctl stop openvpn-server@server
sudo systemctl restart openvpn-server@server

# View connected clients
sudo cat /var/log/openvpn/openvpn-status.log | grep CLIENT_LIST

# Generate new client
~/create-vpn-client.sh station-name

# View logs
sudo journalctl -u openvpn-server@server -f

# Check VPN interface
ip addr show tun0

# Test connectivity to station
ping 10.8.0.2  # Station A
ping 10.8.0.3  # Station B
```

---

## Network Diagram - Detailed

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ Port 1194/UDP
                        │
        ┌───────────────▼────────────────┐
        │   Contabo VPS (144.91.79.167)  │
        │                                 │
        │  ┌──────────────────────────┐  │
        │  │  OpenVPN Server          │  │
        │  │  - Port: 1194            │  │
        │  │  - Network: 10.8.0.0/24  │  │
        │  │  - Gateway: 10.8.0.1     │  │
        │  └──────────────────────────┘  │
        │               │                 │
        │  ┌────────────▼──────────────┐ │
        │  │  ROAMS Backend            │ │
        │  │  - Reads OPC UA data via  │ │
        │  │    VPN tunnel IPs         │ │
        │  │  - 10.8.0.2 (Station A)   │ │
        │  │  - 10.8.0.3 (Station B)   │ │
        │  └───────────────────────────┘ │
        │                                 │
        │  PostgreSQL | Redis | NGINX     │
        └─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼─────┐   ┌────▼─────┐   ┌────▼─────┐
   │ Station A│   │ Station B│   │ Station C│
   │ OpenVPN  │   │ OpenVPN  │   │ OpenVPN  │
   │ Client   │   │ Client   │   │ Client   │
   │ 10.8.0.2 │   │ 10.8.0.3 │   │ 10.8.0.4 │
   └────┬─────┘   └────┬─────┘   └────┬─────┘
        │              │              │
   ┌────▼─────┐   ┌────▼─────┐   ┌────▼─────┐
   │ OPC UA   │   │ OPC UA   │   │ OPC UA   │
   │ Server   │   │ Server   │   │ Server   │
   │:4840     │   │:4840     │   │:4840     │
   └──────────┘   └──────────┘   └──────────┘
```

---

## Summary Checklist

✅ **Part 1**: OpenVPN and Easy-RSA installed
✅ **Part 2**: Certificate Authority created, certificates generated
✅ **Part 3**: Server configured with proper security settings
✅ **Part 4**: OpenVPN server running and listening
✅ **Part 5**: Client configurations generated for all stations
✅ **Part 6**: Remote stations configured and connected
✅ **Part 7**: Connections verified from both sides
✅ **Part 8**: ROAMS configured to access OPC UA via VPN
✅ **Part 9**: Monitoring tools in place
✅ **Part 10**: Security hardened

---

## Next Steps

1. **Test each station** - Verify OPC UA connectivity from ROAMS
2. **Configure routing** - Ensure VPS can reach station LANs if needed
3. **Setup monitoring** - Run the VPN monitor script
4. **Document IPs** - Keep track of which station has which VPN IP
5. **Create backup** - Save all certificates and configs

**Important Files to Backup:**
```bash
# On VPS
~/openvpn-ca/pki/         # All certificates
~/openvpn-clients/         # Client configs
/etc/openvpn/server/       # Server configs
```

---

## Support

**Common Issues:**
- Port 1194 blocked → Check VPS firewall: `sudo ufw status`
- Certificate errors → Regenerate client config
- Can't reach OPC UA → Check station router firewall
- Connection drops → Check keepalive settings in config

**Logs to Check:**
- `/var/log/openvpn/openvpn.log` - Server logs
- `/var/log/openvpn/openvpn-status.log` - Connected clients
- `sudo journalctl -u openvpn-server@server` - Systemd logs

**Estimated Setup Time**: 45-60 minutes  
**Maintenance**: Monthly certificate backups, weekly connection checks

🎉 **Congratulations! Your multi-station OpenVPN hub is ready!**
