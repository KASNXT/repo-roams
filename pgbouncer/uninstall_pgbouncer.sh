#!/bin/bash
# Uninstall PgBouncer from BROMS System
# Usage: sudo ./uninstall_pgbouncer.sh

set -e

echo "======================================"
echo "PgBouncer Uninstallation"
echo "======================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "ERROR: Please run as root (sudo)"
    exit 1
fi

read -p "Are you sure you want to uninstall PgBouncer? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstallation cancelled."
    exit 0
fi

# Stop PgBouncer service
echo "Stopping PgBouncer service..."
if systemctl is-active --quiet pgbouncer 2>/dev/null; then
    systemctl stop pgbouncer
    echo "✓ Service stopped"
else
    echo "  Service not running"
fi

# Disable service
echo "Disabling PgBouncer service..."
if systemctl is-enabled --quiet pgbouncer 2>/dev/null; then
    systemctl disable pgbouncer
    echo "✓ Service disabled"
fi

# Remove systemd service file
if [ -f "/etc/systemd/system/pgbouncer.service" ]; then
    rm /etc/systemd/system/pgbouncer.service
    systemctl daemon-reload
    echo "✓ Systemd service removed"
fi

# Backup configuration files
BACKUP_DIR="/tmp/pgbouncer_backup_$(date +%Y%m%d_%H%M%S)"
if [ -d "/etc/pgbouncer" ]; then
    echo "Backing up configuration to: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp -r /etc/pgbouncer/* "$BACKUP_DIR/" 2>/dev/null || true
    echo "✓ Configuration backed up"
fi

# Remove configuration files
read -p "Remove configuration files? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf /etc/pgbouncer
    echo "✓ Configuration files removed"
else
    echo "  Configuration files kept at /etc/pgbouncer"
fi

# Remove log files
read -p "Remove log files? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf /var/log/pgbouncer
    echo "✓ Log files removed"
else
    echo "  Log files kept at /var/log/pgbouncer"
fi

# Remove runtime directory
rm -rf /var/run/pgbouncer 2>/dev/null || true

# Uninstall PgBouncer package
read -p "Uninstall PgBouncer package? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        if [[ "$NAME" == *"Ubuntu"* ]] || [[ "$NAME" == *"Debian"* ]]; then
            apt-get remove -y pgbouncer
            apt-get autoremove -y
            echo "✓ Package uninstalled"
        fi
    fi
else
    echo "  Package kept (PgBouncer binary still available)"
fi

echo ""
echo "======================================"
echo "Uninstallation Complete"
echo "======================================"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "IMPORTANT: Update Django settings.py:"
echo "  PORT = 5432  (change from 6432)"
echo "  CONN_MAX_AGE = 600  (restore Django pooling)"
echo ""
echo "Then restart Django backend."
echo ""
