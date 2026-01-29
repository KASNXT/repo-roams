# Generated migration to change CASCADE to DO_NOTHING

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('roams_opcua_mgr', '0012_control_state_models'),
    ]

    operations = [
        migrations.AlterField(
            model_name='authenticationsetting',
            name='client_config',
            field=models.OneToOneField(help_text='Link to the OPCUA Client Configuration.', on_delete=django.db.models.deletion.DO_NOTHING, to='roams_opcua_mgr.opcuaclientconfig'),
        ),
    ]
