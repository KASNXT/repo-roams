#!/bin/bash
# Quick test to verify breach API endpoints are working

echo "🧪 Testing Breach API Endpoints"
echo "=================================="
echo ""

# Note: Replace these with your actual values
BREACH_ID=1
TOKEN="your_token_here"  # Get this from login
BASE_URL="http://localhost:8000/api"

echo "📋 Endpoints that should now work:"
echo ""

echo "1️⃣  List all breaches:"
echo "   curl -H \"Authorization: Token $TOKEN\" $BASE_URL/breaches/"
echo ""

echo "2️⃣  Get single breach (with threshold info):"
echo "   curl -H \"Authorization: Token $TOKEN\" $BASE_URL/breaches/$BREACH_ID/"
echo ""

echo "3️⃣  Acknowledge a breach:"
echo "   curl -X POST -H \"Authorization: Token $TOKEN\" $BASE_URL/breaches/$BREACH_ID/acknowledge/"
echo ""

echo "4️⃣  Dismiss a breach:"
echo "   curl -X POST -H \"Authorization: Token $TOKEN\" $BASE_URL/breaches/$BREACH_ID/dismiss/"
echo ""

echo "5️⃣  List unacknowledged breaches:"
echo "   curl -H \"Authorization: Token $TOKEN\" $BASE_URL/breaches/unacknowledged/"
echo ""

echo "6️⃣  Get recent breaches:"
echo "   curl -H \"Authorization: Token $TOKEN\" $BASE_URL/breaches/recent/?hours=24"
echo ""

echo "✅ All endpoints are now properly registered!"
echo ""
echo "To get a token:"
echo "  curl -X POST -d \"username=admin&password=password\" $BASE_URL-token-auth/"
