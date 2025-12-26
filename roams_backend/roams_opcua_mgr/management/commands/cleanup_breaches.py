"""
Management command to clean up old threshold breaches.
Archivable records are those that are acknowledged and older than the specified age.
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils.timezone import now, timedelta
from roams_opcua_mgr.models import ThresholdBreach
from django.db import models
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up old acknowledged threshold breaches to manage database size'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Delete breaches older than this many days (default: 90)'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        
        parser.add_argument(
            '--keep-unacknowledged',
            action='store_true',
            default=True,
            help='Keep unacknowledged breaches regardless of age (default: True)'
        )
    
    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        keep_unacknowledged = options['keep_unacknowledged']
        
        cutoff_date = now() - timedelta(days=days)
        
        self.stdout.write(
            self.style.SUCCESS(f'\n🗑️  Starting breach cleanup (cutoff date: {cutoff_date})\n')
        )
        
        # Build query
        query = ThresholdBreach.objects.filter(
            timestamp__lt=cutoff_date,
            acknowledged=True
        )
        
        count = query.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('✅ No breaches to clean up.'))
            return
        
        self.stdout.write(f'Found {count} breach records to clean up.')
        
        if dry_run:
            # Show details without deleting
            self.stdout.write(self.style.WARNING('🔍 DRY RUN MODE - No deletions will be performed\n'))
            
            # Show breakdown by level
            critical_count = query.filter(level='Critical').count()
            warning_count = query.filter(level='Warning').count()
            
            self.stdout.write(f'  • Critical breaches: {critical_count}')
            self.stdout.write(f'  • Warning breaches: {warning_count}')
            self.stdout.write(f'  • Total to delete: {count}\n')
            
            # Sample affected nodes
            affected_nodes = (
                query.values('node__tag_name')
                .annotate(count=models.Count('id'))
                .order_by('-count')[:5]
            )
            
            self.stdout.write('Top affected parameters:')
            for item in affected_nodes:
                self.stdout.write(f"  • {item['node__tag_name']}: {item['count']} breaches")
            
        else:
            # Actually delete
            try:
                deleted_count, _ = query.delete()
                
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Successfully deleted {deleted_count} breach records')
                )
                
                logger.info(f"Cleaned up {deleted_count} old threshold breaches")
                
            except Exception as e:
                logger.error(f"Error during breach cleanup: {e}")
                raise CommandError(f'Error deleting breaches: {e}')
        
        self.stdout.write(self.style.SUCCESS('\n✨ Cleanup complete!\n'))
