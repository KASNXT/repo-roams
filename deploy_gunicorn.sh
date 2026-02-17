#!/bin/bash
# Deploy Gunicorn Setup to VPS
# Run this from your local machine

set -e

VPS_IP="144.91.79.167"
VPS_USER="root"
BACKEND_DIR="/opt/roams_pro/roams_backend"

echo "=== ROAMS Gunicorn Deployment Script ==="
echo ""

# Step 1: Upload files
echo "Step 1: Uploading Gunicorn configuration..."
scp roams_backend/gunicorn_config.py ${VPS_USER}@${VPS_IP}:${BACKEND_DIR}/
scp deployment/roams-gunicorn.service ${VPS_USER}@${VPS_IP}:/tmp/
scp roams_backend/roams_pro/settings.py ${VPS_USER}@${VPS_IP}:${BACKEND_DIR}/roams_pro/

echo ""
echo "Step 2: Installing Gunicorn and configuring services on VPS..."

ssh ${VPS_USER}@${VPS_IP} << 'EOF'
    set -e
    
    # Install Gunicorn
    echo "Installing Gunicorn..."
    cd /opt/roams_pro/roams_backend
    source venv_new/bin/activate
    pip install gunicorn
    
    # Create log directory
    echo "Creating log directories..."
    sudo mkdir -p /var/log/roams
    sudo chown www-data:www-data /var/log/roams
    sudo chmod 755 /var/log/roams
    
    # Fix backend log directory permissions
    sudo mkdir -p /opt/roams_pro/roams_backend/logs
    sudo chown -R www-data:www-data /opt/roams_pro/roams_backend/logs
    sudo chmod -R 755 /opt/roams_pro/roams_backend/logs
    
    # Fix static and media permissions
    sudo chown -R www-data:www-data /opt/roams_pro/roams_backend/staticfiles || true
    sudo chown -R www-data:www-data /opt/roams_pro/roams_backend/media || true
    
    # Create runtime directory
    sudo mkdir -p /var/run/roams
    sudo chown www-data:www-data /var/run/roams
    
    # Move service file
    echo "Setting up systemd service..."
    sudo mv /tmp/roams-gunicorn.service /etc/systemd/system/
    sudo chmod 644 /etc/systemd/system/roams-gunicorn.service
    
    # Stop old Django service
    echo "Stopping old roams-django service..."
    sudo systemctl stop roams-django || true
    sudo systemctl disable roams-django || true
    
    # Kill old manually-run Gunicorn processes
    echo "Stopping old Gunicorn processes..."
    sudo pkill -f "gunicorn.*roams_pro.wsgi" || echo "No old Gunicorn processes found"
    sleep 2
    
    # Reload systemd and start Gunicorn
    echo "Starting Gunicorn service..."
    sudo systemctl daemon-reload
    sudo systemctl enable roams-gunicorn
    sudo systemctl start roams-gunicorn
    
    # Wait a moment
    sleep 3
    
    # Check status
    echo ""
    echo "=== Service Status ==="
    sudo systemctl status roams-gunicorn --no-pager -l
    
    echo ""
    echo "=== Recent Logs ==="
    sudo journalctl -u roams-gunicorn -n 30 --no-pager
    
    echo ""
    echo "=== Nginx Configuration Check ==="
    sudo nginx -t
    
    echo ""
    echo "Reloading Nginx..."
    sudo systemctl reload nginx
EOF

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "Your Django app is now running with Gunicorn!"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status roams-gunicorn   # Check status"
echo "  sudo systemctl restart roams-gunicorn  # Restart"
echo "  sudo journalctl -u roams-gunicorn -f   # View live logs"
echo "  curl http://144.91.79.167/api/health   # Test endpoint"
echo ""
echo "Access your app at: http://144.91.79.167"
