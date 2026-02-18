#!/bin/bash
# Frontend Deployment Script for VPS
# This script builds and deploys the React frontend to production

VPS_IP="144.91.79.167"
VPS_USER="root"
FRONTEND_DIR="/opt/roams_pro/roams_frontend"
NGINX_ROOT="/var/www/html"

echo "=========================================="
echo "ROAMS Frontend Deployment to VPS"
echo "=========================================="
echo ""

# Step 1: Pull latest code on VPS
echo "Step 1/5: Pulling latest code from GitHub..."
ssh ${VPS_USER}@${VPS_IP} "cd /opt/roams_pro && git pull origin main"
echo "✅ Code pulled"
echo ""

# Step 2: Install/update npm dependencies
echo "Step 2/5: Installing dependencies..."
ssh ${VPS_USER}@${VPS_IP} "cd ${FRONTEND_DIR} && npm install"
echo "✅ Dependencies installed"
echo ""

# Step 3: Build production frontend
echo "Step 3/5: Building production frontend..."
ssh ${VPS_USER}@${VPS_IP} "cd ${FRONTEND_DIR} && npm run build"
echo "✅ Frontend built"
echo ""

# Step 4: Deploy built files to NGINX
echo "Step 4/5: Deploying to NGINX..."
ssh ${VPS_USER}@${VPS_IP} "rm -rf ${NGINX_ROOT}/* && cp -r ${FRONTEND_DIR}/dist/* ${NGINX_ROOT}/"
echo "✅ Files deployed"
echo ""

# Step 5: Restart NGINX
echo "Step 5/5: Restarting NGINX..."
ssh ${VPS_USER}@${VPS_IP} "systemctl restart nginx"
echo "✅ NGINX restarted"
echo ""

echo "=========================================="
echo "🚀 Frontend deployment complete!"
echo "Visit: http://${VPS_IP}"
echo "=========================================="
