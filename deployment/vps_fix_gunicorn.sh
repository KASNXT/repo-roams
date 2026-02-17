#!/bin/bash
# Quick fix script - run this on VPS to stop old Gunicorn and start new service

set -e

echo "=== Fixing Gunicorn Service ==="
echo ""

# Stop old manually-run Gunicorn processes
echo "1. Stopping old Gunicorn processes on port 8000..."
pkill -f "gunicorn.*roams_pro.wsgi" || echo "No old processes found"

# Wait a moment
sleep 2

# Upload and start new service
cd /opt/roams_pro/roams_backend

echo ""
echo "2. Uploading updated service file..."
# (This should be done via scp from local machine first)

echo ""
echo "3. Reloading systemd and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable roams-gunicorn
sudo systemctl restart roams-gunicorn

# Wait for service to start
sleep 3

echo ""
echo "4. Checking service status..."
sudo systemctl status roams-gunicorn --no-pager -l

echo ""
echo "5. Checking logs..."
sudo journalctl -u roams-gunicorn -n 30 --no-pager

echo ""
echo "6. Testing endpoint..."
curl -I http://127.0.0.1:8000/ || echo "Service not responding yet"

echo ""
echo "=== Done! ==="
