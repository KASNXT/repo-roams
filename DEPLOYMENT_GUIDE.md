# 🚀 MIGRATION & DEPLOYMENT GUIDE

## Pre-Deployment Steps

### 1. Backup Your Database ⚠️
```bash
# PostgreSQL
pg_dump roams_db > roams_db_backup_$(date +%Y%m%d_%H%M%S).sql

# SQLite
cp db.sqlite3 db.sqlite3.backup_$(date +%Y%m%d_%H%M%S)
```

### 2. Pull Latest Code
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b
git pull origin main  # or your branch
```

---

## Database Migration

### Step 1: Create Migrations
```bash
cd roams_backend
python manage.py makemigrations roams_opcua_mgr
```

**Expected Output:**
```
Migrations for 'roams_opcua_mgr':
  roams_opcua_mgr/migrations/XXXX_auto_YYYYMMDD_HHMMSS.py
    - Add field sampling_interval to opcuanode
    - Add field last_whole_number to opcuanode
    - Add field sample_on_whole_number_change to opcuanode
    - Create model AlarmRetentionPolicy
    - Create model NotificationSchedule
```

### Step 2: Review Migration File (optional)
```bash
cat roams_opcua_mgr/migrations/XXXX_auto_YYYYMMDD_HHMMSS.py
```

Verify it contains:
- OPCUANode field additions
- AlarmRetentionPolicy model creation
- NotificationSchedule model creation

### Step 3: Apply Migration
```bash
python manage.py migrate roams_opcua_mgr
```

**Expected Output:**
```
Operations to perform:
  Apply all migrations: roams_opcua_mgr
Running migrations:
  Applying roams_opcua_mgr.XXXX_auto_YYYYMMDD_HHMMSS ... OK
```

### Step 4: Verify Migration
```bash
python manage.py migrate --plan roams_opcua_mgr
```

Should show "No planned migration operations."

---

## Post-Migration Setup

### 1. Initialize Alarm Retention Policy
```bash
cd roams_backend
python manage.py shell
```

In the Python shell:
```python
from roams_opcua_mgr.models import AlarmRetentionPolicy

# Get or create default policy
policy = AlarmRetentionPolicy.get_policy()
print(f"Policy created with {policy.alarm_log_retention_days} days retention")
exit()
```

### 2. (Optional) Run Initial Cleanup
```bash
python manage.py cleanup_old_alarms
```

Output:
```
✅ Cleanup complete:
   - Deleted 0 alarm logs (older than 90 days)
   - Deleted 0 threshold breaches (older than 90 days)
```

### 3. Create Superuser (if needed)
```bash
python manage.py createsuperuser
```

---

## Frontend Deployment

### 1. Install Dependencies
```bash
cd roams_frontend
npm install
```

### 2. Build for Production
```bash
npm run build
```

**Output:**
```
✓ 2457 modules transformed by 124 plugins
  vite v5.x.x build for production
  ✓ 1,234 modules transformed.
  dist/index.html                          0.00 kB │ gzip:   0.00 kB
  dist/assets/index-abc123.js           1,234.56 kB │ gzip: 345.67 kB
```

### 3. Deploy Static Files (if using Django)
```bash
cd roams_backend
python manage.py collectstatic --noinput
```

---

## Testing Post-Deployment

### 1. API Health Check
```bash
curl -X GET http://localhost:8000/api/ \
  -H "Authorization: Token YOUR_TOKEN"
```

Should return 200 with API endpoints list.

### 2. Test Alarm Endpoints
```bash
# List alarms
curl -X GET http://localhost:8000/api/alarms/ \
  -H "Authorization: Token YOUR_TOKEN"

# Get retention policy
curl -X GET http://localhost:8000/api/alarm-retention-policy/ \
  -H "Authorization: Token YOUR_TOKEN"
```

### 3. Test Frontend
```bash
# Development
npm run dev

# Production (requires build)
npm run build
npm run preview
```

Navigate to:
- `http://localhost:5173` (frontend)
- Settings → Alarm Retention (verify new tab visible)
- Notifications (verify real-time updates)
- Analysis (verify AlarmBanner visible)

---

## Configuration

### 1. Email/SMTP Setup (Optional)
In `roams_backend/roams_pro/settings.py`:
```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'your-smtp-server'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@example.com'
EMAIL_HOST_PASSWORD = 'your-password'
DEFAULT_FROM_EMAIL = 'alerts@roams.local'
```

### 2. Twilio Setup (Optional, for SMS)
In `roams_backend/roams_pro/settings.py`:
```python
THRESHOLD_SMS_ENABLED = True
TWILIO_ACCOUNT_SID = 'your-account-sid'
TWILIO_AUTH_TOKEN = 'your-auth-token'
TWILIO_PHONE_FROM = '+1234567890'
```

