# ROAMS Production Deployment Guide

## ✅ Pre-Deployment Checklist

This checklist ensures your ROAMS system is production-ready **BEFORE** deploying to Hetzner VPS.

### 🔴 CRITICAL (Must Complete Locally First)

- [x] ✅ Database connection pooling enabled (`CONN_MAX_AGE = 600`)
- [x] ✅ Production security settings added to settings.py
- [x] ✅ API rate limiting configured
- [x] ✅ Redis cache optimized with connection pooling
- [x] ✅ `.env.example` template created
- [ ] 🔧 Generate production SECRET_KEY
- [ ] 🔧 Create actual `.env` file with production values
- [ ] 🔧 Test with `DEBUG=False` locally
- [ ] 🔧 Update frontend build server URL

### 🟡 Important (Do on VPS)

- [ ] SSL certificate setup (Let's Encrypt)
- [ ] Firewall configuration (UFW)
- [ ] PostgreSQL production database
- [ ] NGINX reverse proxy
- [ ] Systemd services
- [ ] Log rotation setup

---

## 📋 Step-by-Step Deployment

### Phase 1: Local Testing (Before VPS)

#### 1.1 Generate Production SECRET_KEY

```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

Copy the output (50-character random string).

#### 1.2 Create Production .env File

```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
cp .env.example .env
nano .env  # Edit with your values
```

**Minimal Production .env:**
```env
DEBUG=False
SECRET_KEY=<paste-generated-key-here>
ALLOWED_HOSTS=your-vps-ip,your-domain.com

DB_NAME=roams_db
DB_USER=roams_user
DB_PASSWORD=<generate-strong-password>
DB_HOST=127.0.0.1
DB_PORT=5432

REDIS_URL=redis://127.0.0.1:6379/0

# Email alerts (configure later if needed)
THRESHOLD_EMAIL_ENABLED=False
```

#### 1.3 Test Locally with Production Settings

```bash
# Still in roams_backend/
python manage.py check --deploy

# Test with DEBUG=False
python manage.py runserver 0.0.0.0:8000 --nothreading --noreload
```

**Expected warnings** you can ignore for now:
- ALLOWED_HOSTS in production (you'll set this to your domain)
- SSL redirect warnings (NGINX will handle this)

#### 1.4 Update Frontend for Production

Edit `roams_frontend/src/services/api.ts`:

```typescript
export const getServerUrl = (): string => {
  // Check localStorage first (user override)
  const stored = localStorage.getItem('roams_server_url');
  if (stored) return stored;
  
  // Production default (CHANGE THIS to your domain)
  if (import.meta.env.PROD) {
    return 'https://your-domain.com';  // ⚠️ UPDATE THIS
  }
  
  // Development default
  return 'http://localhost:8000';
};
```

**Test production build locally:**
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_frontend
npm run build
npm run preview  # Preview production build at http://localhost:4173
```

---

### Phase 2: Provision Hetzner VPS

#### 2.1 Create Hetzner Account & VPS

1. Go to [https://www.hetzner.com/cloud](https://www.hetzner.com/cloud)
2. Create account (requires email + credit card)
3. Create new project: "ROAMS Production"
4. Add server:
   - **Type**: CPX21 (2 vCPU, 4GB RAM, 80GB SSD)
   - **Location**: Nuremberg, Germany (or Helsinki for lower latency to East Africa)
   - **Image**: Ubuntu 22.04 LTS
   - **Name**: roams-prod-01
   - **SSH Key**: Upload your public key (`~/.ssh/id_rsa.pub`)

**Cost**: €7.49/month + €1.50 backup = **€8.99/month total**

#### 2.2 Initial VPS Setup

SSH into your new server:
```bash
ssh root@your-vps-ip
```

**Security hardening:**
```bash
# Update system
apt update && apt upgrade -y

# Create deploy user (don't use root)
adduser deploy
usermod -aG sudo deploy

# Setup SSH for deploy user
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Exit and reconnect as deploy user
exit
ssh deploy@your-vps-ip
```

---

### Phase 3: Deploy Application

#### 3.1 Transfer Code to VPS

On your **local machine**:
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b

# Create deployment package (excludes venv, node_modules, etc.)
tar --exclude='roams_backend/venv_new' \
    --exclude='roams_backend/db.sqlite3' \
    --exclude='roams_backend/logs' \
    --exclude='roams_frontend/node_modules' \
    --exclude='roams_frontend/dist' \
    --exclude='.git' \
    -czf roams_deploy.tar.gz roams_backend roams_frontend deployment .github

# Transfer to VPS
scp roams_deploy.tar.gz deploy@your-vps-ip:/home/deploy/
```

#### 3.2 Extract and Deploy

On **VPS**:
```bash
cd /home/deploy
tar -xzf roams_deploy.tar.gz

# Move to /opt (standard location for applications)
sudo mkdir -p /opt/roams
sudo cp -r roams_backend roams_frontend deployment /opt/roams/
sudo chown -R www-data:www-data /opt/roams
```

#### 3.3 Run Deployment Script

```bash
cd /opt/roams
sudo bash deployment/scripts/deploy.sh first-time
```

This script will:
- Install system dependencies (Python, PostgreSQL, Redis, NGINX)
- Create PostgreSQL database
- Setup Python virtual environment
- Install Python packages
- Build React frontend
- Configure systemd services
- Setup NGINX reverse proxy

**⏱️ Estimated time**: 10-15 minutes

---

### Phase 4: Configure Production Settings

#### 4.1 Edit Environment Variables

```bash
sudo nano /opt/roams/roams_backend/.env
```

Update these values:
```env
SECRET_KEY=<your-generated-key>
ALLOWED_HOSTS=your-vps-ip,your-domain.com,www.your-domain.com
DB_PASSWORD=<strong-database-password>
```

#### 4.2 Update PostgreSQL Password

```bash
sudo -u postgres psql
ALTER USER roams_user WITH PASSWORD 'your-strong-password';
\q
```

Update `.env` with the same password.

#### 4.3 Configure NGINX Domain

```bash
sudo nano /etc/nginx/sites-available/roams
```

Replace `your-domain.com` with your actual domain (or VPS IP for testing).

**Test NGINX config:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### Phase 5: SSL Certificate Setup

#### 5.1 Point Domain to VPS

Before running certbot, ensure:
1. Domain DNS A record points to your VPS IP
2. Wait 5-10 minutes for DNS propagation
3. Test: `dig your-domain.com` should return VPS IP

#### 5.2 Install SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow prompts:
- Enter email for renewal notifications
- Agree to terms
- Choose redirect HTTP to HTTPS: **Yes**

**Certbot will automatically**:
- Obtain SSL certificate from Let's Encrypt
- Update NGINX config
- Setup auto-renewal cron job

**Test SSL**: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

---

### Phase 6: Verify Deployment

#### 6.1 Check Services

```bash
# All should show "active (running)"
sudo systemctl status roams-django.service
sudo systemctl status roams-opcua.service
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis
```

#### 6.2 Create Django Superuser

```bash
cd /opt/roams/roams_backend
sudo -u www-data /opt/roams/venv_new/bin/python manage.py createsuperuser
```

Enter username, email, password.

#### 6.3 Test Endpoints

```bash
# Health check
curl https://your-domain.com/api/

# Admin login
curl -I https://your-domain.com/admin/

# API authentication
curl -X POST https://your-domain.com/api-token-auth/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}'
```

#### 6.4 Configure OPC UA Stations

1. Open admin panel: https://your-domain.com/admin/
2. Login with superuser
3. Add OPC UA client configurations
4. Monitor OPC UA service logs:
   ```bash
   sudo journalctl -u roams-opcua.service -f
   ```

---

## 🚀 Post-Deployment Configuration

### Firewall Setup

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### Log Rotation

Create `/etc/logrotate.d/roams`:
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
        systemctl reload roams-django.service > /dev/null 2>&1 || true
    endscript
}
```

### Automated Backups

Create backup script `/opt/roams/scripts/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/opt/roams/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
sudo -u postgres pg_dump roams_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
```

Add to crontab:
```bash
sudo crontab -e
# Daily backup at 2 AM
0 2 * * * /opt/roams/scripts/backup.sh
```

### Email Notifications

Update `.env`:
```env
THRESHOLD_EMAIL_ENABLED=True
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password  # Use app-specific password
THRESHOLD_CRITICAL_EMAILS=admin@your-domain.com
```

Restart Django:
```bash
sudo systemctl restart roams-django.service
```

---

## 🔧 Maintenance & Updates

### Update Application Code

On **local machine**, prepare update:
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b
tar --exclude='roams_backend/venv_new' \
    --exclude='roams_frontend/node_modules' \
    -czf roams_update.tar.gz roams_backend roams_frontend
scp roams_update.tar.gz deploy@your-vps-ip:/tmp/
```

On **VPS**:
```bash
cd /tmp
tar -xzf roams_update.tar.gz
sudo cp -r roams_backend/* /opt/roams/roams_backend/
sudo cp -r roams_frontend/* /opt/roams/roams_frontend/
sudo chown -R www-data:www-data /opt/roams

# Run update deployment
cd /opt/roams
sudo bash deployment/scripts/deploy.sh update
```

### View Logs

```bash
# Django application logs
sudo journalctl -u roams-django.service -f

# OPC UA service logs
sudo journalctl -u roams-opcua.service -f

# NGINX access logs
sudo tail -f /var/log/nginx/roams-access.log

# NGINX error logs
sudo tail -f /var/log/nginx/roams-error.log

# Application logs
sudo tail -f /var/log/roams/error.log
```

### Database Maintenance

```bash
# Connect to database
sudo -u postgres psql roams_db

# Check database size
SELECT pg_size_pretty(pg_database_size('roams_db'));

# Vacuum analyze (monthly)
VACUUM ANALYZE;
```

---

## 💰 Cost Summary

| Item | Provider | Monthly Cost |
|------|----------|--------------|
| VPS Server (CPX21) | Hetzner | €7.49 |
| Automated Backups | Hetzner | €1.50 |
| Domain Name | Namecheap | €1.00 |
| SSL Certificate | Let's Encrypt | **FREE** |
| **TOTAL** | | **€9.99/month** |

**Annual Cost**: ~€120 (~$128 USD)

---

## 🆘 Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
sudo journalctl -u roams-django.service -n 50

# Common issues:
# 1. Missing .env file
# 2. Database connection refused (check PostgreSQL)
# 3. Permission errors (check www-data ownership)
```

### 502 Bad Gateway

```bash
# Check if Django is running
sudo systemctl status roams-django.service

# Check socket file exists
ls -l /run/roams.sock

# Restart services
sudo systemctl restart roams-django.service
sudo systemctl reload nginx
```

### OPC UA Connection Failed

```bash
# Check OPC UA service logs
sudo journalctl -u roams-opcua.service -f

# Verify OPC UA server is reachable from VPS
# (may need to whitelist VPS IP on station firewall)
```

### High CPU/Memory Usage

```bash
# Monitor resources
htop

# Check Gunicorn workers
ps aux | grep gunicorn

# Reduce workers if needed (edit systemd service)
sudo nano /etc/systemd/system/roams-django.service
# Change --workers 4 to --workers 2
sudo systemctl daemon-reload
sudo systemctl restart roams-django.service
```

---

## 📞 Support & Resources

- **Django Deployment Checklist**: https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/
- **Hetzner Docs**: https://docs.hetzner.com/
- **Let's Encrypt**: https://letsencrypt.org/getting-started/
- **NGINX Config**: https://nginx.org/en/docs/

---

## ✅ Post-Deployment Checklist

After deployment is complete, verify:

- [ ] Site loads over HTTPS (no certificate warnings)
- [ ] Login works correctly
- [ ] Admin panel accessible
- [ ] API endpoints respond
- [ ] OPC UA stations connecting successfully
- [ ] Alarms logging correctly
- [ ] Dashboard updating in real-time
- [ ] Email notifications working (if configured)
- [ ] Backups running daily
- [ ] SSL certificate auto-renewal enabled
- [ ] Firewall configured correctly
- [ ] All services start automatically on reboot

**Test reboot:**
```bash
sudo reboot
# Wait 2 minutes, then check all services
ssh deploy@your-domain.com
sudo systemctl status roams-django roams-opcua nginx postgresql redis
```

---

**🎉 Congratulations! Your ROAMS system is now production-ready and deployed!**
