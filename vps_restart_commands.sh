#!/bin/bash
# Commands to run on VPS to find and restart Django backend

echo "=== Finding Django/Python processes ==="
ps aux | grep -E 'python|django|gunicorn|uwsgi' | grep -v grep

echo ""
echo "=== Checking systemd services ==="
systemctl list-units --type=service --state=running | grep -E 'django|roams|python'

echo ""
echo "=== Checking for screen/tmux sessions ==="
screen -ls 2>/dev/null || echo "No screen sessions"
tmux ls 2>/dev/null || echo "No tmux sessions"

echo ""
echo "=== Checking supervisord processes ==="
supervisorctl status 2>/dev/null || echo "Supervisord not running"

echo ""
echo "=== Checking port 8000 (Django default) ==="
lsof -i :8000 2>/dev/null || netstat -tulpn | grep :8000 || ss -tulpn | grep :8000

echo ""
echo "=== Checking Nginx upstream configuration ==="
grep -r "proxy_pass" /etc/nginx/sites-enabled/* 2>/dev/null | head -5
