# Generated migration - simplified to only add device specs model

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('roams_opcua_mgr', '0013_alter_authenticationsetting_client_config'),
    ]

    operations = [
        migrations.CreateModel(
            name='StationDeviceSpecifications',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('motor_power_rating', models.FloatField(blank=True, help_text='Motor power rating in kW. From device nameplate.', null=True, validators=[django.core.validators.MinValueValidator(0.1)], verbose_name='Motor Power Rating (kW)')),
                ('rated_current', models.FloatField(blank=True, help_text='Rated motor current in Amperes (A). From device nameplate.', null=True, validators=[django.core.validators.MinValueValidator(0.1)], verbose_name='Rated Current (A)')),
                ('rated_flow_rate', models.FloatField(blank=True, help_text='Pump rated flow rate in m³/h (cubic meters per hour). From device nameplate.', null=True, validators=[django.core.validators.MinValueValidator(0.1)], verbose_name='Rated Flow Rate (m³/h)')),
                ('rated_head', models.FloatField(blank=True, help_text='Pump rated head in meters (m). From device nameplate.', null=True, validators=[django.core.validators.MinValueValidator(0.1)], verbose_name='Rated Head (m)')),
                ('rated_pressure_bar', models.FloatField(blank=True, help_text='Pump rated pressure in bar. If using this instead of head, it will be converted (1 bar = 10.197 m head).', null=True, validators=[django.core.validators.MinValueValidator(0.1)], verbose_name='Rated Pressure (Bar)')),
                ('device_model', models.CharField(blank=True, help_text='Motor/pump model number from nameplate', max_length=255, null=True)),
                ('manufacturer', models.CharField(blank=True, help_text='Device manufacturer name', max_length=255, null=True)),
                ('serial_number', models.CharField(blank=True, help_text='Device serial number', max_length=255, null=True)),
                ('installation_date', models.DateField(blank=True, help_text='When the device was installed', null=True)),
                ('last_maintenance', models.DateField(blank=True, help_text='Date of last maintenance', null=True)),
                ('notes', models.TextField(blank=True, help_text='Additional notes about the device or performance expectations', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('station', models.OneToOneField(help_text='The station this device belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='device_specs', to='roams_opcua_mgr.opcuaclientconfig')),
            ],
            options={
                'verbose_name': 'Station Device Specifications',
                'verbose_name_plural': 'Station Device Specifications',
            },
        ),
        migrations.AddIndex(
            model_name='stationdevicespecifications',
            index=models.Index(fields=['station'], name='roams_opcua_station_88d006_idx'),
        ),
    ]
