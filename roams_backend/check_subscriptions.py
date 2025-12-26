#!/usr/bin/env python
"""
Check kasmic's notification subscriptions and test email trigger.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'roams_pro.settings')
django.setup()

from django.contrib.auth.models import User
from roams_opcua_mgr.models import NotificationRecipient, ThresholdBreach

print("=" * 70)
print("KASMIC'S NOTIFICATION SUBSCRIPTIONS")
print("=" * 70)

kasmic = User.objects.get(username='kasmic')

subscriptions = NotificationRecipient.objects.filter(user=kasmic)

if subscriptions.exists():
    print(f"\n✓ Found {subscriptions.count()} subscription(s):\n")
    for i, sub in enumerate(subscriptions, 1):
        print(f"{i}. Node: {sub.node.tag_name}")
        print(f"   Alert Level: {sub.alert_level}")
        print(f"   Email Enabled: {sub.email_enabled}")
        print(f"   SMS Enabled: {sub.sms_enabled}")
        print()
else:
    print("\n❌ No subscriptions found for kasmic!")
    print("Please create subscriptions in Django Admin first.")
    exit(1)

# Check if there are any threshold breaches
print("=" * 70)
print("RECENT THRESHOLD BREACHES")
print("=" * 70)

breaches = ThresholdBreach.objects.all().order_by('-timestamp')[:5]
if breaches.exists():
    print(f"\nFound {ThresholdBreach.objects.count()} total breaches.\n")
    for breach in breaches:
        print(f"- {breach.node.tag_name}: {breach.value} ({breach.level}) at {breach.timestamp}")
else:
    print("\n⚠️  No threshold breaches found yet.")

print("\n" + "=" * 70)
print("TO TEST EMAIL NOTIFICATIONS:")
print("=" * 70)
print("\n1. A threshold breach must occur in the OPC UA system")
print("2. When breach.level matches subscription.alert_level, email is sent")
print("3. Check roamsinfo0@gmail.com inbox")
print("\nOption to manually trigger a test breach:")
print("  - Use Django admin to create a ThresholdBreach record")
print("  - Or trigger one through the OPC UA client")
print("\n" + "=" * 70)
