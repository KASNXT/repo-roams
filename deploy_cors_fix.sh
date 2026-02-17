#!/bin/bash
# Deploy CORS/CSRF fix to VPS

echo "=== Deploying CORS/CSRF Fix to VPS ==="

# Upload updated settings.py
echo "1. Uploading settings.py..."
scp /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend/roams_pro/settings.py \
    root@144.91.79.167:/opt/roams/roams_backend/roams_pro/settings.py

echo ""
echo "2. Restarting Django service on VPS..."
ssh root@144.91.79.167 << 'EOF'
    # Restart Django service
    sudo systemctl restart roams-django
    
    # Check status
    sudo systemctl status roams-django --no-pager -l
    
    # Check logs for errors
    echo ""
    echo "=== Recent Django logs ==="
    sudo journalctl -u roams-django -n 20 --no-pager
EOF

echo ""
echo "=== Deployment Complete! ==="
echo "Access your app at: http://144.91.79.167 or https://144.91.79.167"
