#!/bin/bash
echo "Testing API endpoints..."
echo "======================="
echo ""

echo "1. Testing /api/opcua_clientconfig/ endpoint:"
curl -s http://localhost:8000/api/opcua_clientconfig/ 2>&1 | head -5
echo ""
echo ""

echo "2. Testing /api/system-uptime/ endpoint:"
curl -s http://localhost:8000/api/system-uptime/ 2>&1 | head -5
echo ""
echo ""

echo "3. Testing /api/breaches/ endpoint:"
curl -s http://localhost:8000/api/breaches/ 2>&1 | head -5
