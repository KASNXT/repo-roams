# 🚨 VPS Fix Guide - Django Service Issue
**Date**: February 9, 2026  
**Issue**: Django service stuck in "activating" state, causing 502 errors  
**VPS IP**: 144.91.79.167

---

## 🎯 Quick Fix (5 minutes)

### Step 1: SSH into VPS
```bash
ssh root@144.91.79.167
```
Enter your password when prompted.

### Step 2: Check Django Service Status
```bash
systemctl status roams-django
```

### Step 3: Check Recent Logs (See what's wrong)
```bash
journalctl -u roams-django -n 50 --no-pager
```

### Step 4: Stop the Service
```bash
systemctl stop roams-django
```

### Step 5: Kill Any Hanging Processes
```bash
# Check if port 8000 is in use
ss -tuln | grep :8000

# If port is in use, kill the process
lsof -ti:8000 | xargs kill -9 2>/dev/null
```

### Step 6: Start Django Service
```bash
systemctl start roams-django
```

### Step 7: Verify It's Working
```bash
# Check service status
systemctl status roams-django

# Should show "active (running)" in green

# Test the API
curl http://localhost:8000/api/
# Should return JSON, not HTML error
```

### Step 8: Test from Browser
Open in browser: **http://144.91.79.167/api/**  
You should see: `{"message": "ROAMS API"}` or authentication error (not 502)

---

## 🔧 If Above Doesn't Work - Complete Reset

### Option A: Restart with Fresh Environment Check

```bash
# Go to backend directory
cd /opt/roams/roams_backend

# Activate virtual environment
source venv_new/bin/activate

# Check for migrations
python manage.py migrate

# Check if Django can start manually
python manage.py check --deploy
```

If you see errors, note them and we'll fix them.

### Option B: Check Database Connection

```bash
# Test PostgreSQL
systemctl status postgresql

# Test database connection
psql -h localhost -U roams_user -d roams_db -c "SELECT 1;"
# Enter password when prompted: MBHA.123
```

### Option C: Check Environment Variables

```bash
cd /opt/roams/roams_backend
cat .env | grep -E "DB_|SECRET_KEY|DEBUG"
```

Make sure these exist:
- `DB_NAME=roams_db` (or similar)
- `DB_USER=roams_user`
- `DB_PASSWORD=MBHA.123`
- `DB_HOST=localhost`
- `SECRET_KEY=...`
- `DEBUG=False`

### Option D: Rebuild and Restart Everything

```bash
cd /opt/roams/roams_backend

# Pull latest code (if using git)
# git pull origin main

# Install/update dependencies
source venv_new/bin/activate
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Restart Django service
systemctl restart roams-django

# Wait 10 seconds
sleep 10

# Check status
systemctl status roams-django
```

---

## 🔍 Fix OPC UA Service (After Django is Working)

```bash
# Check OPC UA service
systemctl status roams-opcua

# Check logs
journalctl -u roams-opcua -n 50 --no-pager

# Restart
systemctl restart roams-opcua

# Verify
systemctl is-active roams-opcua
```

---

## ✅ Verification Checklist

After fixing, verify everything works:

1. **Django Service**
```bash
systemctl is-active roams-django
# Should output: active
```

2. **API Response**
```bash
curl http://localhost:8000/api/
# Should return JSON (not 502 error)
```

3. **External Access**
```bash
curl http://144.91.79.167/api/
# Should work from outside VPS
```

4. **Frontend**
- Open: http://144.91.79.167
- Should show ROAMS login page

5. **OPC UA Service**
```bash
systemctl is-active roams-opcua
# Should output: active or activating
```

---

## 🚀 Common Error Solutions

### Error: "can't connect to database"
```bash
# Check PostgreSQL is running
systemctl status postgresql
systemctl start postgresql

# Verify database exists
sudo -u postgres psql -l | grep roams
```

### Error: "port 8000 already in use"
```bash
# Find what's using port 8000
lsof -i:8000

# Kill it
lsof -ti:8000 | xargs kill -9
```

### Error: "migrations not applied"
```bash
cd /opt/roams/roams_backend
source venv_new/bin/activate
python manage.py migrate
```

### Error: "SECRET_KEY not set"
```bash
cd /opt/roams/roams_backend
# Check .env file exists
ls -la .env

# If missing, create from example
cp .env.example .env
nano .env
# Add your SECRET_KEY, DB credentials, etc.
```

---

## 📊 Service Management Commands

### View All Service Status
```bash
systemctl status roams-django roams-opcua nginx postgresql redis
```

### Restart All Services
```bash
systemctl restart roams-django roams-opcua nginx
```

### View Live Logs
```bash
# Django logs (live)
journalctl -u roams-django -f

# OPC UA logs (live)
journalctl -u roams-opcua -f

# All roams services
journalctl -u roams-* -f
```

### Enable Auto-restart on Failure
```bash
# Edit Django service file
systemctl edit roams-django

# Add these lines:
[Service]
Restart=always
RestartSec=10

# Save and reload
systemctl daemon-reload
systemctl restart roams-django
```

---

## 🔒 Security Recommendation

After fixing, set up SSH key authentication:

**On your local WSL:**
```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096

# Copy to VPS
ssh-copy-id root@144.91.79.167
```

Now you can SSH without password!

---

## 📞 Next Steps After Fix

1. **Monitor for 24 hours** - Make sure service stays up
2. **Set up monitoring alerts** - Get notified if service crashes
3. **Configure automatic backups** - Daily database backups
4. **Review logs periodically** - Check for errors/warnings

---

## 🆘 If Nothing Works

If the service still won't start after trying everything:

1. **Copy the full error log:**
```bash
journalctl -u roams-django -n 200 --no-pager > /tmp/django_error.log
cat /tmp/django_error.log
```

2. **Share the error** - Copy the output and we'll diagnose together

3. **Last resort - Fresh deployment:**
   - Consider redeploying from scratch using CONTABO_VPS_DEPLOYMENT.md
   - Backup database first: `pg_dump roams_db > backup.sql`

---

**Good luck! The most common fix is Step 4-6 (stop, kill processes, start).**