### 3. Notification Schedule (Optional)
In `roams_backend/roams_opcua_mgr/notifications.py`:
```python
# Default interval - change if needed:
'interval': '1hour',  # or '15min', '30min', '4hours', 'daily'
```

---

## Scheduling Auto-Cleanup

### Linux/Mac - Crontab
```bash
# Edit crontab
crontab -e

# Add this line for 2 AM daily cleanup:
0 2 * * * cd /path/to/roams_backend && /path/to/venv/bin/python manage.py cleanup_old_alarms >> /var/log/roams_cleanup.log 2>&1
```

### Windows - Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 2:00 AM
4. Set action: Run program
   - Program: `C:\path\to\venv\Scripts\python.exe`
   - Arguments: `manage.py cleanup_old_alarms`
   - Start in: `C:\path\to\roams_backend`

### Docker - Cron Container
```dockerfile
FROM python:3.10

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . /app
WORKDIR /app

# Install cron
RUN apt-get update && apt-get install -y cron

# Add cron job
RUN echo "0 2 * * * cd /app/roams_backend && python manage.py cleanup_old_alarms" | crontab -

CMD ["cron", "-f"]
```

---

## Troubleshooting

### Migration Errors

**Error: "No changes detected"**
```bash
# Check if migrations already applied
python manage.py showmigrations roams_opcua_mgr
```

**Error: "Foreign key constraint failed"**
- Backup and restore database
- Delete migration file
- Try again

**Error: "ModuleNotFoundError"**
```bash
# Install missing dependencies
pip install -r requirements.txt
```

---

### API Not Responding

**Check Django is running:**
```bash
curl -X GET http://localhost:8000/api/home/
```

**Check logs:**
```bash
tail -f roams_backend/logs/debug.log
```

**Restart Django:**
```bash
# Development
python manage.py runserver

# Production (with gunicorn)
gunicorn roams_pro.wsgi:application --bind 0.0.0.0:8000
```

---

### Frontend Not Showing Changes

**Clear cache:**
```bash
# Browser DevTools
Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
```

**Hard reload:**
```
Ctrl+F5 (or Cmd+Shift+R on Mac)
```

**Clear npm cache:**
```bash
npm cache clean --force
npm install
```

---

### Alarms Not Appearing

**Check alarms in database:**
```bash
python manage.py shell
>>> from roams_opcua_mgr.models import AlarmLog
>>> AlarmLog.objects.count()
0
```

**Check API endpoint:**
```bash
curl -X GET http://localhost:8000/api/alarms/ \
  -H "Authorization: Token YOUR_TOKEN"
```

**Check logs:**
```bash
grep -i "alarm\|breach" roams_backend/logs/debug.log
```

---

## Rollback Plan

If something goes wrong:

### 1. Restore Database
```bash
# PostgreSQL
psql roams_db < roams_db_backup_YYYYMMDD_HHMMSS.sql

# SQLite
cp db.sqlite3.backup_YYYYMMDD_HHMMSS db.sqlite3
```

### 2. Revert Code
```bash
cd /mnt/d/DJANGO_PROJECTS/roams_b
git revert HEAD
git push
```

### 3. Restart Services
```bash
# Stop services
docker-compose down  # or systemctl stop

# Restart
docker-compose up    # or systemctl start
```

---

## Post-Deployment Checklist

- [ ] Database backup successful
- [ ] Migrations applied without errors
- [ ] AlarmRetentionPolicy initialized
- [ ] Frontend builds successfully
- [ ] API endpoints responding
- [ ] Alarm Banner visible on Analysis page
- [ ] Notifications page shows alarms
- [ ] Settings → Alarm Retention tab visible
- [ ] Can modify retention settings
- [ ] Manual cleanup works
- [ ] Email/SMS configured (if applicable)
- [ ] Cron job scheduled (if applicable)
- [ ] Logs monitored for errors

---

## Performance Tuning (Optional)

### Database Indexes
```python
# Already included in migration, but verify:
python manage.py sqlmigrate roams_opcua_mgr XXXX | grep CREATE
```

### Cache Configuration
```python
# In settings.py (optional)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

### Celery Tasks (Optional)
```bash
pip install celery
celery -A roams_pro worker -l info
```

---

## Support

For issues or questions:
1. Check logs: `roams_backend/logs/debug.log`
2. Check documentation: `ALARM_MANAGEMENT_GUIDE.md`
3. Review API docs: `API_REFERENCE.md`
4. Check implementation: `IMPLEMENTATION_COMPLETE.md`

---

**Deployment Date**: [Your Date]
**Deployed By**: [Your Name]
**Status**: ✅ Ready for Production
