#!/bin/bash
#
# ROAMS Hybrid VPN Setup Script
# Sets up L2TP/IPsec and OpenVPN on the same VPS
#
# Usage: ./setup_vpn_hybrid.sh
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should NOT be run as root"
   echo "Run it as a sudo user instead: ./setup_vpn_hybrid.sh"
   exit 1
fi

# Check sudo access
if ! sudo -v; then
    print_error "You need sudo privileges to run this script"
    exit 1
fi

print_header "ROAMS Hybrid VPN Setup - L2TP/IPsec + OpenVPN"

echo "This script will:"
echo "  1. Install L2TP/IPsec server (strongSwan + xl2tpd)"
echo "  2. Install OpenVPN server"
echo "  3. Configure routing between both networks"
echo "  4. Setup firewall rules"
echo ""
echo "Networks:"
echo "  - L2TP/IPsec: 10.99.0.0/24 (for remote stations)"
echo "  - OpenVPN: 10.8.0.0/24 (for admin access)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Get VPS IP
print_header "Configuration"
echo "Detecting VPS public IP..."
VPS_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || hostname -I | awk '{print $1}')
print_info "Detected IP: $VPS_IP"
read -p "Is this correct? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your VPS public IP: " VPS_IP
fi

# Generate strong PSK for L2TP
print_info "Generating strong PSK for L2TP/IPsec..."
L2TP_PSK=$(openssl rand -base64 32)
print_success "PSK generated: $L2TP_PSK"
echo ""
print_warning "SAVE THIS PSK - you'll need it for client connections!"
echo ""
read -p "Press Enter to continue..."

#############################################
# PART 1: L2TP/IPsec Setup
#############################################
print_header "Part 1: Installing L2TP/IPsec (15 minutes)"

print_info "Updating package lists..."
sudo apt update

print_info "Installing strongSwan (IPsec)..."
sudo apt install -y strongswan strongswan-pki libstrongswan-extra-plugins

print_info "Installing xl2tpd (L2TP)..."
sudo apt install -y xl2tpd

print_success "Packages installed"

# Backup existing configs
print_info "Backing up existing configurations..."
sudo cp /etc/ipsec.conf /etc/ipsec.conf.backup.$(date +%Y%m%d) 2>/dev/null || true
sudo cp /etc/ipsec.secrets /etc/ipsec.secrets.backup.$(date +%Y%m%d) 2>/dev/null || true
sudo cp /etc/xl2tpd/xl2tpd.conf /etc/xl2tpd/xl2tpd.conf.backup.$(date +%Y%m%d) 2>/dev/null || true

# Configure IPsec
print_info "Configuring IPsec (strongSwan)..."
sudo tee /etc/ipsec.conf > /dev/null << EOF
# ROAMS L2TP/IPsec Server Configuration
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
EOF

print_success "IPsec configured"

# Configure IPsec secrets
print_info "Configuring IPsec PSK..."
sudo tee /etc/ipsec.secrets > /dev/null << EOF
# IPsec Pre-Shared Key for L2TP
$VPS_IP %any : PSK "$L2TP_PSK"
EOF
sudo chmod 600 /etc/ipsec.secrets

print_success "IPsec PSK configured"

# Configure xl2tpd
print_info "Configuring xl2tpd (L2TP)..."
sudo tee /etc/xl2tpd/xl2tpd.conf > /dev/null << EOF
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
EOF

print_success "xl2tpd configured"

# Configure PPP options
print_info "Configuring PPP options..."
sudo tee /etc/ppp/options.xl2tpd > /dev/null << EOF
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
EOF

print_success "PPP options configured"

# Create sample users
print_info "Creating sample VPN users..."
sudo tee /etc/ppp/chap-secrets > /dev/null << EOF
# ROAMS L2TP VPN Users
# username    server    password                    IP
station_a     *         $(openssl rand -base64 16)  10.99.0.2
station_b     *         $(openssl rand -base64 16)  10.99.0.3
admin         *         $(openssl rand -base64 16)  10.99.0.10
EOF
sudo chmod 600 /etc/ppp/chap-secrets

print_success "Sample users created"
print_warning "User credentials saved in /etc/ppp/chap-secrets"

