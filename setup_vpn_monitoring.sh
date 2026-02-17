#!/bin/bash
# VPN Monitoring Setup Script for ROAMS VPS
# This script configures VPN status sources and permissions

echo "=== ROAMS VPN Monitoring Setup ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# VPS Details
VPS_IP="144.91.79.167"
VPS_USER="root"
DJANGO_USER="www-data"  # Adjust if different

echo "Target VPS: $VPS_IP"
echo ""

# Function to run commands on VPS
run_vps_cmd() {
    ssh -o ConnectTimeout=10 $VPS_USER@$VPS_IP "$1"
}

echo "Step 1: Checking OpenVPN configuration..."
echo "-------------------------------------------"

# Check if OpenVPN is installed and running
if run_vps_cmd "command -v openvpn >/dev/null 2>&1"; then
    echo -e "${GREEN}✓${NC} OpenVPN is installed"
    
    # Check OpenVPN service status
    if run_vps_cmd "systemctl is-active --quiet openvpn"; then
        echo -e "${GREEN}✓${NC} OpenVPN service is running"
    else
        echo -e "${YELLOW}⚠${NC} OpenVPN service is not running"
        echo "  To start: systemctl start openvpn@server"
    fi
    
    # Check for status log
    echo ""
    echo "Checking OpenVPN status log locations..."
    run_vps_cmd "ls -lh /var/log/openvpn/openvpn-status.log 2>/dev/null || \
                 ls -lh /var/log/openvpn-status.log 2>/dev/null || \
                 ls -lh /etc/openvpn/openvpn-status.log 2>/dev/null || \
                 echo 'No OpenVPN status log found'"
    
    echo ""
    echo "To enable OpenVPN status logging, add to /etc/openvpn/server.conf:"
    echo "  status /var/log/openvpn/openvpn-status.log"
    echo "  status-version 2"
    
else
    echo -e "${YELLOW}⚠${NC} OpenVPN is not installed"
    echo "  To install: apt-get install openvpn"
fi

echo ""
echo "Step 2: Checking IPsec/L2TP configuration..."
echo "----------------------------------------------"

# Check if strongSwan (IPsec) is installed
if run_vps_cmd "command -v ipsec >/dev/null 2>&1"; then
    echo -e "${GREEN}✓${NC} IPsec (strongSwan) is installed"
    
    # Check if ipsec service is running
    if run_vps_cmd "systemctl is-active --quiet strongswan 2>/dev/null || systemctl is-active --quiet ipsec 2>/dev/null"; then
        echo -e "${GREEN}✓${NC} IPsec service is running"
    else
        echo -e "${YELLOW}⚠${NC} IPsec service is not running"
        echo "  To start: systemctl start strongswan"
    fi
    
    # Test ipsec command
    echo ""
    echo "Testing ipsec statusall command..."
    run_vps_cmd "ipsec statusall 2>&1 | head -10"
    
else
    echo -e "${YELLOW}⚠${NC} IPsec is not installed"
    echo "  To install: apt-get install strongswan"
fi

echo ""
echo "Step 3: Setting up Django permissions..."
echo "------------------------------------------"

# Get Django user (usually www-data or the user running gunicorn)
DJANGO_SERVICE_USER=$(run_vps_cmd "systemctl show -p User roams-django.service 2>/dev/null | cut -d= -f2")
if [ -z "$DJANGO_SERVICE_USER" ] || [ "$DJANGO_SERVICE_USER" = "" ]; then
    DJANGO_SERVICE_USER="root"
fi

echo "Django service running as: $DJANGO_SERVICE_USER"
echo ""

# Grant read permissions to OpenVPN status log
echo "Granting permissions to OpenVPN status log..."
run_vps_cmd "if [ -f /var/log/openvpn/openvpn-status.log ]; then \
                 chmod 644 /var/log/openvpn/openvpn-status.log && \
                 echo '✓ Permissions set for OpenVPN log'; \
             fi"

# Grant sudo permissions for ipsec command (if needed)
echo ""
echo "Checking if Django user can run ipsec commands..."
if [ "$DJANGO_SERVICE_USER" != "root" ]; then
    echo "Note: If ipsec requires sudo, add to /etc/sudoers.d/django-ipsec:"
    echo "  $DJANGO_SERVICE_USER ALL=(ALL) NOPASSWD: /usr/sbin/ipsec statusall"
    echo ""
    echo "Or run Django service as root (not recommended for production)"
fi

echo ""
echo "Step 4: Testing VPN monitoring endpoint..."
echo "--------------------------------------------"

# Test the VPN monitoring endpoint (will require auth)
echo "Testing endpoint accessibility..."
ENDPOINT_TEST=$(run_vps_cmd "curl -s -w '\n%{http_code}' http://localhost:8000/api/vpn-monitor/all_connections/ | tail -1")

if [ "$ENDPOINT_TEST" = "401" ] || [ "$ENDPOINT_TEST" = "403" ]; then
    echo -e "${GREEN}✓${NC} VPN monitoring endpoint is accessible (requires auth)"
elif [ "$ENDPOINT_TEST" = "200" ]; then
    echo -e "${GREEN}✓${NC} VPN monitoring endpoint is accessible and returning data"
else
    echo -e "${RED}✗${NC} VPN monitoring endpoint returned status: $ENDPOINT_TEST"
    echo "  Check if Django is running: systemctl status roams-django"
fi

echo ""
echo "Step 5: Verification Summary"
echo "==============================="

# Create verification checklist
echo ""
echo "Please verify the following:"
echo ""
echo "□ OpenVPN Checklist:"
echo "  [ ] OpenVPN service is running"
echo "  [ ] Status log is enabled in /etc/openvpn/server.conf"
echo "  [ ] Log file is readable: /var/log/openvpn/openvpn-status.log"
echo ""
echo "□ L2TP/IPsec Checklist:"
echo "  [ ] IPsec service is running (strongSwan)"
echo "  [ ] 'ipsec statusall' command works"
echo "  [ ] Django user has permission to run ipsec commands"
echo ""
echo "□ Django Checklist:"
echo "  [ ] roams-django service is running"
echo "  [ ] VPN monitoring endpoint is accessible"
echo "  [ ] Frontend shows VPN Connections card (for admin users)"
echo ""

echo "=== Configuration Commands ==="
echo ""
echo "1. Enable OpenVPN status logging:"
echo "   echo 'status /var/log/openvpn/openvpn-status.log' >> /etc/openvpn/server.conf"
echo "   echo 'status-version 2' >> /etc/openvpn/server.conf"
echo "   systemctl restart openvpn@server"
echo ""
echo "2. Set log permissions:"
echo "   chmod 644 /var/log/openvpn/openvpn-status.log"
echo ""
echo "3. Grant Django user ipsec access (if needed):"
echo "   echo '$DJANGO_SERVICE_USER ALL=(ALL) NOPASSWD: /usr/sbin/ipsec statusall' > /etc/sudoers.d/django-ipsec"
echo "   chmod 440 /etc/sudoers.d/django-ipsec"
echo ""
echo "4. Restart Django service:"
echo "   systemctl restart roams-django"
echo ""

echo "=== Next Steps ==="
echo ""
echo "1. Log in to VPS web interface: http://$VPS_IP"
echo "2. Login as admin user"
echo "3. Navigate to Settings → Network tab"
echo "4. Verify VPN Connections card is visible"
echo "5. Check that VPN status shows correctly"
echo ""

echo "Setup check complete!"
