#!/bin/bash
#
# ROAMS Production Deployment Script
# Run this on your Hetzner VPS to deploy/update the application
#
# Usage: sudo bash deploy.sh [first-time|update]
#

set -e  # Exit on any error

DEPLOY_MODE="${1:-update}"
ROAMS_DIR="/opt/roams"
VENV_DIR="$ROAMS_DIR/venv_new"
BACKEND_DIR="$ROAMS_DIR/roams_backend"
FRONTEND_DIR="$ROAMS_DIR/roams_frontend"
LOG_DIR="/var/log/roams"
NGINX_AVAILABLE="/etc/nginx/sites-available/roams"
NGINX_ENABLED="/etc/nginx/sites-enabled/roams"

echo "=========================================="
echo "ROAMS Deployment Script"
echo "Mode: $DEPLOY_MODE"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# ==================== FIRST-TIME SETUP ====================
if [ "$DEPLOY_MODE" == "first-time" ]; then
    echo "📦 Installing system dependencies..."
    apt update
    apt install -y python3-pip python3-venv python3-dev \
                   postgresql postgresql-contrib \
                   redis-server \
                   nginx \
                   certbot python3-certbot-nginx \
                   git curl

    echo "👤 Creating www-data home directory and setting permissions..."
    mkdir -p /var/www
    usermod -d /var/www www-data || true

    echo "📂 Creating application directories..."
    mkdir -p $ROAMS_DIR
    mkdir -p $LOG_DIR
    chown -R www-data:www-data $ROAMS_DIR
    chown -R www-data:www-data $LOG_DIR

    echo "🗄️ Setting up PostgreSQL database..."
    sudo -u postgres psql <<EOF
CREATE DATABASE roams_db;
CREATE USER roams_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
ALTER ROLE roams_user SET client_encoding TO 'utf8';
ALTER ROLE roams_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE roams_user SET timezone TO 'Africa/Kampala';
GRANT ALL PRIVILEGES ON DATABASE roams_db TO roams_user;
EOF

    echo "✅ First-time setup complete!"
fi

# ==================== CODE DEPLOYMENT ====================
echo "📥 Deploying application code..."

# Copy/clone code to deployment directory
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Copying backend code..."
    # Assuming you're running this from the project directory
    cp -r ./roams_backend $ROAMS_DIR/
    cp -r ./roams_frontend $ROAMS_DIR/
    chown -R www-data:www-data $ROAMS_DIR
fi

# ==================== BACKEND SETUP ====================
echo "🐍 Setting up Python virtual environment..."
cd $BACKEND_DIR

if [ ! -d "$VENV_DIR" ]; then
    sudo -u www-data python3 -m venv $VENV_DIR
fi

echo "📦 Installing Python dependencies..."
sudo -u www-data $VENV_DIR/bin/pip install --upgrade pip
sudo -u www-data $VENV_DIR/bin/pip install -r requirements.txt
sudo -u www-data $VENV_DIR/bin/pip install gunicorn  # Add gunicorn if not in requirements.txt

echo "🔧 Checking for .env file..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "Please create $BACKEND_DIR/.env based on .env.example"
    echo "Required: SECRET_KEY, DEBUG=False, ALLOWED_HOSTS, database credentials"
    exit 1
fi

echo "🗄️ Running database migrations..."
sudo -u www-data $VENV_DIR/bin/python manage.py migrate --noinput

echo "📁 Collecting static files..."
sudo -u www-data $VENV_DIR/bin/python manage.py collectstatic --noinput

# ==================== FRONTEND BUILD ====================
echo "⚛️ Building React frontend..."
cd $FRONTEND_DIR

if [ "$DEPLOY_MODE" == "first-time" ]; then
    echo "📦 Installing Node.js (if not already installed)..."
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt install -y nodejs
    fi
fi

echo "📦 Installing npm dependencies..."
sudo -u www-data npm install

echo "🏗️ Building production bundle..."
sudo -u www-data npm run build

# ==================== SYSTEMD SERVICES ====================
echo "🔧 Setting up systemd services..."

# Copy service files
cp $ROAMS_DIR/deployment/systemd/roams-django.service /etc/systemd/system/
cp $ROAMS_DIR/deployment/systemd/roams-opcua.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable services to start on boot
systemctl enable roams-django.service
systemctl enable roams-opcua.service

echo "🔄 Restarting services..."
systemctl restart roams-django.service
systemctl restart roams-opcua.service

# Check service status
sleep 2
systemctl status roams-django.service --no-pager
systemctl status roams-opcua.service --no-pager

# ==================== NGINX CONFIGURATION ====================
echo "🌐 Configuring NGINX..."

# Copy NGINX config
cp $ROAMS_DIR/deployment/nginx/roams.conf $NGINX_AVAILABLE

# Update server_name in config (you'll need to edit this manually)
echo "⚠️  Remember to update server_name in $NGINX_AVAILABLE"

# Enable site
if [ ! -L "$NGINX_ENABLED" ]; then
    ln -s $NGINX_AVAILABLE $NGINX_ENABLED
fi

# Test NGINX config
nginx -t

# Reload NGINX
systemctl reload nginx

# ==================== SSL CERTIFICATE ====================
if [ "$DEPLOY_MODE" == "first-time" ]; then
    echo "🔒 SSL Certificate Setup"
    echo "Run this command manually after updating server_name in NGINX config:"
    echo "  sudo certbot --nginx -d your-domain.com -d www.your-domain.com"
fi

# ==================== FINAL CHECKS ====================
echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
systemctl is-active roams-django.service && echo "  ✅ Django: Running" || echo "  ❌ Django: Stopped"
systemctl is-active roams-opcua.service && echo "  ✅ OPC UA: Running" || echo "  ❌ OPC UA: Stopped"
systemctl is-active nginx.service && echo "  ✅ NGINX: Running" || echo "  ❌ NGINX: Stopped"
systemctl is-active postgresql.service && echo "  ✅ PostgreSQL: Running" || echo "  ❌ PostgreSQL: Stopped"
systemctl is-active redis.service && echo "  ✅ Redis: Running" || echo "  ❌ Redis: Stopped"

echo ""
echo "Next Steps:"
echo "1. Edit .env file: $BACKEND_DIR/.env"
echo "2. Update NGINX server_name: $NGINX_AVAILABLE"
echo "3. Run SSL setup: sudo certbot --nginx -d your-domain.com"
echo "4. Create Django superuser: sudo -u www-data $VENV_DIR/bin/python $BACKEND_DIR/manage.py createsuperuser"
echo "5. Test your site: https://your-domain.com"
echo ""
echo "Logs:"
echo "  Django: journalctl -u roams-django.service -f"
echo "  OPC UA: journalctl -u roams-opcua.service -f"
echo "  NGINX: tail -f /var/log/nginx/roams-error.log"
echo "  Application: tail -f $LOG_DIR/error.log"
echo ""
