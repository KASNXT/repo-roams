#!/bin/bash
# Deploy frontend to VPS

set -e

echo "=== Building & Deploying Frontend ==="

cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_frontend

# Copy current dist to VPS
echo "Deploying frontend files..."
scp -r dist/* root@144.91.79.167:/opt/roams_pro/roams_frontend/dist/

# Test
echo ""
echo "Testing deployment..."
curl -s http://144.91.79.167/ | head -50

echo ""
echo "=== Deploy Complete ==="
