#!/bin/bash
# L2TP/IPsec VPN Server Setup for ROAMS Stations
# Run on VPS: ssh root@144.91.79.167
# Then: bash ~/setup_l2tp_ipsec.sh

set -e

echo "========================================="
echo "L2TP/IPsec VPN Server Installation"
echo "========================================="

# Install packages
echo "Installing L2TP/IPsec packages..."
apt update
apt install -y xl2tpd strongswan strongswan-pki libcharon-extra-plugins \
    libcharon-extauth-plugins libstrongswan-extra-plugins

# Generate PSK (Pre-Shared Key)
PSK=$(openssl rand -base64 32)
echo "Generated PSK: $PSK"

# Configure IPsec (strongswan)
echo "Configuring IPsec..."
cat > /etc/ipsec.conf <<'EOF'
# IPsec configuration for L2TP/IPsec VPN
config setup
    charondebug="ike 2, knl 2, cfg 2, net 2, esp 2, dmn 2, mgr 2"
    uniqueids=never
    strictcrlpolicy=no

conn L2TP-PSK
    type=transport
    authby=secret
    pfs=no
    rekey=no
    keyingtries=3
    left=%any
    leftprotoport=17/1701
    right=%any
    rightprotoport=17/%any
    auto=add
    dpddelay=10
    dpdtimeout=90
    dpdaction=clear
EOF

# Configure IPsec secrets
cat > /etc/ipsec.secrets <<EOF
# IPsec Pre-Shared Key
: PSK "$PSK"
EOF

chmod 600 /etc/ipsec.secrets

# Configure xl2tpd
echo "Configuring xl2tpd..."
cat > /etc/xl2tpd/xl2tpd.conf <<'EOF'
[global]
port = 1701
auth file = /etc/ppp/chap-secrets
debug avp = yes
debug network = yes
debug state = yes
debug tunnel = yes

[lns default]
ip range = 10.99.0.10-10.99.0.250
local ip = 10.99.0.1
require chap = yes
refuse pap = yes
require authentication = yes
name = L2TP-VPS
pppoptfile = /etc/ppp/options.xl2tpd
length bit = yes
EOF

# Configure PPP options
cat > /etc/ppp/options.xl2tpd <<'EOF'
ipcp-accept-local
ipcp-accept-remote
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
ms-dns 8.8.8.8
ms-dns 8.8.4.4
EOF

# Create VPN users (stations)
echo "Creating VPN users for stations..."
cat > /etc/ppp/chap-secrets <<'EOF'
# Secrets for authentication using CHAP
# client    server      secret          IP addresses
bombo       *           Bombo2026!      10.99.0.2
nakasongola *           Nakasongola2026! 10.99.0.3
lutete      *           Lutete2026!     10.99.0.4
kampala     *           Kampala2026!    10.99.0.5
EOF

chmod 600 /etc/ppp/chap-secrets

# Enable IP forwarding (already enabled for OpenVPN, but ensure it's set)
echo "Enabling IP forwarding..."
sysctl -w net.ipv4.ip_forward=1
sysctl -w net.ipv4.conf.all.accept_redirects=0
sysctl -w net.ipv4.conf.all.send_redirects=0
sysctl -w net.ipv4.conf.default.rp_filter=0
sysctl -w net.ipv4.conf.default.accept_source_route=0
sysctl -w net.ipv4.conf.default.send_redirects=0
sysctl -w net.ipv4.icmp_ignore_bogus_error_responses=1

# Make permanent
cat >> /etc/sysctl.conf <<'EOF'

# L2TP/IPsec VPN settings
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.rp_filter = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.icmp_ignore_bogus_error_responses = 1
EOF

# Configure firewall
echo "Configuring firewall..."
ufw allow 500/udp comment 'IPsec IKE'
ufw allow 4500/udp comment 'IPsec NAT-T'
ufw allow 1701/udp comment 'L2TP'

# NAT rules for L2TP subnet (if not already added)
if ! grep -q "10.99.0.0/24" /etc/ufw/before.rules; then
    # Backup before.rules
    cp /etc/ufw/before.rules /etc/ufw/before.rules.backup.l2tp
    
    # Add NAT rules at the top of the file
    sed -i '1i\# NAT table rules for L2TP VPN\n*nat\n:POSTROUTING ACCEPT [0:0]\n-A POSTROUTING -s 10.99.0.0/24 -o eth0 -j MASQUERADE\nCOMMIT\n' /etc/ufw/before.rules
fi

# Reload firewall
ufw reload

# Start and enable services
echo "Starting services..."
systemctl restart strongswan-starter
systemctl enable strongswan-starter
systemctl restart xl2tpd
systemctl enable xl2tpd

# Wait for services to start
sleep 3

echo ""
echo "========================================="
echo "✅ L2TP/IPsec VPN Server Setup Complete!"
echo "========================================="
echo ""
echo "Server Details:"
echo "  VPS IP: 144.91.79.167"
echo "  L2TP/IPsec Subnet: 10.99.0.0/24"
echo "  VPN Server IP: 10.99.0.1"
echo ""
echo "Pre-Shared Key (PSK):"
echo "  $PSK"
echo ""
echo "Station Credentials:"
echo "  Bombo:       Username: bombo       Password: Bombo2026!       IP: 10.99.0.2"
echo "  Nakasongola: Username: nakasongola Password: Nakasongola2026! IP: 10.99.0.3"
echo "  Lutete:      Username: lutete      Password: Lutete2026!      IP: 10.99.0.4"
echo "  Kampala:     Username: kampala     Password: Kampala2026!     IP: 10.99.0.5"
echo ""
echo "Service Status:"
systemctl status strongswan-starter --no-pager -l
echo ""
systemctl status xl2tpd --no-pager -l
echo ""
echo "SAVE THE PSK ABOVE - You'll need it for router configuration!"
echo "========================================="

# Save PSK to file
echo "$PSK" > /root/l2tp_psk.txt
chmod 600 /root/l2tp_psk.txt
echo "PSK saved to: /root/l2tp_psk.txt"
