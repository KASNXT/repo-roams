# 🚀 ROAMS Deployment to Contabo VPS - Step by Step Guide

## Overview
This guide will walk you through deploying your ROAMS application from GitHub to a Contabo VPS. The process takes approximately 2-3 hours.

**What you'll set up:**
- Ubuntu 22.04 VPS
- PostgreSQL database
- Redis for caching
- NGINX reverse proxy
- SSL certificate (HTTPS)
- Django backend + React frontend
- Systemd services for auto-restart

---

## Part 1: Order & Setup Contabo VPS (30 minutes)

### Step 1.1: Order VPS

1. Go to [https://contabo.com/en/vps/](https://contabo.com/en/vps/)
2. Select **VPS M** (Recommended for ROAMS):
   - 6 vCore CPU
   - 16 GB RAM
   - 400 GB SSD
   - Cost: ~€5.99/month (very affordable!)
3. Choose:
   - **Location**: Europe (Germany/UK) or US (choose closest to Uganda)
   - **Image**: Ubuntu 22.04 LTS
   - **Period**: 1 month (test first, then upgrade to 6/12 months for discount)
4. **Add SSH Key**: 
   - On your Windows/WSL terminal, run: `cat ~/.ssh/id_rsa.pub`
   - Copy the output (starts with `ssh-rsa`)
   - Paste it in Contabo's SSH Key field
5. Complete payment

**Wait 1-4 hours** - Contabo will email you VPS access details:
- IP Address
- SSH access instructions

### Step 1.2: First Login

Open WSL terminal and SSH into your VPS:

```bash
CREATEcdcd /opt/roams/roams_backend

# Create virtual environment
python3 -m venv venv_new

# Activate it
source venv_new/bin/activate

# Your prompt should now show: (venv_new)

# Upgrade pip and install wheel
pip install --upgrade pip
pip install wheel

# Install all requirements (this will take 5-10 minutes)
pip install -r requirements.txt
# Type 'yes' when asked about fingerprint
# You should see Ubuntu welcome message
```

### Step 1.3: Initial Security Setup

Run these commands on your VPS:

```bash
# Update all packages (takes 5-10 minutes)
apt update && apt upgrade -y

# Create a non-root user for deploying (IMPORTANT for security)
adduser deploy
# Enter password when prompted (remember it!)
# Press Enter for all other prompts (name, phone, etc.)

# Give deploy user sudo privileges
usermod -aG sudo deploy

# Setup SSH access for deploy user
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Enable firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Exit and reconnect as deploy user
exit
```

Now reconnect as the deploy user:
```bash
ssh deploy@YOUR_VPS_IP
```

✅ **Checkpoint 1**: You're now logged in as `deploy@your-server`

---

## Part 2: Install System Dependencies (20 minutes)

Copy and paste these commands into your VPS terminal:

```bash
# Install Python, PostgreSQL, Redis, NGINX
sudo apt update
sudo apt install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    postgresql \
    postgresql-contrib \
    redis-server \
    nginx \
    git \
    curl \
    build-essential \
    libpq-dev

# Install Node.js 20 (for building React frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
python3 --version  # Should show Python 3.10+
node --version     # Should show v20.x
npm --version      # Should show 10.x
psql --version     # Should show PostgreSQL 14+
redis-cli --version # Should show Redis 6+
```

✅ **Checkpoint 2**: All dependencies installed successfully

---

## Part 3: Setup Database (15 minutes)

### Step 3.1: Create PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# You're now in PostgreSQL shell
# Run these commands one by one:
```

In the PostgreSQL prompt (`postgres=#`):
```sql
-- Create database
CREATE DATABASE roams_db;

-- Create user with strong password (CHANGE 'your_secure_password_here')
CREATE USER roams_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
ALTER ROLE roams_user SET client_encoding TO 'utf8';
ALTER ROLE roams_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE roams_user SET timezone TO 'Africa/Kampala';
GRANT ALL PRIVILEGES ON DATABASE roams_db TO roams_user;

-- Exit PostgreSQL
\q
```

### Step 3.2: Test Database Connection

```bash
# Test login (use password you created above)
psql -h localhost -U roams_user -d roams_db -W

# If successful, you'll see: roams_db=>
# Type \q to exit
```

✅ **Checkpoint 3**: Database created and accessible

---

## Part 4: Clone Your Code from GitHub (10 minutes)

### Step 4.1: Prepare GitHub Repository

On your **LOCAL machine** (Windows/WSL), push your latest code:

```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b

# Make sure all changes are committed
git status

# If you see uncommitted changes:
git add .
git commit -m "Prepare for production deployment"

# Push to GitHub (make sure your repo exists on GitHub)
git push origin main
```

**If you don't have a GitHub repo yet:**
```bash
# On your local machine
cd /mnt/d/DJANGO_PROJECTS/roams_b
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub.com (roams_b)
# Then:
git remote add origin https://github.com/YOUR_USERNAME/roams_b.git
git branch -M main
git push -u origin main
```

### Step 4.2: Clone on VPS

Back on your **VPS terminal**:

```bash
# Create application directory
sudo mkdir -p /opt/roams
sudo chown deploy:deploy /opt/roams
cd /opt/roams

# Clone your repository (REPLACE with your GitHub username/repo)
git clone https://github.com/YOUR_USERNAME/roams_b.git .

# You should now see: roams_backend/ and roams_frontend/ folders
ls -la
```

✅ **Checkpoint 4**: Code is on the VPS

---

## Part 5: Configure Backend (30 minutes)

### Step 5.1: Create Python Virtual Environment

```bash
cd /opt/roams/roams_backend

# Create virtual environment
python3 -m venv venv_new

# Activate it
source venv_new/bin/activate

# Your prompt should now show: (venv_new)
```

### Step 5.2: Install Python Dependencies

```bash
# Still in /opt/roams/roams_backend with venv_new activated
pip install --upgrade pip
pip install wheel

# Install all requirements (takes 5-10 minutes)
pip install -r requirements.txt

# Verify installation
pip list | grep Django  # Should show Django 4.2.x
```

### Step 5.3: Create Production Environment File

```bash
# Generate a SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
# Copy the output (50-character string)

# Create .env file
nano .env
```

Paste this into the `.env` file (update the values in `< >`):

```env
# Django Settings
DEBUG=False
SECRET_KEY=<paste_the_secret_key_you_generated>
ALLOWED_HOSTS=<your_vps_ip>,localhost,127.0.0.1

# Database (use the password from Step 3.1)
DB_NAME=roams_db
DB_USER=roams_user
DB_PASSWORD=<your_secure_password_here>
DB_HOST=127.0.0.1
DB_PORT=5432

# Redis
REDIS_URL=redis://127.0.0.1:6379/0

# Email (configure later)
THRESHOLD_EMAIL_ENABLED=False

# Timezone
TZ=Africa/Kampala
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

### Step 5.4: Run Database Migrations

```bash
# Still in /opt/roams/roams_backend with venv_new activated

# Run migrations
python manage.py migrate

# Create superuser for admin panel
python manage.py createsuperuser
# Username: admin
# Email: your@email.com
# Password: (create a strong password)
# Password (again): (repeat)

# Collect static files
python manage.py collectstatic --noinput
```

### Step 5.5: Test Backend

```bash
# Test that Django runs (with production settings)
python manage.py check --deploy

# Start test server (Ctrl+C to stop after testing)
python manage.py runserver 0.0.0.0:8000 --nothreading --noreload

# Keep it running...
```

Open a **new terminal** on your local machine and test:
```bash
# Replace YOUR_VPS_IP
curl http://YOUR_VPS_IP:8000/api/

# You should see: {"message": "ROAMS API is running"}
# Press Ctrl+C on VPS terminal to stop the test server
```

✅ **Checkpoint 5**: Backend is working!

---

## Part 6: Build & Configure Frontend (20 minutes)

### Step 6.1: Configure Frontend API URL

On your **VPS**:

```bash
cd /opt/roams/roams_frontend

# Edit API configuration
nano src/services/api.ts
```

Find the `getServerUrl()` function and update it:

```typescript
export const getServerUrl = (): string => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("roams_server_url");
    if (stored) return stored;
    
    // Production: Use same domain as frontend
    if (import.meta.env.PROD) {
      return window.location.origin;  // This will use your domain/IP
    }
    
    // Development
    return "http://localhost:8000";
  }
  return "http://localhost:8000";
};
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 6.2: Build Frontend

