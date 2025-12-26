#!/usr/bin/env python
"""
Script to create NotificationRecipient subscriptions for kasmic user.
This links kasmic to OPC UA nodes for threshold notifications.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'roams_pro.settings')
django.setup()

from django.contrib.auth.models import User
from roams_opcua_mgr.models import NotificationRecipient, OPCUANode
from roams_api.models import UserProfile

print("=" * 70)
print("NOTIFICATION RECIPIENT SETUP")
print("=" * 70)

# Get kasmic user
try:
    kasmic = User.objects.get(username='kasmic')
    profile = UserProfile.objects.get(user=kasmic)
    print(f"\n✓ Found user: {kasmic.username}")
    print(f"  Email: {kasmic.email}")
    print(f"  Phone: {profile.phone_number}")
except User.DoesNotExist:
    print("\n❌ User 'kasmic' not found!")
    exit(1)
except UserProfile.DoesNotExist:
    print("\n❌ UserProfile for 'kasmic' not found!")
    exit(1)

# Display available nodes
print("\n" + "=" * 70)
print("AVAILABLE OPC UA NODES")
print("=" * 70)

nodes = OPCUANode.objects.all().order_by('tag_name')
if not nodes.exists():
    print("\n❌ No OPC UA nodes found!")
    exit(1)

print(f"\nFound {nodes.count()} nodes:\n")
for i, node in enumerate(nodes, 1):
    print(f"{i}. {node.tag_name}")
    print(f"   Name: {node.name}")
    print(f"   Warning Level: {node.warning_level}")
    print(f"   Critical Level: {node.critical_level}")
    print()

# Check existing subscriptions
print("=" * 70)
print("EXISTING SUBSCRIPTIONS FOR KASMIC")
print("=" * 70)

existing_subs = NotificationRecipient.objects.filter(user=kasmic)
if existing_subs.exists():
    print(f"\nFound {existing_subs.count()} existing subscription(s):\n")
    for sub in existing_subs:
        print(f"- {sub.node.tag_name}")
        print(f"  Alert Level: {sub.alert_level}")
        print(f"  Email Enabled: {sub.email_enabled}")
        print(f"  SMS Enabled: {sub.sms_enabled}")
        print()
else:
    print("\nNo subscriptions yet. Here's how to create them:\n")
    print("OPTION 1: Use Django Admin (Recommended)")
    print("  1. Go to http://localhost:8000/admin/")
    print("  2. Navigate to 'Notification Recipients'")
    print("  3. Click 'Add Notification Recipient'")
    print("  4. Select kasmic user and a node")
    print("  5. Choose alert level (warning/critical)")
    print("  6. Enable email/SMS as needed")
    print("  7. Save")
    
    print("\nOPTION 2: Using this script")
    print("  Edit this file and uncomment the 'Auto-create subscriptions' section")
    print("  Then run: python setup_notifications.py")
    
    # UNCOMMENT BELOW TO AUTO-CREATE SUBSCRIPTIONS
    """
    print("\n" + "=" * 70)
    print("AUTO-CREATING SUBSCRIPTIONS")
    print("=" * 70)
    
    # Subscribe kasmic to first 3 nodes for testing
    for node in nodes[:3]:
        sub, created = NotificationRecipient.objects.get_or_create(
            user=kasmic,
            node=node,
            defaults={
                'alert_level': 'critical',  # Only for critical breaches
                'email_enabled': True,
                'sms_enabled': True,
            }
        )
        if created:
            print(f"✓ Created subscription: {kasmic.username} → {node.tag_name} (critical alerts)")
        else:
            print(f"- Subscription already exists: {kasmic.username} → {node.tag_name}")
    """

print("\n" + "=" * 70)
print("NEXT STEPS")
print("=" * 70)
print("\n1. ✓ Email backend configured")
print("2. ⚠ Gmail App Password: Update .env with your App Password")
print("3. ⚠ Create NotificationRecipient subscriptions (see options above)")
print("4. Test by triggering a threshold breach in the system")
print("5. Check email for notifications")
print("\n" + "=" * 70)
