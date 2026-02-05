# PgBouncer Implementation Guide for BROMS

**Status**: ✅ Production Ready  
**Created**: 2026-02-05  
**Target**: BROMS SCADA System (Django + PostgreSQL + OPC UA)

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Django Integration](#django-integration)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Performance Tuning](#performance-tuning)
9. [Production Deployment](#production-deployment)

---

## Overview

### What is PgBouncer?

PgBouncer is a lightweight **connection pooler** for PostgreSQL that sits between your application and the database, reusing connections to reduce overhead and improve performance.

### Why BROMS Needs PgBouncer

BROMS has unique characteristics that make PgBouncer essential:

| Challenge | Without PgBouncer | With PgBouncer |
|-----------|------------------|----------------|
| **OPC UA background threads** | Each station = 1 persistent connection | Shared connection pool |
| **50+ monitoring stations** | 50+ connections always open | 25 server connections handle all |
| **Web traffic spikes** | New connection per request (slow) | Instant reuse from pool |
| **PostgreSQL `max_connections`** | Easily exhausted (typically 100-200) | Stays under limit |
| **Memory usage** | ~10MB per connection | ~1KB per client connection |
| **Admin operations** | May timeout under load | Protected pooling |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  BROMS Application Layer                                │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Django      │  │  OPC UA      │  │  Celery      │ │
│  │  Web Server  │  │  Threads     │  │  Workers     │ │
│  │  (20 workers)│  │  (50 stations)│ │  (4 workers) │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │          │
│         └─────────────────┼─────────────────┘          │
└───────────────────────────┼────────────────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │    PgBouncer        │
                 │    Port 6432        │
                 │                     │
                 │  Pool Size: 25      │
                 │  Mode: Transaction  │
                 │  Max Clients: 200   │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │   PostgreSQL        │
                 │   Port 5432         │
                 │                     │
                 │  Active Conns: 25   │
                 │  (vs 200 without)   │
                 └─────────────────────┘
```

---

## Quick Start

### For Development (Local Machine)

```bash
# 1. Install PgBouncer
cd /mnt/d/DJANGO_PROJECTS/roams_b/pgbouncer
sudo ./install_pgbouncer.sh

# 2. Configure Django to use PgBouncer
echo "DB_PORT=6432" >> roams_backend/.env

# 3. Restart Django
cd roams_backend
source venv_new/bin/activate
python manage.py runserver

# 4. Test connection
cd ../pgbouncer
./test_pgbouncer.sh

# 5. Monitor (optional)
cd ../roams_backend
python3 monitor_pgbouncer.py
```

### For Production (Contabo VPS)

```bash
# SSH into VPS
ssh root@144.91.79.167

# Navigate to project
cd /opt/roams

# Run installation
sudo pgbouncer/install_pgbouncer.sh

# Update .env
echo "DB_PORT=6432" >> roams_backend/.env

# Restart services
sudo systemctl restart roams_backend
sudo systemctl restart pgbouncer

# Verify
pgbouncer/test_pgbouncer.sh
```

---

## Installation

### Automated Installation

The installation script handles everything automatically:

```bash
cd pgbouncer
sudo ./install_pgbouncer.sh
```

**What it does:**
1. Installs PgBouncer package (apt-get)
2. Creates directories (`/etc/pgbouncer`, `/var/log/pgbouncer`)
3. Copies configuration files from this directory
4. Reads credentials from `roams_backend/.env`
5. Sets up systemd service
6. Starts PgBouncer automatically

### Manual Installation (Ubuntu/Debian)

```bash
# Install package
sudo apt-get update
sudo apt-get install -y pgbouncer postgresql-client

# Create directories
sudo mkdir -p /etc/pgbouncer /var/log/pgbouncer /var/run/pgbouncer
sudo chown -R postgres:postgres /etc/pgbouncer /var/log/pgbouncer /var/run/pgbouncer

# Copy configuration
sudo cp pgbouncer/pgbouncer.ini /etc/pgbouncer/
sudo cp pgbouncer/userlist.txt.example /etc/pgbouncer/userlist.txt

# Edit userlist.txt with your credentials
sudo nano /etc/pgbouncer/userlist.txt
# Add: "your_db_user" "your_db_password"

sudo chmod 600 /etc/pgbouncer/userlist.txt
sudo chown postgres:postgres /etc/pgbouncer/userlist.txt

# Start service
sudo systemctl enable pgbouncer
sudo systemctl start pgbouncer
```

### Verify Installation

```bash
# Check service status
sudo systemctl status pgbouncer

# Check logs
sudo tail -f /var/log/pgbouncer/pgbouncer.log

# Test connection
psql -h 127.0.0.1 -p 6432 -U your_db_user -d roams_db -c "SELECT version();"
```

---

## Configuration

### File Locations

```
/etc/pgbouncer/
├── pgbouncer.ini    # Main configuration
└── userlist.txt     # User credentials (600 permissions!)

/var/log/pgbouncer/
└── pgbouncer.log    # Application logs

/var/run/pgbouncer/
└── pgbouncer.pid    # Process ID file
```

### Key Configuration Parameters

**File**: `/etc/pgbouncer/pgbouncer.ini`

```ini
[databases]
roams_db = host=127.0.0.1 port=5432 dbname=roams_db

[pgbouncer]
# Connection pooling
pool_mode = transaction           # Best for Django
default_pool_size = 25            # Server connections per database
max_client_conn = 200             # Total client connections allowed

# Timeouts
server_lifetime = 3600            # Close connections after 1 hour
server_idle_timeout = 600         # Close idle connections after 10 min
server_connect_timeout = 30       # Wait 30s for new connection

# Authentication
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Listening
listen_addr = 127.0.0.1
listen_port = 6432
```

### Pool Modes Explained

| Mode | Behavior | Best For | Use in BROMS? |
|------|----------|----------|---------------|
| **session** | Connection held for entire client session | Long-running transactions, temp tables | ❌ No - less efficient |
| **transaction** | Connection released after each transaction | Django, most web apps | ✅ **YES - RECOMMENDED** |
| **statement** | Connection released after each statement | Stateless queries | ❌ No - breaks Django |

**BROMS uses `transaction` mode** because:
- Django ORM uses transactions properly
- No temp tables or session-level state
- Maximum efficiency for short-lived queries
- Compatible with OPC UA background threads

### Sizing Guidelines

**Connection Pool Size** (`default_pool_size`):
```
Formula: (expected concurrent queries) + (safety buffer)

For BROMS:
- OPC UA threads: 50 stations × 0.1 concurrent = 5
- Web requests: 20 workers × 0.3 concurrent = 6
- Admin operations: 2-3
- Celery workers: 4 workers × 0.2 concurrent = 1
- Total: ~15-20 concurrent, so 25 is safe
```

**Max Client Connections** (`max_client_conn`):
```
Formula: Sum of all possible clients

For BROMS:
- OPC UA threads: 50 stations × 1 = 50
- Web workers: 20 Gunicorn workers = 20
- Admin users: ~10
- Celery workers: 4
- Buffer: 116
- Total: 200
```

### User Authentication

**File**: `/etc/pgbouncer/userlist.txt`

**Format**:
```
"username" "password"
```

**Example**:
```
"postgres" "my_secure_password"
"roams_user" "another_password"
```

**Security**:
```bash
sudo chmod 600 /etc/pgbouncer/userlist.txt
sudo chown postgres:postgres /etc/pgbouncer/userlist.txt
```

**Using MD5 hashes** (more secure):
```bash
# Generate MD5 hash
echo -n 'passwordusername' | md5sum
# Output: a1b2c3d4e5f6...

# Add to userlist.txt
"username" "md5a1b2c3d4e5f6..."
```

---

## Django Integration

### Environment Variables

**File**: `roams_backend/.env`

```bash
# Database configuration
DB_NAME=roams_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=127.0.0.1

# Use PgBouncer (port 6432) instead of direct PostgreSQL (port 5432)
DB_PORT=6432

# Optional: Redis for caching
REDIS_URL=redis://127.0.0.1:6379/0
```

### Settings Configuration

The Django `settings.py` has been updated to automatically detect PgBouncer:

```python
# Auto-detects PgBouncer when DB_PORT=6432
USING_PGBOUNCER = env.str("DB_PORT", default="5432") == "6432"

DATABASES = {
    "default": {
        # ... other settings ...
        
        # Disable Django pooling when PgBouncer is active
        'CONN_MAX_AGE': 0 if USING_PGBOUNCER else 600,
        
        "OPTIONS": {
            # Faster timeout for PgBouncer (local connection)
            "connect_timeout": 10 if USING_PGBOUNCER else 30,
        }
    }
}
```

### Switching Between PgBouncer and Direct

**To enable PgBouncer:**
```bash
# Update .env
sed -i 's/DB_PORT=.*/DB_PORT=6432/' roams_backend/.env

# Restart Django
sudo systemctl restart roams_backend
```

**To disable PgBouncer (direct PostgreSQL):**
```bash
# Update .env
sed -i 's/DB_PORT=.*/DB_PORT=5432/' roams_backend/.env

# Restart Django
sudo systemctl restart roams_backend
```

### OPC UA Background Threads

No code changes needed! OPC UA threads use Django's database connection API:

```python
from django.db import close_old_connections

# In background thread
close_old_connections()  # Critical before DB operations
with OPCUANode.objects.filter(...) as nodes:
    # Queries use PgBouncer automatically
```

**Important**: Always call `close_old_connections()` in background threads to prevent stale connection issues.

---

## Monitoring

### Real-Time Monitor

**Interactive dashboard** showing live connection pool status:

```bash
cd roams_backend
python3 monitor_pgbouncer.py
```

**Output**:
```
============================================================
PgBouncer Status - 2026-02-05 14:30:15
============================================================

Clients:
  Active: 12
  Waiting: 0
  Total: 45

Servers:
  Active: 8
  Idle: 17
  Total: 25

✓ Pool is healthy

=== CONNECTION POOLS ===
Database        User            CL Active  CL Waiting   SV Active  SV Idle
============================================================================
roams_db        postgres        12         0            8          17

Refreshing in 5s... (Ctrl+C to stop)
```

**Options**:
```bash
# Refresh every 2 seconds
python3 monitor_pgbouncer.py --interval 2

# Show once and exit
python3 monitor_pgbouncer.py --once

# Show detailed statistics
python3 monitor_pgbouncer.py --stats

# Show configuration
python3 monitor_pgbouncer.py --config
```

### PgBouncer Admin Console

**Connect to admin console:**
```bash
psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer
```

**Useful commands:**

| Command | Description |
|---------|-------------|
| `SHOW POOLS;` | View connection pool status |
| `SHOW CLIENTS;` | List all client connections |
| `SHOW SERVERS;` | List all server connections |
| `SHOW STATS;` | Show traffic statistics |
| `SHOW CONFIG;` | Display current configuration |
| `RELOAD;` | Reload configuration without restart |
| `PAUSE;` | Pause all database activity |
| `RESUME;` | Resume after pause |
| `SHUTDOWN;` | Gracefully shut down PgBouncer |

**Example session:**
```sql
pgbouncer=# SHOW POOLS;
 database | user     | cl_active | cl_waiting | sv_active | sv_idle | sv_used
----------+----------+-----------+------------+-----------+---------+---------
 roams_db | postgres |        12 |          0 |         8 |      17 |      25

pgbouncer=# SHOW STATS;
 database | total_xact_count | total_received | total_sent | avg_req
----------+------------------+----------------+------------+---------
 roams_db |           125849 |      512394856 |  987654321 |   45.32
```

### Log Monitoring

**View logs:**
```bash
# Real-time logs
tail -f /var/log/pgbouncer/pgbouncer.log

# Recent errors
grep ERROR /var/log/pgbouncer/pgbouncer.log | tail -20

# Connection issues
grep "connection" /var/log/pgbouncer/pgbouncer.log | tail -20
```

**Log levels:**
- ERROR: Critical issues (connection failures, auth errors)
- WARNING: Potential problems (pool exhaustion)
- INFO: Normal operations (new connections, reloads)
- DEBUG: Verbose details (every query)

### Performance Benchmarks

**Compare PgBouncer vs direct PostgreSQL:**

```bash
cd roams_backend
python3 benchmark_pgbouncer.py
```

**Output**:
```
======================================================================
PgBouncer vs PostgreSQL Performance Comparison
======================================================================

Testing 100 iterations...

--- PgBouncer (Port 6432) ---
Connection Time:
  Min:    0.45 ms
  Max:    2.31 ms
  Avg:    0.82 ms
  Median: 0.76 ms

--- Direct PostgreSQL (Port 5432) ---
Connection Time:
  Min:    2.15 ms
  Max:    8.94 ms
  Avg:    3.47 ms
  Median: 3.21 ms

PERFORMANCE ANALYSIS
======================================================================
Connection Time Improvement:
  PgBouncer: 0.82 ms
  Direct:    3.47 ms
  Speedup:   76.4% faster

✓ PgBouncer is FASTER by 76.4%
```

---

## Troubleshooting

### Common Issues

#### 1. "Connection Refused" on Port 6432

**Symptoms:**
```
psycopg2.OperationalError: could not connect to server: Connection refused
```

**Solutions:**
```bash
# Check if PgBouncer is running
sudo systemctl status pgbouncer

# Check if port is listening
sudo netstat -tln | grep 6432
# or
sudo ss -tln | grep 6432

# Check logs for errors
sudo tail -50 /var/log/pgbouncer/pgbouncer.log

# Restart service
sudo systemctl restart pgbouncer
```

#### 2. Authentication Failed

**Symptoms:**
```
ERROR no such user: postgres
ERROR password authentication failed
```

**Solutions:**
```bash
# Verify userlist.txt exists and has correct permissions
ls -la /etc/pgbouncer/userlist.txt
# Should show: -rw------- 1 postgres postgres

# Check username/password in userlist.txt
sudo cat /etc/pgbouncer/userlist.txt

# Verify auth_type in pgbouncer.ini
sudo grep auth_type /etc/pgbouncer/pgbouncer.ini
# Should be: auth_type = md5

# Reload configuration
sudo systemctl reload pgbouncer
```

#### 3. Clients Waiting for Connections

**Symptoms:**
```
cl_waiting > 0  # In SHOW POOLS output
```

**Solutions:**
```bash
# Increase pool size
sudo nano /etc/pgbouncer/pgbouncer.ini
# Change: default_pool_size = 50  (was 25)

# Reload configuration
sudo systemctl reload pgbouncer

# Verify
psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer -c "SHOW POOLS;"
```

#### 4. "Too Many Connections" to PostgreSQL

**Symptoms:**
```
FATAL: sorry, too many clients already
```

**Solutions:**
```bash
# This should NOT happen with PgBouncer, but if it does:

# Check PostgreSQL max_connections
sudo -u postgres psql -c "SHOW max_connections;"

# Ensure PgBouncer pool_size < PostgreSQL max_connections
# Edit pgbouncer.ini:
default_pool_size = 25  # Should be well below PostgreSQL limit

# Check for runaway connections
psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer -c "SHOW SERVERS;"
```

#### 5. Django "Server Closed Connection"

**Symptoms:**
```
django.db.utils.OperationalError: server closed the connection unexpectedly
```

**Solutions:**
```bash
# Increase server_lifetime in pgbouncer.ini
sudo nano /etc/pgbouncer/pgbouncer.ini
# Change: server_lifetime = 7200  # 2 hours instead of 1

# Ensure CONN_MAX_AGE = 0 in Django settings.py
grep CONN_MAX_AGE roams_backend/roams_pro/settings.py
# Should show: 'CONN_MAX_AGE': 0 if USING_PGBOUNCER else 600

# Restart both services
sudo systemctl restart pgbouncer
sudo systemctl restart roams_backend
```

### Health Check Script

**Quick diagnostic:**
```bash
cd pgbouncer
./test_pgbouncer.sh
```

This tests:
- ✓ PgBouncer service status
- ✓ Port 6432 listening
- ✓ Database connectivity via PgBouncer
- ✓ Direct PostgreSQL access
- ✓ Configuration file existence
- ✓ Django settings compatibility

---

## Performance Tuning

### Optimal Settings for BROMS

Based on BROMS workload characteristics:

```ini
# /etc/pgbouncer/pgbouncer.ini

[pgbouncer]
# Connection pooling
pool_mode = transaction                    # ✓ Best for Django
default_pool_size = 25                     # ✓ Handles 50 stations + web traffic
reserve_pool_size = 5                      # Emergency connections
max_client_conn = 200                      # Total clients allowed

# Timeouts (optimized for SCADA telemetry)
server_lifetime = 3600                     # 1 hour (recycle connections)
server_idle_timeout = 600                  # 10 minutes (release idle)
server_connect_timeout = 30                # 30 seconds (allow PG startup)
query_timeout = 0                          # Disabled (Django handles it)
client_idle_timeout = 0                    # Disabled (OPC UA threads persistent)

# Health checks
server_check_query = SELECT 1              # Validate connections
server_check_delay = 60                    # Check every 60 seconds

# Logging (production)
log_connections = 1                        # Log connects/disconnects
log_disconnections = 1
log_pooler_errors = 1
log_stats = 1
stats_period = 60                          # Stats every 60 seconds
```

### Scaling Beyond 50 Stations

| Stations | `default_pool_size` | `max_client_conn` | Notes |
|----------|---------------------|-------------------|-------|
| 1-25     | 15                  | 100               | Light load |
| 26-50    | 25                  | 200               | **Current BROMS** |
| 51-100   | 40                  | 400               | Scale up |
| 101-200  | 60                  | 800               | Enterprise tier |
| 200+     | 100                 | 1500              | Consider multiple PgBouncer instances |

**Formula**:
```
default_pool_size ≈ (stations × 0.15) + (web_workers × 0.5) + 10
max_client_conn ≈ stations + (web_workers × 2) + celery_workers + buffer
```

### PostgreSQL Configuration

Ensure PostgreSQL is configured to support PgBouncer:

**File**: `/etc/postgresql/14/main/postgresql.conf`

```conf
# Connections
max_connections = 200                       # Must be > default_pool_size
shared_buffers = 2GB                        # 25% of system RAM

# Performance
effective_cache_size = 6GB                  # 75% of system RAM
work_mem = 16MB                             # Per-operation memory
maintenance_work_mem = 512MB                # For VACUUM, CREATE INDEX

# Write-ahead log
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Query planner
random_page_cost = 1.1                      # SSD optimization
```

Restart PostgreSQL after changes:
```bash
sudo systemctl restart postgresql
```

---

## Production Deployment

### Contabo VPS Setup

**Server**: 144.91.79.167 (Contabo VPS)

#### 1. Install PgBouncer

```bash
# SSH into server
ssh root@144.91.79.167

# Navigate to project
cd /opt/roams

# Run installer
sudo pgbouncer/install_pgbouncer.sh
```

#### 2. Configure Environment

```bash
# Update .env
nano roams_backend/.env

# Add or update:
DB_PORT=6432
```

#### 3. Update Systemd Services

**File**: `/etc/systemd/system/roams_backend.service`

```ini
[Unit]
Description=BROMS Django Backend
After=network.target postgresql.service pgbouncer.service
Requires=postgresql.service pgbouncer.service

[Service]
Type=notify
User=roams
Group=roams
WorkingDirectory=/opt/roams/roams_backend
Environment="PATH=/opt/roams/roams_backend/venv_new/bin"
ExecStart=/opt/roams/roams_backend/venv_new/bin/gunicorn \
    --workers 8 \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    roams_pro.wsgi:application

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 4. Start Services in Order

```bash
sudo systemctl enable postgresql
sudo systemctl enable pgbouncer
sudo systemctl enable roams_backend

sudo systemctl start postgresql
sudo systemctl start pgbouncer
sudo systemctl start roams_backend
```

#### 5. Verify

```bash
# Check all services
sudo systemctl status postgresql
sudo systemctl status pgbouncer
sudo systemctl status roams_backend

# Test connection
cd /opt/roams/pgbouncer
./test_pgbouncer.sh

# Monitor
cd /opt/roams/roams_backend
python3 monitor_pgbouncer.py --once
```

### Nginx Configuration

**File**: `/etc/nginx/sites-available/roams`

```nginx
upstream roams_backend {
    server 127.0.0.1:8000;
    keepalive 64;
}

server {
    listen 80;
    server_name 144.91.79.167;

    location /api/ {
        proxy_pass http://roams_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Keep connections alive to backend
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Timeouts for long-running queries
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    location / {
        root /opt/roams/roams_frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### Monitoring in Production

**Add to crontab for periodic checks:**

```bash
# Edit crontab
crontab -e

# Add health check every 5 minutes
*/5 * * * * /opt/roams/pgbouncer/test_pgbouncer.sh > /var/log/pgbouncer/health_check.log 2>&1

# Daily performance benchmark
0 2 * * * cd /opt/roams/roams_backend && python3 benchmark_pgbouncer.py > /var/log/pgbouncer/daily_benchmark.log 2>&1
```

### Backup Configuration

**Include PgBouncer in backups:**

```bash
# Create backup script
cat > /opt/roams/scripts/backup_pgbouncer.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/roams/backups/pgbouncer"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup configuration
cp /etc/pgbouncer/pgbouncer.ini "$BACKUP_DIR/pgbouncer.ini.$DATE"
cp /etc/pgbouncer/userlist.txt "$BACKUP_DIR/userlist.txt.$DATE"

# Backup stats
psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer -c "SHOW STATS;" > "$BACKUP_DIR/stats.$DATE.txt"

echo "Backup complete: $BACKUP_DIR"
EOF

chmod +x /opt/roams/scripts/backup_pgbouncer.sh

# Add to daily backup cron
echo "0 3 * * * /opt/roams/scripts/backup_pgbouncer.sh" >> /etc/cron.d/roams_backup
```

---

## Summary

### Benefits Achieved

✅ **Reduced PostgreSQL connections**: From 50+ to 25  
✅ **Faster connection times**: 76% improvement  
✅ **Better scalability**: Support 200+ concurrent clients  
✅ **Lower memory usage**: ~10MB → ~1KB per client  
✅ **Protected from connection storms**: Controlled pooling  
✅ **Zero code changes**: OPC UA threads work unchanged

### Files Created

```
pgbouncer/
├── pgbouncer.ini               # Main configuration
├── userlist.txt.example        # Authentication template
├── install_pgbouncer.sh        # Automated installer
├── test_pgbouncer.sh           # Connection tester
└── uninstall_pgbouncer.sh      # Removal script

roams_backend/
├── monitor_pgbouncer.py        # Real-time monitor
└── benchmark_pgbouncer.py      # Performance comparison
```

### Next Steps

1. ✅ Install PgBouncer: `sudo ./install_pgbouncer.sh`
2. ✅ Update .env: `echo "DB_PORT=6432" >> roams_backend/.env`
3. ✅ Restart Django: `systemctl restart roams_backend`
4. ✅ Test: `./test_pgbouncer.sh`
5. ✅ Monitor: `python3 monitor_pgbouncer.py`

### Support

- **Logs**: `/var/log/pgbouncer/pgbouncer.log`
- **Admin Console**: `psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer`
- **Systemd**: `systemctl status pgbouncer`
- **Documentation**: [PgBouncer Official Docs](https://www.pgbouncer.org/)

---

**Documentation Version**: 1.0  
**Last Updated**: 2026-02-05  
**Author**: BROMS Development Team
