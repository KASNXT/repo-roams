#!/bin/bash
# PgBouncer Installation Script for BROMS System
# Supports: Ubuntu 20.04+, Debian 11+
# Usage: sudo ./install_pgbouncer.sh

set -e  # Exit on error

echo "======================================"
echo "PgBouncer Installation for BROMS"
echo "======================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "ERROR: Please run as root (sudo)"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo "ERROR: Cannot detect OS version"
    exit 1
fi

echo "Detected OS: $OS $VER"

# Install PgBouncer
echo ""
echo "Step 1: Installing PgBouncer..."
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    apt-get update
    apt-get install -y pgbouncer postgresql-client
else
    echo "ERROR: Unsupported OS. Manual installation required."
    exit 1
fi

# Verify installation
if ! command -v pgbouncer &> /dev/null; then
    echo "ERROR: PgBouncer installation failed"
    exit 1
fi

PGBOUNCER_VERSION=$(pgbouncer --version | head -n1)
echo "✓ Installed: $PGBOUNCER_VERSION"

# Create necessary directories
echo ""
echo "Step 2: Creating directories..."
mkdir -p /etc/pgbouncer
mkdir -p /var/log/pgbouncer
mkdir -p /var/run/pgbouncer

# Set ownership
chown -R postgres:postgres /etc/pgbouncer
chown -R postgres:postgres /var/log/pgbouncer
chown -R postgres:postgres /var/run/pgbouncer

echo "✓ Directories created with postgres ownership"

# Copy configuration files
echo ""
echo "Step 3: Configuring PgBouncer..."

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -f "$SCRIPT_DIR/pgbouncer.ini" ]; then
    cp "$SCRIPT_DIR/pgbouncer.ini" /etc/pgbouncer/pgbouncer.ini
    echo "✓ Copied pgbouncer.ini"
else
    echo "WARNING: pgbouncer.ini not found in $SCRIPT_DIR"
    echo "You'll need to create /etc/pgbouncer/pgbouncer.ini manually"
fi

