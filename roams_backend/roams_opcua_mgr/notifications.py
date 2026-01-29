"""
Notification system for threshold breaches.
Handles email and SMS alerts for critical and warning breaches.
Uses database-driven recipient management via NotificationRecipient model.
"""

import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import requests

logger = logging.getLogger(__name__)


def get_breach_recipients(node, breach_level):
    """
    Get notification recipients for a specific node and breach level from database.
    
    Args:
        node: OPCUANode instance
        breach_level: 'Warning' or 'Critical'
    
    Returns:
        dict with 'email' and 'sms' lists of recipient contact info
    """
    from roams_opcua_mgr.models import NotificationRecipient
    from roams_api.models import UserProfile
    
    recipients = {
        'email': [],
        'sms': []
    }
    
    # Get all subscriptions for this node matching the breach level
    subscriptions = NotificationRecipient.objects.filter(
        node=node
    ).select_related('user', 'user__profile')
    
    for sub in subscriptions:
        # Check if user profile exists
        if not hasattr(sub.user, 'profile'):
            logger.warning(f"User {sub.user.username} has no profile, skipping notifications")
            continue
        
        profile = sub.user.profile
        
        # Filter by alert level
        if sub.alert_level == 'warning' and breach_level != 'Warning':
            continue
        if sub.alert_level == 'critical' and breach_level != 'Critical':
            continue
        if profile.critical_alerts_only and breach_level != 'Critical':
            continue
        
        # Add email recipient
        if sub.email_enabled and profile.email_notifications and sub.user.email:
            recipients['email'].append(sub.user.email)
        
        # Add SMS recipient
        if sub.sms_enabled and profile.sms_notifications and profile.phone_number:
            recipients['sms'].append(profile.phone_number)
    
    return recipients


class NotificationConfig:
    """Configuration for notifications"""
    
    SEND_SMS_ENABLED = getattr(settings, 'THRESHOLD_SMS_ENABLED', False)
    SEND_EMAIL_ENABLED = getattr(settings, 'THRESHOLD_EMAIL_ENABLED', True)
    EMAIL_FROM = getattr(settings, 'THRESHOLD_EMAIL_FROM', 'alerts@roams.local')
    
    TWILIO_ACCOUNT_SID = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
    TWILIO_AUTH_TOKEN = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
    TWILIO_PHONE_FROM = getattr(settings, 'TWILIO_PHONE_FROM', None)