```bash
# Still in /opt/roams/roams_frontend

# Install dependencies (takes 5-10 minutes)
npm install

# Build for production (creates optimized dist/ folder)
npm run build

# Verify build
ls -lh dist/  # Should show index.html and assets/
```

✅ **Checkpoint 6**: Frontend built successfully

---

## Part 7: Setup NGINX Reverse Proxy (15 minutes)

### Step 7.1: Create NGINX Configuration

```bash
sudo nano /etc/nginx/sites-available/roams
```

Paste this configuration (replace `YOUR_VPS_IP` with your actual IP):

```nginx
# ROAMS NGINX Configuration

upstream django_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name YOUR_VPS_IP;  # Replace with your IP or domain

    client_max_body_size 10M;

    # Serve React frontend
    location / {
        root /opt/roams/roams_frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to Django
    location /api/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for long-running requests
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Admin panel
    location /admin/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Django static files
    location /static/ {
        alias /opt/roams/roams_backend/staticfiles/;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
    }
}
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 7.2: Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/roams /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# If you see "syntax is ok" and "test is successful":
sudo systemctl restart nginx
```

✅ **Checkpoint 7**: NGINX configured

---

## Part 8: Setup Systemd Services (Auto-Start) (20 minutes)

### Step 8.1: Create Django Service

