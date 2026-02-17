# Django Stability Safeguards - Deployment Guide

## What This Fixes
Prevents Django from becoming unresponsive (hanging) by implementing:
1. **Auto-restart on crash** - Systemd will restart Django if it crashes
2. **Health monitoring** - Script checks Django every 2 minutes
3. **Auto-recovery** - Automatically restarts Django if it stops responding
4. **Memory protection** - Prevents memory leaks from crashing the server

## Quick Deployment

### Step 1: Upload Files to VPS
```bash
# From your local machine (in /mnt/d/DJANGO_PROJECTS/roams_b/)
scp roams_backend/roams_api/health_views.py root@144.91.79.167:/opt/roams/roams_backend/roams_api/
scp roams_backend/roams_pro/urls.py root@144.91.79.167:/opt/roams/roams_backend/roams_pro/
scp deployment/deploy_safeguards.sh root@144.91.79.167:/tmp/
```

### Step 2: Run Deployment Script on VPS
```bash
# SSH to VPS
ssh root@144.91.79.167

# Make script executable and run it
chmod +x /tmp/deploy_safeguards.sh
/tmp/deploy_safeguards.sh
```

That's it! The script will:
- Update systemd service with auto-restart
- Install health monitoring script
- Set up cron job to check Django every 2 minutes
- Restart Django with new configuration

## Verification

### Test Health Check Endpoint
```bash
# On VPS
curl http://localhost:8000/health/

# Expected response:
# {"status":"healthy","timestamp":"2026-02-07T17:30:00+03:00","service":"roams-django"}
```

### Monitor the Logs
```bash
# Watch monitoring in real-time
tail -f /var/log/roams-django-monitor.log

# Check Django service status
systemctl status roams-django
```

### Test Auto-Restart
```bash
# Simulate Django hang by killing the process
pkill -9 python

# Wait 10 seconds, Django should auto-restart
sleep 10
systemctl status roams-django  # Should show "Active: active (running)"
```

## How It Works

### 1. Systemd Auto-Restart (immediate crashes)
- **Restart=always** - Always restart if Django exits
- **RestartSec=10** - Wait 10 seconds between restarts
- **StartLimitBurst=5** - Allow up to 5 restarts in 5 minutes
- **TimeoutStopSec=30** - Force kill if Django doesn't stop in 30s

### 2. Health Monitoring (hung processes)
- Cron runs `/opt/roams/scripts/monitor_django.sh` every 2 minutes
- Script checks `http://localhost:8000/health/`
- After 2 consecutive failures (4 minutes), restarts Django
- Logs all actions to `/var/log/roams-django-monitor.log`

### 3. Memory Protection
- **MemoryMax=500M** - Kill Django if it uses more than 500MB
- **MemoryHigh=400M** - Start throttling at 400MB
- Prevents memory leaks from crashing the entire server

## Monitoring Commands

```bash
# Check if Django is responding
curl http://localhost:8000/health/

# View recent monitoring activity
tail -20 /var/log/roams-django-monitor.log

# See Django uptime
systemctl status roams-django | grep Active

# Check cron is running
crontab -l | grep monitor_django

# Manual restart if needed
systemctl restart roams-django
```

## What Happens When Django Hangs

**Timeline:**
1. **Minute 0**: Django stops responding (HTTP 000 error)
2. **Minute 2**: Monitor detects failure #1
3. **Minute 4**: Monitor detects failure #2 → **Auto-restarts Django**
4. **Minute 6**: Health check confirms Django is back online

**In Logs:**
```
2026-02-07 17:00:00 - ⚠️ Django health check failed (HTTP 000) - Failure 1/2
2026-02-07 17:02:00 - ⚠️ Django health check failed (HTTP 000) - Failure 2/2
2026-02-07 17:02:00 - 🔄 Restarting Django service...
2026-02-07 17:02:05 - ✅ Django restarted successfully
```

## Troubleshooting

### Health check returns 404
```bash
# Verify urls.py and health_views.py are uploaded
ls -l /opt/roams/roams_backend/roams_api/health_views.py
grep "health_check" /opt/roams/roams_backend/roams_pro/urls.py

# Restart Django to reload URLs
systemctl restart roams-django
```

### Cron not running
```bash
# Check cron service
systemctl status cron

# Verify crontab entry
crontab -l

# Run monitor script manually
/opt/roams/scripts/monitor_django.sh
```

### Too many restarts
```bash
# Check monitoring log for patterns
grep "Restarting Django" /var/log/roams-django-monitor.log

# If restarting too often, increase MAX_FAILURES in monitor script
nano /opt/roams/scripts/monitor_django.sh
# Change: MAX_FAILURES=3  (instead of 2)
```

## Files Created/Modified

### VPS Files:
- `/etc/systemd/system/roams-django.service` - Updated with auto-restart
- `/opt/roams/scripts/monitor_django.sh` - Health monitoring script
- `/opt/roams/roams_backend/roams_api/health_views.py` - Health endpoints
- `/opt/roams/roams_backend/roams_pro/urls.py` - Added health URLs
- `/var/log/roams-django-monitor.log` - Monitoring log file
- Crontab entry for monitoring

### Local Files (for reference):
- `deployment/roams-django-with-restart.service`
- `deployment/monitor_django.sh`
- `deployment/deploy_safeguards.sh`
- `deployment/DEPLOYMENT_INSTRUCTIONS.md` (this file)

## Next Steps (Optional - Long Term)

For even better stability, consider:

1. **Switch to Gunicorn** (production WSGI server)
   - Handles multiple workers
   - Better concurrency
   - Self-healing workers

2. **Add Prometheus monitoring**
   - Real-time metrics
   - Historical trends
   - Alert notifications

3. **Set up log rotation**
   ```bash
   # Prevent logs from filling disk
   nano /etc/logrotate.d/roams-django
   ```

## Support

If Django keeps failing after deployment:
- Check `/var/log/roams-django-monitor.log` for patterns
- Review Django logs: `journalctl -u roams-django -n 100`
- Check OPC UA threads: Look for deadlocks in logs
- Consider current memory usage: `systemctl status roams-django`
