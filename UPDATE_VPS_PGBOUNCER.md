# Update VPS with PgBouncer Implementation

## Step 1: SSH into VPS

```bash
ssh root@144.91.79.167
```

## Step 2: Navigate to Project and Pull Changes

```bash
cd /opt/roams
git pull origin main
```

**Expected output:**
```
Updating 97e65482..86ca1543
Fast-forward
 10 files changed, 2443 insertions(+)
 create mode 100644 PGBOUNCER_IMPLEMENTATION_GUIDE.md
 create mode 100644 PGBOUNCER_QUICK_REFERENCE.md
 create mode 100644 pgbouncer/install_pgbouncer.sh
 ...
```

## Step 3: Install PgBouncer

```bash
cd /opt/roams/pgbouncer
chmod +x *.sh
sudo ./install_pgbouncer.sh
```

**This script will:**
- ✅ Install PgBouncer package
- ✅ Create configuration files in `/etc/pgbouncer/`
- ✅ Read database credentials from `roams_backend/.env`
- ✅ Create systemd service
- ✅ Start PgBouncer on port 6432

## Step 4: Configure Django to Use PgBouncer

```bash
cd /opt/roams/roams_backend
nano .env
```

**Add or update this line:**
```bash
DB_PORT=6432
```

Save: `Ctrl+X`, `Y`, `Enter`

## Step 5: Restart Django Backend

```bash
sudo systemctl restart roams_backend
sudo systemctl status roams_backend
```

**Check for:**
- ✅ `Active: active (running)`
- ✅ No error messages

## Step 6: Test PgBouncer Connection

```bash
cd /opt/roams/pgbouncer
./test_pgbouncer.sh
```

**Expected results:**
```
✓ PgBouncer service is running
✓ Port 6432 is listening
✓ Successfully connected to database via PgBouncer
✓ PostgreSQL is accessible directly
✓ Admin console accessible
✓ Pool is healthy
```

## Step 7: Monitor Connection Pool

```bash
cd /opt/roams/roams_backend
python3 monitor_pgbouncer.py --once
```

**You should see:**
- Client connections: Active from Django + OPC UA threads
- Server connections: ~5-15 active, rest idle (max 25)
- No clients waiting

## Step 8: Verify OPC UA Connections Still Work

```bash
cd /opt/roams/roams_backend
source venv_new/bin/activate
python diagnose_opcua.py
```

**Check:**
- ✅ All stations still connecting
- ✅ Data being read normally
- ✅ No connection errors

## Step 9: Run Performance Benchmark (Optional)

```bash
cd /opt/roams/roams_backend
python3 benchmark_pgbouncer.py
```

**Expected:**
- PgBouncer connection time: ~0.8ms
- Direct PostgreSQL: ~3.5ms
- **76% faster with PgBouncer!**

---

## Troubleshooting

### If PgBouncer Fails to Start

```bash
# Check logs
sudo journalctl -u pgbouncer -n 50

# Check configuration
sudo cat /etc/pgbouncer/pgbouncer.ini
sudo cat /etc/pgbouncer/userlist.txt

# Restart
sudo systemctl restart pgbouncer
```

### If Django Can't Connect

```bash
# Check Django is using correct port
grep DB_PORT /opt/roams/roams_backend/.env

# Test connection manually
psql -h 127.0.0.1 -p 6432 -U postgres -d roams_db -c "SELECT version();"

# Check Django logs
sudo journalctl -u roams_backend -n 50
```

### Rollback to Direct PostgreSQL

```bash
# Edit .env
nano /opt/roams/roams_backend/.env
# Change: DB_PORT=5432

# Restart Django
sudo systemctl restart roams_backend
```

---

## Verification Checklist

After installation, verify:

- [ ] PgBouncer service running: `systemctl status pgbouncer`
- [ ] Port 6432 listening: `netstat -tln | grep 6432`
- [ ] Django backend running: `systemctl status roams_backend`
- [ ] OPC UA stations connected: `python diagnose_opcua.py`
- [ ] No errors in logs: `journalctl -u pgbouncer -n 20`
- [ ] Pool health good: `python3 monitor_pgbouncer.py --once`

---

## Monitoring Commands

```bash
# Real-time monitoring (refreshes every 5 seconds)
python3 /opt/roams/roams_backend/monitor_pgbouncer.py

# One-time status check
python3 /opt/roams/roams_backend/monitor_pgbouncer.py --once

# View PgBouncer logs
sudo tail -f /var/log/pgbouncer/pgbouncer.log

# Admin console
psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer
# Inside console: SHOW POOLS; SHOW SERVERS; SHOW STATS;
```

---

## Production Notes

**After successful installation:**

1. **Add to monitoring**: Set up cron job for health checks
   ```bash
   # Add to crontab
   */5 * * * * /opt/roams/pgbouncer/test_pgbouncer.sh > /var/log/pgbouncer/health_check.log 2>&1
   ```

2. **Update systemd dependencies**: Ensure roams_backend.service requires pgbouncer.service
   ```bash
   sudo nano /etc/systemd/system/roams_backend.service
   # Add under [Unit]:
   # Requires=pgbouncer.service
   # After=pgbouncer.service
   sudo systemctl daemon-reload
   ```

3. **Backup configuration**:
   ```bash
   sudo cp /etc/pgbouncer/pgbouncer.ini /opt/roams/backups/
   sudo cp /etc/pgbouncer/userlist.txt /opt/roams/backups/
   ```

---

**Ready to proceed?** Start with Step 1: SSH into your VPS! 🚀
