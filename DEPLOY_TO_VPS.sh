#!/bin/bash
# BROMS VPS Deployment Script
# Run this script to deploy all updates to VPS

set -e  # Exit on error

VPS_IP="144.91.79.167"
VPS_USER="root"

echo "======================================"
echo "🚀 BROMS VPS Deployment Script"
echo "======================================"
echo ""

# Step 1: Build frontend
echo "📦 Step 1: Building frontend..."
cd roams_frontend
npm run build
echo "✅ Frontend built successfully"
echo ""

# Step 2: Deploy frontend
echo "🚢 Step 2: Deploying frontend to VPS..."
scp -r dist/* ${VPS_USER}@${VPS_IP}:/var/www/roams/
echo "✅ Frontend deployed"
echo ""

# Step 3: Update backend
echo "🔄 Step 3: Updating backend on VPS..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /opt/roams
echo "Pulling latest code..."
git pull origin main

echo "Activating virtual environment..."
cd roams_backend
source venv_new/bin/activate

echo "Running migrations..."
python manage.py migrate

echo "Restarting services..."
sudo systemctl restart roams-django
sudo systemctl restart roams-opcua

echo "Checking service status..."
sudo systemctl status roams-django --no-pager -l
sudo systemctl status roams-opcua --no-pager -l

echo "✅ Backend updated and services restarted"
ENDSSH

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "Next Steps:"
echo "1. Open http://144.91.79.167 in browser"
echo "2. Login with your credentials"
echo "3. Token will be stored automatically"
echo "4. All API calls will work"
echo ""
echo "To verify:"
echo "  - Backend: http://144.91.79.167:8000/admin/"
echo "  - Frontend: http://144.91.79.167/"
echo ""
