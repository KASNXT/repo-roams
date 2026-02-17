#!/bin/bash
# Quick VPS Django Fix Script
# Run this ON THE VPS (after SSH)

echo "===================================================================="
echo "🔧 ROAMS VPS Django Service Fix"
echo "===================================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command success
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

echo "Step 1: Checking current service status..."
systemctl is-active roams-django
CURRENT_STATUS=$?
echo ""

echo "Step 2: Stopping Django service..."
systemctl stop roams-django
check_status "Service stopped"
sleep 2
echo ""

echo "Step 3: Checking for processes on port 8000..."
PORT_CHECK=$(ss -tuln | grep :8000)
if [ -z "$PORT_CHECK" ]; then
    echo -e "${GREEN}✅ Port 8000 is free${NC}"
else
    echo -e "${YELLOW}⚠️  Port 8000 is in use, clearing...${NC}"
    lsof -ti:8000 2>/dev/null | xargs kill -9 2>/dev/null
    check_status "Port cleared"
fi
sleep 1
echo ""

echo "Step 4: Starting Django service..."
systemctl start roams-django
sleep 5
check_status "Service start command sent"
echo ""

echo "Step 5: Checking new service status..."
systemctl is-active roams-django
NEW_STATUS=$?
if [ $NEW_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ Django service is ACTIVE${NC}"
else
    echo -e "${RED}❌ Django service FAILED to start${NC}"
    echo ""
    echo "Showing last 20 log lines:"
    journalctl -u roams-django -n 20 --no-pager
fi
echo ""

echo "Step 6: Testing API endpoint..."
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/)
if [ "$API_TEST" == "200" ] || [ "$API_TEST" == "401" ] || [ "$API_TEST" == "403" ]; then
    echo -e "${GREEN}✅ API is responding (HTTP $API_TEST)${NC}"
elif [ "$API_TEST" == "502" ]; then
    echo -e "${RED}❌ Still getting 502 Bad Gateway${NC}"
else
    echo -e "${YELLOW}⚠️  API returned HTTP $API_TEST${NC}"
fi
echo ""

echo "Step 7: Checking OPC UA service..."
systemctl is-active roams-opcua
OPC_STATUS=$?
if [ $OPC_STATUS -ne 0 ]; then
    echo -e "${YELLOW}⚠️  OPC UA service is not active, starting...${NC}"
    systemctl start roams-opcua
    sleep 3
    systemctl is-active roams-opcua
    check_status "OPC UA service started"
else
    echo -e "${GREEN}✅ OPC UA service is active${NC}"
fi
echo ""

echo "===================================================================="
echo "📊 Final Status Summary"
echo "===================================================================="
echo ""
systemctl status roams-django roams-opcua nginx postgresql redis --no-pager | grep -E "Active:|Loaded:"
echo ""

echo "===================================================================="
echo "🎯 Quick Tests"
echo "===================================================================="
echo ""
echo "Test API locally:"
echo "  curl http://localhost:8000/api/"
echo ""
echo "Test API externally:"
echo "  curl http://144.91.79.167/api/"
echo ""
echo "View live logs:"
echo "  journalctl -u roams-django -f"
echo ""
echo "===================================================================="
echo "✅ Fix script complete!"
echo "===================================================================="
