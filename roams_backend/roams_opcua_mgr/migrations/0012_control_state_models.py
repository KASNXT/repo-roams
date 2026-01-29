# Generated migration for control state models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('roams_opcua_mgr', '0011_alarmretentionpolicy_opcuanode_last_whole_number_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ControlState',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tag_type', models.CharField(choices=[('pump', 'Pump Control'), ('valve', 'Valve Control'), ('alarm', 'Alarm Control'), ('emergency', 'Emergency Stop'), ('mode', 'Mode Selection'), ('reset', 'System Reset'), ('door', 'Door Control'), ('other', 'Other Control')], default='other', help_text='Type of control this tag represents', max_length=20)),
                ('current_value', models.BooleanField(default=False, help_text='Current state of the control (True=ON/Active, False=OFF/Inactive)')),
                ('plc_value', models.BooleanField(default=False, help_text='Last confirmed state from PLC')),
                ('last_changed_at', models.DateTimeField(auto_now=True, help_text='When this state was last modified')),
                ('requires_confirmation', models.BooleanField(default=True, help_text='Whether changing this state requires admin confirmation')),
                ('confirmation_timeout', models.IntegerField(default=30, help_text='Seconds to wait for confirmation before timeout')),
                ('rate_limit_seconds', models.IntegerField(default=5, help_text='Minimum seconds between state changes to prevent rapid toggling')),
                ('is_synced_with_plc', models.BooleanField(default=False, help_text='Whether current_value matches PLC state')),
                ('sync_error_message', models.TextField(blank=True, default='', help_text='Error message if sync failed')),
                ('description', models.TextField(blank=True, default='', help_text='Description of what this control does')),
                ('danger_level', models.IntegerField(choices=[(0, '🟢 Safe - No safety impact'), (1, '🟡 Caution - Minor risk'), (2, '🔴 Danger - Major risk'), (3, '⛔ Critical - Emergency only')], default=0, help_text='Safety risk level of changing this control')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_changed_by', models.ForeignKey(blank=True, help_text='User who last modified this state', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='control_state_changes', to=settings.AUTH_USER_MODEL)),
                ('node', models.OneToOneField(help_text='Boolean OPC UA node for this control', on_delete=django.db.models.deletion.CASCADE, related_name='control_state', to='roams_opcua_mgr.opcuanode')),
            ],
            options={
                'verbose_name': 'Control State',
                'verbose_name_plural': 'Control States',
            },
        ),
        migrations.CreateModel(
            name='ControlStateRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('requested_value', models.BooleanField(help_text='Requested state change to this value')),
                ('reason', models.TextField(blank=True, default='', help_text='Reason for requested change')),
                ('status', models.CharField(choices=[('pending', 'Pending Confirmation'), ('confirmed', 'Confirmed - Executing'), ('cancelled', 'Cancelled'), ('expired', 'Confirmation Expired')], db_index=True, default='pending', max_length=20)),
                ('confirmation_token', models.CharField(help_text='Security token for confirming request', max_length=100, unique=True)),
                ('expires_at', models.DateTimeField(help_text='When this request expires if not confirmed')),
                ('confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('confirmed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='control_confirmations', to=settings.AUTH_USER_MODEL)),
                ('control_state', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pending_requests', to='roams_opcua_mgr.controlstate')),
                ('requested_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='control_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Control State Request',
                'verbose_name_plural': 'Control State Requests',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ControlStateHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('change_type', models.CharField(choices=[('requested', 'Change Requested'), ('confirmed', 'Change Confirmed'), ('executed', 'Change Executed'), ('failed', 'Change Failed'), ('synced', 'State Synced from PLC'), ('timeout', 'Confirmation Timeout'), ('cancelled', 'Change Cancelled')], help_text='Type of change event', max_length=20)),
                ('previous_value', models.BooleanField(help_text='Value before change')),
                ('requested_value', models.BooleanField(help_text='Requested new value')),
                ('final_value', models.BooleanField(blank=True, help_text='Actual final value after execution', null=True)),
                ('reason', models.TextField(blank=True, default='', help_text='Reason for the change')),
                ('error_message', models.TextField(blank=True, default='', help_text='Error details if change failed')),
                ('ip_address', models.GenericIPAddressField(blank=True, help_text='IP address of requester', null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('confirmed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='control_history_confirmations', to=settings.AUTH_USER_MODEL)),
                ('control_state', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='history', to='roams_opcua_mgr.controlstate')),
                ('requested_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='control_history_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Control State History',
                'verbose_name_plural': 'Control State Histories',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='ControlPermission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('permission_level', models.CharField(choices=[('view', 'View Only'), ('request', 'Request Change (requires confirmation)'), ('execute', 'Execute Change (immediate, no confirmation)')], default='request', help_text='What this user can do with this control', max_length=20)),
                ('is_active', models.BooleanField(default=True, help_text='Whether this permission is currently active')),
                ('granted_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(blank=True, help_text='When this permission expires (null = never)', null=True)),
                ('control_state', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='permissions', to='roams_opcua_mgr.controlstate')),
                ('granted_by', models.ForeignKey(help_text='Admin who granted this permission', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='control_permissions_granted', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='control_permissions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Control Permission',
                'verbose_name_plural': 'Control Permissions',
                'unique_together': {('user', 'control_state')},
            },
        ),
        migrations.AddIndex(
            model_name='controlstate',
            index=models.Index(fields=['node'], name='roams_opcua_node_id_idx'),
        ),
        migrations.AddIndex(
            model_name='controlstate',
            index=models.Index(fields=['tag_type'], name='roams_opcua_tag_type_idx'),
        ),
        migrations.AddIndex(
            model_name='controlstate',
            index=models.Index(fields=['last_changed_at'], name='roams_opcua_last_changed_idx'),
        ),
        migrations.AddIndex(
            model_name='controlstaterequest',
            index=models.Index(fields=['status', 'expires_at'], name='roams_opcua_status_expires_idx'),
        ),
        migrations.AddIndex(
            model_name='controlstaterequest',
            index=models.Index(fields=['control_state', 'status'], name='roams_opcua_control_status_idx'),
        ),
        migrations.AddIndex(
            model_name='controlstatehistory',
            index=models.Index(fields=['control_state', '-timestamp'], name='roams_opcua_control_timestamp_idx'),
        ),
        migrations.AddIndex(
            model_name='controlstatehistory',
            index=models.Index(fields=['requested_by', '-timestamp'], name='roams_opcua_requester_timestamp_idx'),
        ),
        migrations.AddIndex(
            model_name='controlstatehistory',
            index=models.Index(fields=['change_type'], name='roams_opcua_change_type_idx'),
        ),
        migrations.AddIndex(
            model_name='controlpermission',
            index=models.Index(fields=['user', 'is_active'], name='roams_opcua_user_active_idx'),
        ),
        migrations.AddIndex(
            model_name='controlpermission',
            index=models.Index(fields=['control_state'], name='roams_opcua_control_state_idx'),
        ),
    ]