def send_alert_email(node, breach):
    """
    Send email alert for a threshold breach to subscribed users.
    
    Args:
        node: OPCUANode instance
        breach: ThresholdBreach instance
    """
    if not NotificationConfig.SEND_EMAIL_ENABLED:
        logger.debug("Email notifications disabled in settings")
        return False
        
    try:
        # Get recipients from database
        recipients_dict = get_breach_recipients(node, breach.level)
        email_recipients = recipients_dict.get('email', [])
        
        if not email_recipients:
            logger.warning(f"⚠️ No email recipients found for {node.tag_name} breach ({breach.level})")
            return False
        
        logger.info(f"📧 Preparing email for {node.tag_name} breach to {len(email_recipients)} recipient(s)")
        
        # Prepare email content
        subject = f"🚨 [{breach.level}] Threshold Breach: {node.tag_name}"
        
        threshold_value = node.critical_level if breach.level == "Critical" else node.warning_level
        
        context = {
            'breach_level': breach.level,
            'station': node.client_config.station_name,
            'parameter': node.tag_name,
            'unit': node.tag_units,
            'current_value': breach.value,
            'threshold_value': threshold_value,
            'min_value': node.min_value,
            'max_value': node.max_value,
            'timestamp': breach.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        }
        
         # Create HTML email
        html_message = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2 style="color: {'#d32f2f' if breach.level == 'Critical' else '#f57c00'};">
                    🚨 {breach.level.upper()} THRESHOLD BREACH ALERT
                </h2>
                <p><strong>Station:</strong> {context['station']}</p>
                <p><strong>Parameter:</strong> {context['parameter']} ({context['unit']})</p>
                <p><strong>Current Value:</strong> {context['current_value']}</p>
                <p><strong>Threshold Value:</strong> {context['threshold_value']}</p>
                <p><strong>Min/Max Range:</strong> {context['min_value']} - {context['max_value']}</p>
                <p><strong>Timestamp:</strong> {context['timestamp']}</p>
                <p style="color: #666;">Please acknowledge this breach in the ROAMS system.</p>
            </body>
        </html>
        """
        
        text_message = strip_tags(html_message)
        
        # Send email
        send_mail(
            subject,
            text_message,
            NotificationConfig.EMAIL_FROM,
            email_recipients,
            html_message=html_message,
            fail_silently=False
        )
        
        logger.info(f"✉️ Email alert sent for {breach.level} breach: {node.tag_name}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email alert: {e}")
        return False


def send_alert_sms(node, breach):
    """
    Send SMS alert for a threshold breach using Twilio.
    Uses DB-driven recipients via get_breach_recipients.
    """
    if not NotificationConfig.SEND_SMS_ENABLED:
        logger.debug("SMS notifications disabled")
        return False

    if not NotificationConfig.TWILIO_ACCOUNT_SID or not NotificationConfig.TWILIO_PHONE_FROM:
        logger.warning("Twilio not configured")
        return False

    try:
        recipients_dict = get_breach_recipients(node, breach.level)
        recipients = recipients_dict.get('sms', [])

        if not recipients:
            logger.debug(f"No SMS recipients for {node.tag_name} breach ({breach.level})")
            return False

        threshold_value = node.critical_level if breach.level == "Critical" else node.warning_level

        # Prepare SMS content
        message = (
            f"🚨 {breach.level}: {node.tag_name} = {breach.value} {node.tag_units} "
            f"(Threshold: {threshold_value}) at {breach.timestamp.strftime('%H:%M')}"
        )

        # Send via Twilio
        url = f"https://api.twilio.com/2010-04-01/Accounts/{NotificationConfig.TWILIO_ACCOUNT_SID}/Messages.json"

        for phone in recipients:
            try:
                response = requests.post(
                    url,
                    data={
                        'From': NotificationConfig.TWILIO_PHONE_FROM,
                        'To': phone,
                        'Body': message
                    },
                    auth=(NotificationConfig.TWILIO_ACCOUNT_SID, NotificationConfig.TWILIO_AUTH_TOKEN)
                )

                if response.status_code not in (200, 201):
                    logger.error(f"Failed to send SMS to {phone}: {response.status_code} {response.text}")
                else:
                    logger.info(f"📱 SMS alert sent to {phone}")

            except Exception as e:
                logger.error(f"Failed to send SMS to {phone}: {e}")

        return True

    except Exception as e:
        logger.error(f"Failed to prepare SMS alert: {e}")
        return False


def notify_threshold_breach(node, breach):
    """
    Send all configured notifications for a threshold breach.
    Implements standard interval sending to avoid notification spam.
    
    Args:
        node: OPCUANode instance
        breach: ThresholdBreach instance
    """
    from roams_opcua_mgr.models import NotificationSchedule
    
    logger.info(f"📢 Processing notifications for {breach.level} breach: {node.tag_name}")
    
    # Get or create notification schedule for this breach
    schedule, created = NotificationSchedule.objects.get_or_create(
        breach=breach,
        defaults={
            'last_notified_at': breach.timestamp,
            'interval': '1hour',  # Default to hourly notifications
            'notification_count': 0
        }
    )
    
    # If this is a new breach or it's time for the next scheduled notification
    if created or schedule.should_notify_now():
        # Send email
        send_alert_email(node, breach)
        
        # Send SMS (only for critical breaches by default)
        if breach.level == "Critical":
            send_alert_sms(node, breach)
        
        # Record the notification
        schedule.record_notification()
        logger.info(
            f"✅ Notification #{schedule.notification_count} sent for "
            f"{breach.level} breach: {node.tag_name}"
        )
    else:
        logger.debug(
            f"⏭️  Next notification for {node.tag_name} scheduled at "
            f"{schedule.last_notified_at + _get_interval_delta(schedule.interval)}"
        )


def _get_interval_delta(interval):
    """Helper to get timedelta from interval string"""
    from datetime import timedelta
    interval_map = {
        '15min': timedelta(minutes=15),
        '30min': timedelta(minutes=30),
        '1hour': timedelta(hours=1),
        '4hours': timedelta(hours=4),
        'daily': timedelta(days=1),
        'never': timedelta(days=365*10),
    }
    return interval_map.get(interval, timedelta(hours=1))
