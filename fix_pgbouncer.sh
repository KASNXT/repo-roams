#!/bin/bash
# Fix PgBouncer and restart services

echo "=== Fixing PgBouncer Configuration ==="

# Stop services
systemctl stop pgbouncer
systemctl stop roams-opcua
systemctl stop roams-django

# Remove problematic line 218
sed -i '218d' /etc/pgbouncer/pgbouncer.ini

# Also remove any remaining tcp_nodelay lines
sed -i '/tcp_nodelay/d' /etc/pgbouncer/pgbouncer.ini

echo "✓ Removed tcp_nodelay from config"

# Start PgBouncer first
systemctl start pgbouncer
sleep 2

# Check if PgBouncer is running
if systemctl is-active --quiet pgbouncer; then
    echo "✓ PgBouncer is running on port 6432"
    ss -tlnp | grep 6432
else
    echo "✗ PgBouncer failed to start!"
    journalctl -u pgbouncer -n 20 --no-pager
    exit 1
fi

# Verify Django settings use port 6432
echo ""
echo "=== Checking Django Database Settings ==="
cd /opt/roams/roams_backend
grep -A 5 "DATABASES" roams_pro/settings.py | grep -E "PORT|HOST"

# Start Django and OPC UA
echo ""
echo "=== Starting Services ==="
systemctl start roams-django
systemctl start roams-opcua

sleep 3

# Check service status
systemctl status roams-django --no-pager | head -10
systemctl status roams-opcua --no-pager | head -10

echo ""
echo "=== Testing PgBouncer Connection ==="
psql -h 127.0.0.1 -p 6432 -U roams_user -d roams_db -c "SELECT count(*) FROM pg_stat_activity;" -w

echo ""
echo "✓ Setup complete!"
echo "Django should now use PgBouncer (port 6432) instead of direct PostgreSQL (5432)"