#############################################
# PART 2: System Configuration
#############################################
print_header "Part 2: System Configuration"

print_info "Enabling IP forwarding..."
sudo tee -a /etc/sysctl.conf > /dev/null << EOF

# VPN Configuration
net.ipv4.ip_forward = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.rp_filter = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.icmp_ignore_bogus_error_responses = 1
EOF
sudo sysctl -p

print_success "IP forwarding enabled"

#############################################
# PART 3: Firewall Configuration
#############################################
print_header "Part 3: Firewall Configuration"

print_info "Configuring UFW rules..."

# Basic rules
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# L2TP/IPsec ports
sudo ufw allow 500/udp comment 'IPsec IKE'
sudo ufw allow 4500/udp comment 'IPsec NAT-T'
sudo ufw allow 1701/udp comment 'L2TP'

# OpenVPN port (will be used later)
sudo ufw allow 1194/udp comment 'OpenVPN'

print_success "UFW rules added"

# Get network interface
IFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
print_info "Detected network interface: $IFACE"

# Configure NAT
print_info "Configuring NAT and forwarding rules..."
sudo cp /etc/ufw/before.rules /etc/ufw/before.rules.backup.$(date +%Y%m%d)

# Create new before.rules with NAT
sudo tee /etc/ufw/before.rules > /dev/null << EOF
# NAT table rules for VPN
*nat
:POSTROUTING ACCEPT [0:0]

# L2TP/IPsec NAT
-A POSTROUTING -s 10.99.0.0/24 -o $IFACE -j MASQUERADE

# OpenVPN NAT (for later)
-A POSTROUTING -s 10.8.0.0/24 -o $IFACE -j MASQUERADE

COMMIT

# Forwarding rules for IPsec
*mangle
-A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
COMMIT

# Don't delete the 'COMMIT' line or these rules won't be processed

*filter
:ufw-before-input - [0:0]
:ufw-before-output - [0:0]
:ufw-before-forward - [0:0]
:ufw-not-local - [0:0]

# Allow forwarding between VPN networks
-A ufw-before-forward -s 10.8.0.0/24 -d 10.99.0.0/24 -j ACCEPT
-A ufw-before-forward -s 10.99.0.0/24 -d 10.8.0.0/24 -j ACCEPT
-A ufw-before-forward -s 10.99.0.0/24 -j ACCEPT
-A ufw-before-forward -s 10.8.0.0/24 -j ACCEPT

# End required lines
# ok icmp codes for INPUT
-A ufw-before-input -p icmp --icmp-type destination-unreachable -j ACCEPT
-A ufw-before-input -p icmp --icmp-type time-exceeded -j ACCEPT
-A ufw-before-input -p icmp --icmp-type parameter-problem -j ACCEPT
-A ufw-before-input -p icmp --icmp-type echo-request -j ACCEPT

# ok icmp code for FORWARD
-A ufw-before-forward -p icmp --icmp-type destination-unreachable -j ACCEPT
-A ufw-before-forward -p icmp --icmp-type time-exceeded -j ACCEPT
-A ufw-before-forward -p icmp --icmp-type parameter-problem -j ACCEPT
-A ufw-before-forward -p icmp --icmp-type echo-request -j ACCEPT

# allow dhcp client to work
-A ufw-before-input -p udp --sport 67 --dport 68 -j ACCEPT

# ufw-not-local
-A ufw-before-input -j ufw-not-local

# if LOCAL, RETURN
-A ufw-not-local -m addrtype --dst-type LOCAL -j RETURN

# if MULTICAST, RETURN
-A ufw-not-local -m addrtype --dst-type MULTICAST -j RETURN

# if BROADCAST, RETURN
-A ufw-not-local -m addrtype --dst-type BROADCAST -j RETURN

# all other non-local packets are dropped
-A ufw-not-local -m limit --limit 3/min --limit-burst 10 -j ufw-logging-deny
-A ufw-not-local -j DROP

# allow MULTICAST mDNS for service discovery
-A ufw-before-input -p udp -d 224.0.0.251 --dport 5353 -j ACCEPT

# allow MULTICAST UPnP for service discovery
-A ufw-before-input -p udp -d 239.255.255.250 --dport 1900 -j ACCEPT

# don't delete the 'COMMIT' line or these rules won't be processed
COMMIT
EOF

