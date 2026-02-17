#!/bin/bash
# Deploy Django auto-restart and monitoring safeguards
# Run this script on the VPS to implement all prevention measures

set -e  # Exit on error

echo "=========================================="
echo "🛡️  Deploying Django Stability Safeguards"
echo "=========================================="
echo ""

# 1. Update systemd service with auto-restart
echo "📝 Step 1: Updating systemd service with auto-restart..."
cat > /etc/systemd/system/roams-django.service << 'EOF'
[Unit]
Description=ROAMS Django Application
After=network.target postgresql.service pgbouncer.service
Wants=postgresql.service pgbouncer.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/roams/roams_backend
Environment="PATH=/opt/roams/roams_backend/venv_new/bin"
ExecStart=/opt/roams/roams_backend/venv_new/bin/python manage.py runserver 0.0.0.0:8000 --nothreading --noreload

# Auto-restart configuration
Restart=always
RestartSec=10
StartLimitInterval=300
StartLimitBurst=5

# Kill hung processes
TimeoutStopSec=30
KillMode=mixed

# Memory limits (optional - prevents memory leaks from crashing server)
MemoryMax=500M
MemoryHigh=400M

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo "   ✅ Systemd service updated"

# 2. Copy health check views
echo ""
echo "📝 Step 2: Deploying health check endpoint..."
# This assumes you've already uploaded health_views.py and updated urls.py
# Those files need to be copied from local to VPS first

# 3. Install monitoring script
echo ""
echo "📝 Step 3: Installing monitoring script..."
mkdir -p /opt/roams/scripts
cat > /opt/roams/scripts/monitor_django.sh << 'EOF'
#!/bin/bash
LOG_FILE="/var/log/roams-django-monitor.log"
MAX_FAILURES=2
FAILURE_COUNT_FILE="/tmp/django_health_failures"

if [ ! -f "$FAILURE_COUNT_FILE" ]; then
    echo "0" > "$FAILURE_COUNT_FILE"
fi

FAILURES=$(cat "$FAILURE_COUNT_FILE")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8000/health/)

if [ "$HTTP_CODE" = "200" ]; then
    if [ "$FAILURES" != "0" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Django recovered (was $FAILURES failures)" >> "$LOG_FILE"
        echo "0" > "$FAILURE_COUNT_FILE"
    fi
else
    FAILURES=$((FAILURES + 1))
    echo "$FAILURES" > "$FAILURE_COUNT_FILE"
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⚠️ Django health check failed (HTTP $HTTP_CODE) - Failure $FAILURES/$MAX_FAILURES" >> "$LOG_FILE"
    
    if [ "$FAILURES" -ge "$MAX_FAILURES" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - 🔄 Restarting Django service..." >> "$LOG_FILE"
        systemctl restart roams-django
        sleep 5
        
        NEW_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8000/health/)
        if [ "$NEW_HTTP_CODE" = "200" ]; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Django restarted successfully" >> "$LOG_FILE"
            echo "0" > "$FAILURE_COUNT_FILE"
        else
            echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ Django restart failed (HTTP $NEW_HTTP_CODE)" >> "$LOG_FILE"
        fi
    fi
fi
EOF

chmod +x /opt/roams/scripts/monitor_django.sh
echo "   ✅ Monitoring script installed"

# 4. Set up cron job
echo ""
echo "📝 Step 4: Setting up cron job (check every 2 minutes)..."
(crontab -l 2>/dev/null | grep -v "monitor_django.sh"; echo "*/2 * * * * /opt/roams/scripts/monitor_django.sh") | crontab -
echo "   ✅ Cron job configured"

# 5. Create log file
echo ""
echo "📝 Step 5: Creating log file..."
touch /var/log/roams-django-monitor.log
chmod 644 /var/log/roams-django-monitor.log
echo "   ✅ Log file ready: /var/log/roams-django-monitor.log"

# 6. Restart Django to apply changes
echo ""
echo "📝 Step 6: Restarting Django with new configuration..."
systemctl restart roams-django
sleep 3
echo "   ✅ Django restarted"

# 7. Test health check
echo ""
echo "📝 Step 7: Testing health check endpoint..."
sleep 2
HTTP_RESPONSE=$(curl -s http://localhost:8000/health/)
if echo "$HTTP_RESPONSE" | grep -q "healthy"; then
    echo "   ✅ Health check working: $HTTP_RESPONSE"
else
    echo "   ⚠️  Health check may not be working yet. Verify urls.py and health_views.py are deployed."
fi

echo ""
echo "=========================================="
echo "✅ All safeguards deployed successfully!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  • Auto-restart on crash: Enabled"
echo "  • Health monitoring: Every 2 minutes"
echo "  • Auto-restart on hang: After 2 failures (4 minutes)"
echo "  • Monitor logs: /var/log/roams-django-monitor.log"
echo ""
echo "To check status:"
echo "  systemctl status roams-django"
echo "  curl http://localhost:8000/health/"
echo "  tail -f /var/log/roams-django-monitor.log"
echo ""
