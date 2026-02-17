#!/bin/bash
# Fix permissions and start Gunicorn service
# Run this on VPS

echo "=== Fixing Permissions and Starting Gunicorn ==="

# Fix log directory permissions
echo "Fixing log directories..."
sudo chown -R www-data:www-data /opt/roams_pro/roams_backend/logs/
sudo chown -R www-data:www-data /var/log/roams/
sudo chmod -R 755 /opt/roams_pro/roams_backend/logs/
sudo chmod -R 755 /var/log/roams/

# Fix backend directory permissions for static files
echo "Fixing backend directory permissions..."
sudo chown -R www-data:www-data /opt/roams_pro/roams_backend/staticfiles/ || true
sudo chown -R www-data:www-data /opt/roams_pro/roams_backend/media/ || true

# Start service
echo "Starting Gunicorn service..."
sudo systemctl daemon-reload
sudo systemctl restart roams-gunicorn

# Wait
sleep 3

# Check status
echo ""
echo "=== Service Status ==="
sudo systemctl status roams-gunicorn --no-pager -l

echo ""
echo "=== Testing endpoint ==="
curl -I http://127.0.0.1:8000/ || echo "Not responding yet"

echo ""
echo "Done!"