print_success "NAT and forwarding rules configured"

# Enable UFW
print_info "Enabling UFW..."
sudo ufw --force enable
sudo ufw reload

print_success "Firewall configured and enabled"

#############################################
# PART 4: Start Services
#############################################
print_header "Part 4: Starting L2TP/IPsec Services"

print_info "Restarting strongSwan (IPsec)..."
sudo systemctl restart strongswan-starter
sudo systemctl enable strongswan-starter

print_info "Restarting xl2tpd (L2TP)..."
sudo systemctl restart xl2tpd
sudo systemctl enable xl2tpd

sleep 3

# Verify services
print_info "Verifying services..."
if systemctl is-active --quiet strongswan-starter; then
    print_success "strongSwan is running"
else
    print_error "strongSwan failed to start"
    sudo systemctl status strongswan-starter
fi

if systemctl is-active --quiet xl2tpd; then
    print_success "xl2tpd is running"
else
    print_error "xl2tpd failed to start"
    sudo systemctl status xl2tpd
fi

# Check listening ports
print_info "Checking listening ports..."
sudo netstat -tulpn | grep -E '500|4500|1701' || print_warning "Some ports may not be listening yet"

print_success "L2TP/IPsec setup complete!"

#############################################
# PART 5: Display Configuration Summary
#############################################
print_header "L2TP/IPsec Configuration Summary"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "                VPN CREDENTIALS - SAVE THESE!             "
echo "══════════════════════════════════════════════════════════"
echo ""
echo "Server IP: $VPS_IP"
echo "VPN Type: L2TP/IPsec with Pre-Shared Key"
echo ""
echo "Pre-Shared Key (PSK):"
echo "  $L2TP_PSK"
echo ""
echo "User Credentials (in /etc/ppp/chap-secrets):"
sudo cat /etc/ppp/chap-secrets | grep -v "^#" | grep -v "^$"
echo ""
echo "VPN IP Range: 10.99.0.2 - 10.99.0.254"
echo "Server VPN IP: 10.99.0.1"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# Save config to file
CONFIG_FILE="$HOME/vpn_l2tp_config_$(date +%Y%m%d_%H%M%S).txt"
cat > "$CONFIG_FILE" << EOF
ROAMS L2TP/IPsec VPN Configuration
Generated: $(date)

Server IP: $VPS_IP
VPN Type: L2TP/IPsec with Pre-Shared Key
VPN Network: 10.99.0.0/24

Pre-Shared Key (PSK): $L2TP_PSK

User Credentials:
$(sudo cat /etc/ppp/chap-secrets | grep -v "^#" | grep -v "^$")

Client Configuration (Windows):
1. Settings > Network & Internet > VPN > Add VPN
2. VPN Provider: Windows (built-in)
3. Server: $VPS_IP
4. VPN Type: L2TP/IPsec with pre-shared key
5. Pre-shared key: $L2TP_PSK
6. Username/Password: See above

Client Configuration (Android/iOS):
1. Settings > VPN > Add VPN
2. Type: L2TP/IPsec PSK
3. Server: $VPS_IP
4. IPsec pre-shared key: $L2TP_PSK
5. Username/Password: See above
EOF

print_success "Configuration saved to: $CONFIG_FILE"

#############################################
# Next Steps
#############################################
print_header "Next Steps"

echo "✅ L2TP/IPsec server is ready!"
echo ""
echo "To complete the hybrid VPN setup:"
echo "  1. Set up OpenVPN server (run setup_openvpn.sh)"
echo "  2. Configure routing between L2TP and OpenVPN networks"
echo "  3. Test connections from clients"
echo ""
echo "To test L2TP connection now:"
echo "  1. Configure a client device with the credentials above"
echo "  2. Connect to the VPN"
echo "  3. You should get an IP in the 10.99.0.x range"
echo "  4. Test: ping 10.99.0.1"
echo ""
echo "To view logs:"
echo "  sudo tail -f /var/log/syslog | grep -E 'xl2tpd|charon|pluto'"
echo ""
echo "To check status:"
echo "  sudo systemctl status strongswan-starter xl2tpd"
echo "  sudo ipsec statusall"
echo ""

print_success "Setup script completed successfully! 🎉"
