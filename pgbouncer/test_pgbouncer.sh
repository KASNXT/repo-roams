#!/bin/bash
# PgBouncer Connection Test Script for BROMS
# Tests connectivity to PgBouncer and verifies pool status

set -e

echo "======================================"
echo "PgBouncer Connection Test"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f "roams_backend/.env" ]; then
    # Parse .env file safely (no sourcing to avoid special character issues)
    ENV_FILE="roams_backend/.env"
    DB_USER=$(grep -E "^DB_USER=" "$ENV_FILE" | sed 's/^DB_USER=//' | tr -d '\r\n' | tr -d '"' | tr -d "'")
    DB_NAME=$(grep -E "^DB_NAME=" "$ENV_FILE" | sed 's/^DB_NAME=//' | tr -d '\r\n' | tr -d '"' | tr -d "'")
    DB_PASSWORD=$(grep -E "^DB_PASSWORD=" "$ENV_FILE" | sed 's/^DB_PASSWORD=//' | tr -d '\r\n' | tr -d '"' | tr -d "'")
else
    echo -e "${YELLOW}WARNING: .env file not found${NC}"
    DB_USER=${DB_USER:-postgres}
    DB_NAME=${DB_NAME:-roams_db}
fi

echo "Configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  PgBouncer Port: 6432"
echo "  PostgreSQL Port: 5432"
echo ""

# Test 1: PgBouncer service status
echo "Test 1: PgBouncer Service Status"
if systemctl is-active --quiet pgbouncer 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} PgBouncer service is running"
else
    echo -e "  ${RED}✗${NC} PgBouncer service is NOT running"
    echo "  Run: sudo systemctl start pgbouncer"
    exit 1
fi

# Test 2: PgBouncer port listening
echo ""
echo "Test 2: PgBouncer Port"
if netstat -tln 2>/dev/null | grep -q ":6432 " || ss -tln 2>/dev/null | grep -q ":6432 "; then
    echo -e "  ${GREEN}✓${NC} Port 6432 is listening"
else
    echo -e "  ${RED}✗${NC} Port 6432 is NOT listening"
    echo "  Check: journalctl -u pgbouncer -n 20"
    exit 1
fi

# Test 3: PostgreSQL connectivity through PgBouncer
echo ""
echo "Test 3: Database Connection via PgBouncer"
if PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 6432 -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 AS test;" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Successfully connected to database via PgBouncer"
else
    echo -e "  ${RED}✗${NC} Failed to connect to database"
    echo "  Check: /var/log/pgbouncer/pgbouncer.log"
    exit 1
fi

# Test 4: Direct PostgreSQL connectivity (bypass PgBouncer)
echo ""
echo "Test 4: Direct PostgreSQL Connection"
if PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 5432 -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 AS test;" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL is accessible directly"
else
    echo -e "  ${YELLOW}⚠${NC}  PostgreSQL direct connection failed"
    echo "  This may be normal if PostgreSQL only allows local connections"
fi

# Test 5: PgBouncer admin console
echo ""
echo "Test 5: PgBouncer Admin Console"
if PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 6432 -U "$DB_USER" pgbouncer -c "SHOW VERSION;" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Admin console accessible"
    
    # Show pool statistics
    echo ""
    echo "Connection Pool Status:"
    PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 6432 -U "$DB_USER" pgbouncer -c "SHOW POOLS;" 2>/dev/null || echo "  Unable to show pools"
    
    echo ""
    echo "Server Connections:"
    PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 6432 -U "$DB_USER" pgbouncer -c "SHOW SERVERS;" 2>/dev/null || echo "  Unable to show servers"
    
    echo ""
    echo "Client Connections:"
    PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 6432 -U "$DB_USER" pgbouncer -c "SHOW CLIENTS;" 2>/dev/null || echo "  Unable to show clients"
else
    echo -e "  ${YELLOW}⚠${NC}  Admin console not accessible (may require admin_users configuration)"
fi

# Test 6: Configuration validation
echo ""
echo "Test 6: Configuration Files"
if [ -f "/etc/pgbouncer/pgbouncer.ini" ]; then
    echo -e "  ${GREEN}✓${NC} pgbouncer.ini exists"
else
    echo -e "  ${RED}✗${NC} pgbouncer.ini NOT found"
fi

if [ -f "/etc/pgbouncer/userlist.txt" ]; then
    echo -e "  ${GREEN}✓${NC} userlist.txt exists"
    # Check permissions
    PERMS=$(stat -c '%a' /etc/pgbouncer/userlist.txt 2>/dev/null || stat -f '%A' /etc/pgbouncer/userlist.txt 2>/dev/null)
    if [ "$PERMS" = "600" ]; then
        echo -e "  ${GREEN}✓${NC} userlist.txt has secure permissions (600)"
    else
        echo -e "  ${YELLOW}⚠${NC}  userlist.txt permissions: $PERMS (should be 600)"
    fi
else
    echo -e "  ${RED}✗${NC} userlist.txt NOT found"
fi

# Test 7: Django configuration check
echo ""
echo "Test 7: Django Settings Check"
if grep -q "\"PORT\": \"6432\"" roams_backend/roams_pro/settings.py 2>/dev/null || \
   grep -q "'PORT': '6432'" roams_backend/roams_pro/settings.py 2>/dev/null || \
   grep -q "DB_PORT.*6432" roams_backend/.env 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Django configured to use PgBouncer (port 6432)"
else
    echo -e "  ${YELLOW}⚠${NC}  Django may not be configured for PgBouncer"
    echo "  Update settings.py: PORT = 6432"
fi

if grep -q "CONN_MAX_AGE.*0" roams_backend/roams_pro/settings.py 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} CONN_MAX_AGE = 0 (PgBouncer handles pooling)"
else
    echo -e "  ${YELLOW}⚠${NC}  CONN_MAX_AGE should be 0 with PgBouncer"
fi

# Summary
echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "${GREEN}All critical tests passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Restart Django backend: cd roams_backend && python manage.py runserver"
echo "  2. Monitor connections: python3 roams_backend/monitor_pgbouncer.py"
echo "  3. Check logs: tail -f /var/log/pgbouncer/pgbouncer.log"
echo ""
