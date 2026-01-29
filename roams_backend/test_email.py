#!/usr/bin/env python
"""
Test email notification functionality
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'roams_pro.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings
from roams_opcua_mgr.models import OPCUANode, ThresholdBreach, NotificationRecipient
from roams_api.models import UserProfile
from django.contrib.auth.models import User
from roams_opcua_mgr.notifications import send_alert_email, get_breach_recipients

print("=" * 60)
print("ROAM EMAIL NOTIFICATION TEST")
print("=" * 60)

# 1. Check email configuration
print("\n📧 EMAIL CONFIGURATION:")
print(f"  Backend: {settings.EMAIL_BACKEND}")
print(f"  Host: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
print(f"  Use TLS: {settings.EMAIL_USE_TLS}")
print(f"  From: {settings.THRESHOLD_EMAIL_FROM}")
print(f"  User: {settings.EMAIL_HOST_USER}")
print(f"  Enabled: {settings.THRESHOLD_EMAIL_ENABLED}")

# 2. Check users and profiles
print("\n👥 USER PROFILES:")
users = User.objects.all()
print(f"  Total users: {users.count()}")
for user in users:
    has_profile = hasattr(user, 'profile')
    email = user.email or "(no email)"
    print(f"  - {user.username}: {email}")
    if has_profile:
        profile = user.profile
        print(f"    Profile: email_notif={profile.email_notifications}, critical_only={profile.critical_alerts_only}")
    else:
        print(f"    ⚠️ No profile")

# 3. Check notification subscriptions
print("\n🔔 NOTIFICATION SUBSCRIPTIONS:")
subscriptions = NotificationRecipient.objects.all()
print(f"  Total subscriptions: {subscriptions.count()}")
for sub in subscriptions[:10]:
    print(f"  - {sub.user.username} → {sub.node.tag_name} ({sub.alert_level})")
    print(f"    Email: {sub.email_enabled}, SMS: {sub.sms_enabled}")

# 4. Check nodes with threshold breaches
print("\n🚨 RECENT THRESHOLD BREACHES:")
breaches = ThresholdBreach.objects.all().order_by('-timestamp')[:5]
print(f"  Total breaches: {ThresholdBreach.objects.count()}")
for breach in breaches:
    print(f"  - {breach.node.tag_name}: {breach.value} {breach.node.tag_units} ({breach.level}) @ {breach.timestamp}")

# 5. Test basic email send
print("\n✉️ TESTING BASIC EMAIL SEND:")
try:
    test_email = input("Enter test email address (or press Enter to skip): ").strip()
    if test_email:
        send_mail(
            subject='🧪 ROAM Email Test',
            message='This is a test email from the ROAM system.',
            from_email=settings.THRESHOLD_EMAIL_FROM,
            recipient_list=[test_email],
            fail_silently=False,
        )
        print(f"  ✅ Test email sent to {test_email}")
    else:
        print("  ⏭️  Skipped basic email test")
except Exception as e:
    print(f"  ❌ Error sending email: {e}")

# 6. Test notification system with a real breach
print("\n🔬 TESTING NOTIFICATION SYSTEM:")
if breaches.exists():
    test_breach = breaches.first()
    node = test_breach.node
    print(f"  Using breach: {node.tag_name} ({test_breach.level})")
    
    # Check recipients
    recipients_dict = get_breach_recipients(node, test_breach.level)
    print(f"  Email recipients: {recipients_dict.get('email', [])}")
    print(f"  SMS recipients: {recipients_dict.get('sms', [])}")
    
    if recipients_dict.get('email'):
        confirm = input("  Send test notification email? (yes/no): ").strip().lower()
        if confirm == 'yes':
            try:
                success = send_alert_email(node, test_breach)
                if success:
                    print("  ✅ Notification email sent successfully!")
                else:
                    print("  ❌ Failed to send notification email")
            except Exception as e:
                print(f"  ❌ Error: {e}")
        else:
            print("  ⏭️  Skipped notification test")
    else:
        print("  ⚠️ No email recipients configured for this node")
else:
    print("  ⚠️ No threshold breaches found in database")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