# Create userlist.txt from environment or prompt
echo ""
echo "Step 4: Setting up authentication..."
if [ -f "$SCRIPT_DIR/../roams_backend/.env" ]; then
    echo "Reading credentials from .env file..."
    
    # Parse .env file safely (line by line, no sourcing)
    ENV_FILE="$SCRIPT_DIR/../roams_backend/.env"
    
    # Extract variables using grep and sed (safe for special characters)
    DB_USER=$(grep -E "^DB_USER=" "$ENV_FILE" | sed 's/^DB_USER=//' | tr -d '\r\n' | tr -d '"' | tr -d "'")
    DB_PASSWORD=$(grep -E "^DB_PASSWORD=" "$ENV_FILE" | sed 's/^DB_PASSWORD=//' | tr -d '\r\n' | tr -d '"' | tr -d "'")
    DB_NAME=$(grep -E "^DB_NAME=" "$ENV_FILE" | sed 's/^DB_NAME=//' | tr -d '\r\n' | tr -d '"' | tr -d "'")
    
    if [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
        # Create userlist.txt with MD5 hash (safer than plaintext)
        echo "\"$DB_USER\" \"$DB_PASSWORD\"" > /etc/pgbouncer/userlist.txt
        chmod 600 /etc/pgbouncer/userlist.txt
        chown postgres:postgres /etc/pgbouncer/userlist.txt
        echo "✓ Created userlist.txt with credentials from .env"
    else
        echo "ERROR: DB_USER or DB_PASSWORD not found in .env"
        echo "DB_USER: ${DB_USER:-NOT_FOUND}"
        exit 1
    fi
else
    echo "WARNING: .env file not found"
    echo "Please create /etc/pgbouncer/userlist.txt manually with format:"
    echo "\"username\" \"password\""
    
    if [ -f "$SCRIPT_DIR/userlist.txt.example" ]; then
        cp "$SCRIPT_DIR/userlist.txt.example" /etc/pgbouncer/userlist.txt
        chmod 600 /etc/pgbouncer/userlist.txt
        chown postgres:postgres /etc/pgbouncer/userlist.txt
        echo "✓ Copied example userlist.txt (EDIT THIS FILE!)"
    fi
fi

# Update database name in pgbouncer.ini if DB_NAME is set
if [ -n "$DB_NAME" ]; then
    echo "Updating database name to: $DB_NAME"
    sed -i "s/roams_db = /;roams_db = /" /etc/pgbouncer/pgbouncer.ini
    sed -i "/^\[databases\]/a $DB_NAME = host=127.0.0.1 port=5432 dbname=$DB_NAME" /etc/pgbouncer/pgbouncer.ini
    echo "✓ Updated pgbouncer.ini with database: $DB_NAME"
fi

# Create systemd service
echo ""
echo "Step 5: Creating systemd service..."
cat > /etc/systemd/system/pgbouncer.service << 'EOF'
[Unit]
Description=PgBouncer - PostgreSQL connection pooler
Documentation=man:pgbouncer(1)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=forking
User=postgres
Group=postgres

# Configuration files
Environment="PGBOUNCER_INI=/etc/pgbouncer/pgbouncer.ini"

# Start PgBouncer
ExecStart=/usr/sbin/pgbouncer -d ${PGBOUNCER_INI}

# Reload configuration without restarting
ExecReload=/usr/bin/kill -HUP $MAINPID

# Stop PgBouncer gracefully (wait for all clients to disconnect)
ExecStop=/usr/bin/kill -INT $MAINPID

# Restart policy
Restart=on-failure
RestartSec=5s

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/pgbouncer /var/run/pgbouncer

# Process limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo "✓ Systemd service created"

# Enable and start PgBouncer
echo ""
echo "Step 6: Starting PgBouncer..."
systemctl enable pgbouncer
systemctl start pgbouncer

# Check status
sleep 2
if systemctl is-active --quiet pgbouncer; then
    echo "✓ PgBouncer is running"
    systemctl status pgbouncer --no-pager --lines=5
else
    echo "ERROR: PgBouncer failed to start"
    echo "Check logs: journalctl -u pgbouncer -n 50"
    exit 1
fi

# Test connection
echo ""
echo "Step 7: Testing connection..."
if psql -h 127.0.0.1 -p 6432 -U "$DB_USER" -d "${DB_NAME:-roams_db}" -c "SELECT version();" &> /dev/null; then
    echo "✓ Connection test successful"
else
    echo "WARNING: Connection test failed"
    echo "This may be normal if PostgreSQL authentication needs configuration"
    echo "Check: /var/log/pgbouncer/pgbouncer.log"
fi

# Display admin console instructions
echo ""
echo "======================================"
echo "Installation Complete!"
echo "======================================"
echo ""
echo "PgBouncer Status:"
echo "  Service: systemctl status pgbouncer"
echo "  Logs:    tail -f /var/log/pgbouncer/pgbouncer.log"
echo "  Console: psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer"
echo ""
echo "Admin Console Commands:"
echo "  SHOW POOLS;         - View connection pool status"
echo "  SHOW CLIENTS;       - View active clients"
echo "  SHOW SERVERS;       - View server connections"
echo "  SHOW STATS;         - View statistics"
echo "  RELOAD;             - Reload configuration"
echo "  PAUSE;              - Pause all activity"
echo "  RESUME;             - Resume activity"
echo ""
echo "Next Steps:"
echo "  1. Update Django settings.py: PORT = 6432, CONN_MAX_AGE = 0"
echo "  2. Restart Django: systemctl restart roams_backend"
echo "  3. Monitor: python3 roams_backend/monitor_pgbouncer.py"
echo ""
echo "Configuration files:"
echo "  /etc/pgbouncer/pgbouncer.ini"
echo "  /etc/pgbouncer/userlist.txt (secure: 600 permissions)"
echo ""
