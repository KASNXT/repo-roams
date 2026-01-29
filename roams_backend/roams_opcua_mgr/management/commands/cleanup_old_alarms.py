"""
Management command to clean up old alarms and threshold breaches based on retention policy.
Usage: python manage.py cleanup_old_alarms
"""

from django.core.management.base import BaseCommand
from django.utils.timezone import now, timedelta
from django.apps import apps
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up old alarm logs and threshold breaches based on retention policy'

    def handle(self, *args, **options):
        """Execute the cleanup operation."""
        AlarmRetentionPolicy = apps.get_model('roams_opcua_mgr', 'AlarmRetentionPolicy')
        AlarmLog = apps.get_model('roams_opcua_mgr', 'AlarmLog')
        ThresholdBreach = apps.get_model('roams_opcua_mgr', 'ThresholdBreach')
        
        # Get the retention policy
        policy = AlarmRetentionPolicy.get_policy()
        
        if not policy.auto_cleanup_enabled:
            self.stdout.write(
                self.style.WARNING('⚠️  Automatic cleanup is disabled in policy settings')
            )
            return
        
        try:
            # Calculate cutoff dates
            alarm_cutoff = now() - timedelta(days=policy.alarm_log_retention_days)
            breach_cutoff = now() - timedelta(days=policy.breach_retention_days)
            
            # Clean up old alarm logs
            alarm_count, _ = AlarmLog.objects.filter(timestamp__lt=alarm_cutoff).delete()
            
            # Clean up old threshold breaches
            breach_filter = ThresholdBreach.objects.filter(timestamp__lt=breach_cutoff)
            
            if policy.keep_unacknowledged:
                # Only delete acknowledged breaches
                breach_filter = breach_filter.filter(acknowledged=True)
            
            breach_count, _ = breach_filter.delete()
            
            # Update policy's last cleanup timestamp
            policy.last_cleanup_at = now()
            policy.save(update_fields=['last_cleanup_at'])
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Cleanup complete:\n'
                    f'   - Deleted {alarm_count} alarm logs (older than {policy.alarm_log_retention_days} days)\n'
                    f'   - Deleted {breach_count} threshold breaches (older than {policy.breach_retention_days} days)'
                )
            )
            
            logger.info(
                f'🗑️  Cleanup executed: {alarm_count} alarms, {breach_count} breaches deleted'
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Cleanup failed: {str(e)}')
            )
            logger.error(f'Cleanup failed: {e}')
            raise
