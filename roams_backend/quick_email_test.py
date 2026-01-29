#!/usr/bin/env python
"""Quick email test"""
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'roams_pro.settings'

import django
django.setup()

from django.core.mail import send_mail
from django.conf import settings

print("📧 Email Configuration:")
print(f"Backend: {settings.EMAIL_BACKEND}")
print(f"Host: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
print(f"From: {settings.THRESHOLD_EMAIL_FROM}")
print(f"TLS: {settings.EMAIL_USE_TLS}")
print(f"Enabled: {settings.THRESHOLD_EMAIL_ENABLED}")

print("\n✉️ Sending test email...")
try:
    result = send_mail(
        subject='🧪 ROAM System Test',
        message='Test email from ROAM notification system.',
        from_email=settings.THRESHOLD_EMAIL_FROM,
        recipient_list=['kasamirbassand00@gmail.com'],  # Test recipient
        fail_silently=False,
    )
    print(f"✅ Email sent successfully! (result={result})")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
