#!/bin/bash
# Django Backend Log Checker

echo "=== Django Service Status ==="
sudo systemctl status roams-django

echo -e "\n=== Django Service Logs (last 50 lines) ==="
sudo journalctl -u roams-django -n 50 --no-pager

echo -e "\n=== OPC UA Service Status ==="
sudo systemctl status roams-opcua

echo -e "\n=== OPC UA Logs (last 30 lines) ==="
sudo journalctl -u roams-opcua -n 30 --no-pager

echo -e "\n=== Nginx Error Log (last 20 lines) ==="
sudo tail -n 20 /var/log/nginx/error.log

echo -e "\n=== PostgreSQL Connection Count ==="
sudo -u postgres psql -c "SELECT count(*) as connections, state FROM pg_stat_activity GROUP BY state;"

echo -e "\n=== Active L2TP Connections ==="
ip addr show | grep ppp

echo -e "\n=== VPN Routes ==="
ip route | grep "192.168"
