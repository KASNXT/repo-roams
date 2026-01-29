#!/bin/bash
# OPC UA Auto-Refresh Verification Script
# Run this after deploying the fixes to verify everything is working

echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║       OPC UA AUTO-REFRESH VERIFICATION SCRIPT                        ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend

# Check 1: Verify opcua_client.py has the fixes
echo "📋 CHECK 1: Verify fixes are in place"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "✓ Checking if monitor_connection() has health check..."
if grep -q "server_node = self.client.get_node" roams_opcua_mgr/opcua_client.py; then
    echo "  ✅ PASS: Health check code found"
else
    echo "  ❌ FAIL: Health check code NOT found"
fi

echo ""
echo "✓ Checking if run() starts monitor thread..."
if grep -q "monitor_thread = threading.Thread(target=self.monitor_connection" roams_opcua_mgr/opcua_client.py; then
    echo "  ✅ PASS: Monitor thread startup found"
else
    echo "  ❌ FAIL: Monitor thread startup NOT found"
fi

echo ""
echo "✓ Checking if update_connection_status() has retry logic..."
if grep -q "max_retries = 3" roams_opcua_mgr/opcua_client.py; then
    echo "  ✅ PASS: Retry logic found"
else
    echo "  ❌ FAIL: Retry logic NOT found"
fi

# Check 2: Django shell tests
echo ""
echo ""
echo "📋 CHECK 2: Database Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

source ./venv_new/bin/activate

python manage.py shell << 'PYEOF'
from roams_opcua_mgr.models import OpcUaClientConfig, OpcUaReadLog
from django.utils.timezone import now
from datetime import timedelta

print("\n✓ OPC UA Server Configuration:")
for config in OpcUaClientConfig.objects.all():
    print(f"\n  📡 {config.station_name}")
    print(f"     Active: {'✅' if config.active else '❌'}")
    print(f"     Status: {config.connection_status}")
    print(f"     Last Connected: {config.last_connected}")
    
    # Check for recent reads
    recent = OpcUaReadLog.objects.filter(
        node__client_config=config,
        timestamp__gte=now() - timedelta(minutes=5)
    ).count()
    
    if recent > 0:
        print(f"     Recent Reads (5 min): ✅ {recent} readings")
    else:
        print(f"     Recent Reads (5 min): ❌ No readings")

print("\n" + "="*70)
print("Expected After Fixes:")
print("  - Status should update within ~35 seconds")
print("  - 'Connected' servers should have recent readings")
print("  - No more stale 'Connected' status after 4+ days")
print("="*70)
PYEOF

echo ""
echo "📋 CHECK 3: Log Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✓ Look for these messages in Django logs:"
echo "  📡 Monitor started for [station_name]"
echo "  ✅ Connection monitor started for [station_name]"
echo "  ✅ Connection verified as healthy"
echo "  ✅ Status updated to 'Connected'"
echo ""

echo ""
echo "🎯 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Restart Django:"
echo "   systemctl restart roams_django"
echo ""
echo "2. Monitor logs:"
echo "   tail -f /var/log/django.log | grep -E 'Monitor|Health|Status'"
echo ""
echo "3. Test in 1 minute - run this command again"
echo ""
echo "4. If still seeing 'Connected' with no recent data:"
echo "   - Check if read_data.py is running"
echo "   - Check if OPC UA servers are actually accessible"
echo "   - Review /var/log/django.log for connection errors"
echo ""

echo "✨ Auto-Refresh verification complete!"
echo ""
