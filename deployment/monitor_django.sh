#!/bin/bash
# Django Health Monitor - Auto-restart if Django stops responding
# Place in: /opt/roams/scripts/monitor_django.sh
# Run via cron every 2 minutes

LOG_FILE="/var/log/roams-django-monitor.log"
MAX_FAILURES=2  # Restart after 2 consecutive failures

# Persistent failure counter
FAILURE_COUNT_FILE="/tmp/django_health_failures"

# Initialize failure counter if doesn't exist
if [ ! -f "$FAILURE_COUNT_FILE" ]; then
    echo "0" > "$FAILURE_COUNT_FILE"
fi

# Read current failure count
FAILURES=$(cat "$FAILURE_COUNT_FILE")

# Test Django health endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8000/health/)

if [ "$HTTP_CODE" = "200" ]; then
    # Django is healthy, reset failure counter
    if [ "$FAILURES" != "0" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Django recovered (was $FAILURES failures)" >> "$LOG_FILE"
        echo "0" > "$FAILURE_COUNT_FILE"
    fi
else
    # Django is not responding
    FAILURES=$((FAILURES + 1))
    echo "$FAILURES" > "$FAILURE_COUNT_FILE"
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⚠️ Django health check failed (HTTP $HTTP_CODE) - Failure $FAILURES/$MAX_FAILURES" >> "$LOG_FILE"
    
    # Restart if reached threshold
    if [ "$FAILURES" -ge "$MAX_FAILURES" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - 🔄 Restarting Django service..." >> "$LOG_FILE"
        systemctl restart roams-django
        sleep 5
        
        # Verify restart worked
        NEW_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8000/health/)
        if [ "$NEW_HTTP_CODE" = "200" ]; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Django restarted successfully" >> "$LOG_FILE"
            echo "0" > "$FAILURE_COUNT_FILE"
        else
            echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ Django restart failed (HTTP $NEW_HTTP_CODE)" >> "$LOG_FILE"
        fi
    fi
fi
