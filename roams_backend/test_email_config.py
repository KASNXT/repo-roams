#!/usr/bin/env python
"""
Test script to verify email configuration is working.
Usage: python test_email_config.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'roams_pro.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

print("=" * 70)
print("EMAIL CONFIGURATION TEST")
print("=" * 70)

# Display current configuration
print("\nCurrent Configuration:")
print(f"  EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"  EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"  EMAIL_PORT: {settings.EMAIL_PORT}")
print(f"  EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
print(f"  EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
print(f"  THRESHOLD_EMAIL_ENABLED: {getattr(settings, 'THRESHOLD_EMAIL_ENABLED', 'NOT SET')}")
print(f"  THRESHOLD_EMAIL_FROM: {getattr(settings, 'THRESHOLD_EMAIL_FROM', 'NOT SET')}")

# Check if password is set
password_set = bool(settings.EMAIL_HOST_PASSWORD and settings.EMAIL_HOST_PASSWORD != 'your_app_password_here')
print(f"\n  EMAIL_HOST_PASSWORD: {'✅ SET' if password_set else '❌ NOT SET (placeholder still in use)'}")

if not password_set:
    print("\n❌ ERROR: Gmail App Password not configured!")
    print("\nFollow these steps:")
    print("1. Go to myaccount.google.com → Security")
    print("2. Enable 2-Step Verification (if not already enabled)")
    print("3. Click 'App passwords' (appears after 2FA is enabled)")
    print("4. Select 'Mail' and 'Windows Computer'")
    print("5. Copy the 16-character password Google generates")
    print("6. Update .env file: EMAIL_HOST_PASSWORD=<your_app_password>")
    print("7. Run this script again to test")
    exit(1)

# Test email sending
print("\n" + "=" * 70)
print("SENDING TEST EMAIL...")
print("=" * 70)

try:
    subject = "✅ ROAMS Notification System - Test Email"
    message = """
Hello,

This is a test email to verify that the ROAMS notification system 
is correctly configured and can send emails.

If you received this, email notifications are working properly!

Current time: Test sent at """ + str(os.popen('date').read()).strip()
    
    from_email = settings.THRESHOLD_EMAIL_FROM
    recipient_list = [settings.EMAIL_HOST_USER]  # Send to same email
    
    result = send_mail(
        subject,
        message,
        from_email,
        recipient_list,
        fail_silently=False
    )
    
    print(f"\n✅ SUCCESS! Test email sent to {settings.EMAIL_HOST_USER}")
    print("\nYou should receive an email shortly.")
    print("Check your inbox (and spam folder) to verify.")
    
except Exception as e:
    print(f"\n❌ FAILED! Error sending email:")
    print(f"   {type(e).__name__}: {e}")
    print("\nTroubleshooting steps:")
    print("1. Verify Gmail App Password is correct (copy it again if needed)")
    print("2. Ensure 2FA is enabled in Gmail account")
    print("3. Check if Gmail is blocking the connection (check Gmail Security log)")
    print("4. Try a different email provider (SendGrid, Mailgun, etc.)")

print("\n" + "=" * 70)
