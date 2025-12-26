# Generated migration to consolidate threshold models
# Moves threshold fields from TagThreshold into OPCUANode model

from django.db import migrations, models
import django.db.models.deletion
from django.utils.timezone import now


class Migration(migrations.Migration):

    dependencies = [
        ('roams_opcua_mgr', '0007_tagthreshold_thresholdbreach_and_more'),
    ]

    operations = [
        # Add threshold-related fields to OPCUANode
        migrations.AddField(
            model_name='opcuanode',
            name='warning_level',
            field=models.FloatField(blank=True, help_text='Value at which a warning is triggered', null=True),
        ),
        migrations.AddField(
            model_name='opcuanode',
            name='critical_level',
            field=models.FloatField(blank=True, help_text='Value at which a critical alert is triggered', null=True),
        ),
        migrations.AddField(
            model_name='opcuanode',
            name='severity',
            field=models.CharField(
                choices=[('Warning', 'Warning'), ('Critical', 'Critical')],
                default='Warning',
                help_text='Default severity level for breaches',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='opcuanode',
            name='threshold_active',
            field=models.BooleanField(default=True, help_text='Whether threshold monitoring is active for this node'),
        ),
        migrations.AddField(
            model_name='opcuanode',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='opcuanode',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        
        # Update ThresholdBreach to remove reference to TagThreshold
        migrations.RemoveField(
            model_name='thresholdbreach',
            name='threshold',
        ),
        
        # Add ThresholdBreach indexes
        migrations.AddIndex(
            model_name='thresholdbreach',
            index=models.Index(fields=['node', 'timestamp'], name='roams_opcua_node_timestamp_idx'),
        ),
        migrations.AddIndex(
            model_name='thresholdbreach',
            index=models.Index(fields=['level', 'acknowledged', 'timestamp'], name='roams_opcua_level_ack_time_idx'),
        ),
        migrations.AddIndex(
            model_name='thresholdbreach',
            index=models.Index(fields=['timestamp'], name='roams_opcua_timestamp_idx'),
        ),
        
        # Add OPCUANode indexes
        migrations.AddIndex(
            model_name='opcuanode',
            index=models.Index(fields=['threshold_active', 'updated_at'], name='roams_opcua_threshold_updated_idx'),
        ),
        
        # Delete TagThreshold model (drop the old threshold table)
        migrations.DeleteModel(
            name='TagThreshold',
        ),
    ]