```bash
sudo nano /etc/systemd/system/roams-django.service
```

Paste this:

```ini
[Unit]
Description=ROAMS Django Application
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/roams/roams_backend
Environment="PATH=/opt/roams/roams_backend/venv_new/bin"
EnvironmentFile=/opt/roams/roams_backend/.env
ExecStart=/opt/roams/roams_backend/venv_new/bin/python manage.py runserver 0.0.0.0:8000 --nothreading --noreload

Restart=always
RestartSec=10

StandardOutput=append:/var/log/roams/django.log
StandardError=append:/var/log/roams/django-error.log

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 8.2: Create OPC UA Service

```bash
sudo nano /etc/systemd/system/roams-opcua.service
```

Paste this:

```ini
[Unit]
Description=ROAMS OPC UA Background Worker
After=network.target roams-django.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/roams/roams_backend
Environment="PATH=/opt/roams/roams_backend/venv_new/bin"
EnvironmentFile=/opt/roams/roams_backend/.env
ExecStart=/opt/roams/roams_backend/venv_new/bin/python start_opcua_clients.py

Restart=always
RestartSec=10

StandardOutput=append:/var/log/roams/opcua.log
StandardError=append:/var/log/roams/opcua-error.log

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 8.3: Set Permissions & Start Services

```bash
# Create log directory
sudo mkdir -p /var/log/roams
sudo chown -R www-data:www-data /var/log/roams

# Set ownership of app files
sudo chown -R www-data:www-data /opt/roams

# Reload systemd
sudo systemctl daemon-reload

# Enable services (start on boot)
sudo systemctl enable roams-django
sudo systemctl enable roams-opcua

# Start services
sudo systemctl start roams-django
sudo systemctl start roams-opcua

# Check status
sudo systemctl status roams-django
sudo systemctl status roams-opcua
```

You should see: `Active: active (running)`

✅ **Checkpoint 8**: Services running!

---

## Part 9: Test Your Deployment (10 minutes)

### Step 9.1: Access Your Application

Open your web browser and go to:
```
http://YOUR_VPS_IP
```

You should see the ROAMS login page! 🎉

**Login with:**
- Username: `admin` (or whatever you created in Step 5.4)
- Password: (your superuser password)

### Step 9.2: Test API

```bash
# From your local machine
curl http://YOUR_VPS_IP/api/

# Should return: {"message": "ROAMS API is running"}
```

### Step 9.3: Check Logs

If something doesn't work:

```bash
# View Django logs
sudo tail -f /var/log/roams/django.log

# View OPC UA logs  
sudo tail -f /var/log/roams/opcua.log

# View NGINX logs
sudo tail -f /var/log/nginx/error.log
```

---

## Part 10: Configure OPC UA Stations (15 minutes)

### Step 10.1: Access Django Admin

Go to: `http://YOUR_VPS_IP/admin/`

Login with your superuser credentials.

### Step 10.2: Add OPC UA Station

1. Click **Opc ua client configs** → **Add**
2. Fill in:
   - **Station name**: `Bombo Station` (or your station name)
   - **Endpoint url**: `opc.tcp://your-opcua-server:4840`
   - **Security policy**: `Basic256Sha256`
   - **Active**: ✅ (checked)
   - **Subscription interval**: `2000` (2 seconds)
3. Click **Save**

### Step 10.3: Add Nodes

1. Click **Opcua nodes** → **Add**
2. Fill in:
   - **Station**: Select your station
   - **Node id**: `ns=2;s=WaterLevel`
   - **Tag name**: `Water Level`
   - **Data type**: `Float`
   - **Threshold active**: ✅ (if monitoring)
3. Click **Save**

### Step 10.4: Restart OPC UA Service

```bash
sudo systemctl restart roams-opcua

# Check connection
sudo tail -f /var/log/roams/opcua.log
# You should see: "Connected to Bombo Station"
```

✅ **Checkpoint 10**: OPC UA connected!

---

## Part 11: Optional - Add SSL Certificate (30 minutes)

**Only if you have a domain name** (e.g., roams.yourdomain.com)

