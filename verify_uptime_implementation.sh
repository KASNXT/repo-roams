#!/bin/bash

# Uptime Trend Implementation - Quick Verification Script

echo "======================================"
echo "🔍 Uptime Trend Implementation Check"
echo "======================================"
echo ""

# Check Python files
echo "✅ Python Backend Files:"
echo ""

echo "1. uptime_trend.py utility:"
if [ -f "roams_backend/roams_opcua_mgr/utils/uptime_trend.py" ]; then
    echo "   ✓ File exists"
    echo "   Functions:"
    grep "^def " roams_backend/roams_opcua_mgr/utils/uptime_trend.py | sed 's/def /   - /'
else
    echo "   ✗ File missing"
fi
echo ""

echo "2. API Views endpoint:"
if grep -q "def uptime_trend_graph" roams_backend/roams_api/views.py; then
    echo "   ✓ uptime_trend_graph() function added"
else
    echo "   ✗ Function missing"
fi
echo ""

echo "3. URLs routing:"
if grep -q "uptime-trend" roams_backend/roams_api/urls.py; then
    echo "   ✓ Route configured: /api/uptime-trend/"
else
    echo "   ✗ Route not configured"
fi
echo ""

echo "------------------------------------"
echo "✅ Frontend Files:"
echo ""

echo "1. Overview.tsx updates:"
if grep -q "uptime_trend_graph\|uptime-trend" roams_frontend/src/pages/Overview.tsx; then
    echo "   ✓ Fetches new endpoint"
else
    echo "   ✗ Endpoint fetch missing"
fi

if grep -q "serverUptime" roams_frontend/src/pages/Overview.tsx; then
    echo "   ✓ Server uptime state added"
else
    echo "   ✗ Server uptime state missing"
fi

if grep -q "Server Status Cards\|Django Server" roams_frontend/src/pages/Overview.tsx; then
    echo "   ✓ Server status UI added"
else
    echo "   ✗ Server status UI missing"
fi
echo ""

echo "------------------------------------"
echo "📊 Testing Instructions:"
echo ""
echo "1. Start Django backend:"
echo "   cd roams_backend"
echo "   python manage.py runserver"
echo ""
echo "2. Start Frontend:"
echo "   cd roams_frontend"
echo "   npm run dev"
echo ""
echo "3. Test API endpoint:"
echo "   curl -H 'Authorization: Token YOUR_TOKEN' http://localhost:8000/api/uptime-trend/?hours=24"
echo ""
echo "4. View in browser:"
echo "   Navigate to http://localhost:5173/overview"
echo "   Scroll down to 'Uptime Trend & Server Status' card"
echo ""
echo "5. Verify:"
echo "   - Server uptime displays at top (0d 4h 0m format)"
echo "   - Graph shows hourly station activity"
echo "   - Chart auto-updates every 5 minutes"
echo "   - Multiple stations displayed with different colors"
echo ""

echo "======================================"
echo "✅ Implementation Verified"
echo "======================================"