### Step 11.1: Point Domain to VPS

In your domain registrar (Namecheap, GoDaddy, etc.):
1. Add an **A Record**:
   - Host: `roams` (or `@` for root domain)
   - Value: `YOUR_VPS_IP`
   - TTL: 300

Wait 5-10 minutes for DNS to propagate.

### Step 11.2: Install SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate (replace with your domain)
sudo certbot --nginx -d roams.yourdomain.com

# Follow prompts:
# Email: your@email.com
# Terms: Yes (A)
# Share email: No (N)
# Redirect HTTP to HTTPS: Yes (2)
```

Your site is now accessible at: `https://roams.yourdomain.com` 🔒

---

## Part 12: Monitoring & Maintenance

### Check Service Status

```bash
# Check all services
sudo systemctl status roams-django
sudo systemctl status roams-opcua
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis
```

### View Logs

```bash
# Django logs
sudo journalctl -u roams-django -f

# OPC UA logs
sudo journalctl -u roams-opcua -f

# NGINX access logs
sudo tail -f /var/log/nginx/access.log
```

### Restart Services

```bash
# Restart Django only
sudo systemctl restart roams-django

# Restart everything
sudo systemctl restart roams-django roams-opcua nginx
```

### Update Code from GitHub

```bash
cd /opt/roams

# Pull latest changes
git pull origin main

# Update backend
cd roams_backend
source venv_new/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# Rebuild frontend
cd ../roams_frontend
npm install
npm run build

# Restart services
sudo systemctl restart roams-django roams-opcua

# Clear NGINX cache
sudo systemctl reload nginx
```

---

## Troubleshooting

### Issue: "502 Bad Gateway"

```bash
# Django service crashed
sudo systemctl status roams-django
sudo journalctl -u roams-django -n 50

# Restart
sudo systemctl restart roams-django
```

### Issue: "Can't connect to database"

```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test connection
psql -h localhost -U roams_user -d roams_db

# Check .env file
cat /opt/roams/roams_backend/.env | grep DB_
```

### Issue: "OPC UA not connecting"

```bash
# Check logs
sudo tail -f /var/log/roams/opcua.log

# Verify station config in admin panel
# Check firewall on OPC UA server
# Verify endpoint URL
```

### Issue: Frontend shows blank page

```bash
# Check build
ls -la /opt/roams/roams_frontend/dist/

# Rebuild
cd /opt/roams/roams_frontend
npm run build

# Check NGINX config
sudo nginx -t
sudo systemctl reload nginx
```

---

## Performance Optimization (After Setup)

### Enable NGINX Caching

```bash
sudo nano /etc/nginx/nginx.conf
```

Add inside `http` block:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;
```

### Enable Database Connection Pooling

Already configured in `settings.py`:
```python
DATABASES = {
    'default': {
        'CONN_MAX_AGE': 600,  # 10 minutes
    }
}
```

### Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/roams
```

```
/var/log/roams/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload roams-django > /dev/null 2>&1 || true
    endscript
}
```

---

## Summary Checklist

✅ **Part 1**: Contabo VPS ordered and accessed
✅ **Part 2**: System dependencies installed
✅ **Part 3**: PostgreSQL database created
✅ **Part 4**: Code cloned from GitHub
✅ **Part 5**: Backend configured and tested
✅ **Part 6**: Frontend built
✅ **Part 7**: NGINX configured
✅ **Part 8**: Systemd services running
✅ **Part 9**: Application accessible in browser
✅ **Part 10**: OPC UA stations configured
✅ **Part 11**: SSL certificate (optional)
✅ **Part 12**: Monitoring setup

---

## Next Steps

1. **Configure your OPC UA servers** in the admin panel
2. **Add users** via Django admin
3. **Setup notifications** (email/SMS alerts)
4. **Monitor performance** using the logs
5. **Schedule backups** (database + code)

**Backup Command** (run weekly):
```bash
# Database backup
sudo -u postgres pg_dump roams_db > ~/roams_backup_$(date +%Y%m%d).sql

# Code backup
cd /opt/roams
tar -czf ~/roams_code_$(date +%Y%m%d).tar.gz roams_backend roams_frontend
```

---

## Support

**If you get stuck:**
1. Check the logs (Part 12)
2. Review the troubleshooting section
3. Check `/var/log/roams/` for errors
4. Verify `.env` file has correct values
5. Ensure all services are running: `sudo systemctl status roams-*`

**Estimated Total Time**: 2-3 hours (first deployment)
**Monthly Cost**: ~€5.99 (Contabo VPS M)

🎉 **Congratulations! Your ROAMS system is now live!**
