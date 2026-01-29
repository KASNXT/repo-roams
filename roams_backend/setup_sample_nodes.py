#!/usr/bin/env python
"""
Sample setup script to configure your OPC UA nodes with UI display settings
Based on the Bombo OPC UA nodes you provided
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "roams_pro.settings")
django.setup()

from roams_opcua_mgr.models import OPCUANode, OpcUaClientConfig, TagName

def create_sample_nodes():
    """Create sample node configurations for your Bombo OPC UA system"""
    
    # Get or create client config (adjust to match your setup)
    try:
        client_config = OpcUaClientConfig.objects.first()
        if not client_config:
            print("❌ No OPC UA client configuration found. Create one in Django admin first.")
            return
    except:
        print("❌ Could not connect to database. Run migrations first.")
        return
    
    # Define your monitoring nodes (BOMBO)
    monitoring_nodes = [
        {
            "name": "VOLTAGE",
            "node_id": "ns=2;i=3856758799",
            "data_type": "Float",
            "display_type": "gauge",
            "tag_units": "V",
            "decimal_places": 2,
            "display_min": 0,
            "display_max": 500,
            "min_value": 90,
            "max_value": 270,
            "warning_level": 190,
            "critical_level": 180,
            "icon": "zap",
            "is_boolean_control": False,
        },
        {
            "name": "CURRENT",
            "node_id": "ns=2;i=4000118910",
            "data_type": "Float",
            "display_type": "gauge",
            "tag_units": "A",
            "decimal_places": 2,
            "display_min": 0,
            "display_max": 100,
            "min_value": 0,
            "max_value": 80,
            "warning_level": 60,
            "critical_level": 75,
            "icon": "zap",
            "is_boolean_control": False,
        },
        {
            "name": "kWh",
            "node_id": "ns=2;i=13494492",
            "data_type": "Float",
            "display_type": "numeric",
            "tag_units": "kWh",
            "decimal_places": 3,
            "display_min": 0,
            "display_max": 100000,
            "icon": "zap",
            "is_boolean_control": False,
        },
        {
            "name": "Hour Run",
            "node_id": "ns=2;i=1913872906",
            "data_type": "Float",
            "display_type": "numeric",
            "tag_units": "hours",
            "decimal_places": 1,
            "display_min": 0,
            "display_max": 100000,
            "icon": "settings",
            "is_boolean_control": False,
        },
    ]
    
    # Define your production nodes
    production_nodes = [
        {
            "name": "Well Levels",
            "node_id": "ns=2;i=670629055",
            "data_type": "UInt16",
            "display_type": "gauge-circular",
            "tag_units": "m",
            "decimal_places": 1,
            "display_min": 0,
            "display_max": 100,
            "min_value": 0,
            "max_value": 100,
            "warning_level": 25,
            "critical_level": 10,
            "icon": "droplet",
            "is_boolean_control": False,
        },
        {
            "name": "Line Pressure",
            "node_id": "ns=2;i=2130214757",
            "data_type": "Int16",
            "display_type": "gauge",
            "tag_units": "bar",
            "decimal_places": 1,
            "display_min": 0,
            "display_max": 10,
            "min_value": 0,
            "max_value": 8,
            "warning_level": 7,
            "critical_level": 8.5,
            "icon": "gauge",
            "is_boolean_control": False,
        },
        {
            "name": "Power Status",
            "node_id": "ns=2;i=3323654524",
            "data_type": "Boolean",
            "display_type": "status-indicator",
            "tag_units": "",
            "decimal_places": 0,
            "icon": "zap",
            "is_boolean_control": True,
        },
        {
            "name": "Pump Running",
            "node_id": "ns=2;i=1191188298",
            "data_type": "Boolean",
            "display_type": "switch",
            "tag_units": "",
            "decimal_places": 0,
            "icon": "settings",
            "is_boolean_control": True,
        },
        {
            "name": "Flow Rate",
            "node_id": "ns=2;i=3824145987",
            "data_type": "Float",
            "display_type": "progress",
            "tag_units": "m³/h",
            "decimal_places": 2,
            "display_min": 0,
            "display_max": 150,
            "min_value": 0,
            "max_value": 150,
            "warning_level": 140,
            "critical_level": 150,
            "icon": "droplet",
            "is_boolean_control": False,
        },
        {
            "name": "Total Production",
            "node_id": "ns=2;i=4069283420",
            "data_type": "Float",
            "display_type": "numeric",
            "tag_units": "m³",
            "decimal_places": 2,
            "display_min": 0,
            "display_max": 1000000,
            "icon": "droplet",
            "is_boolean_control": False,
        },
        {
            "name": "UPS Power Status",
            "node_id": "ns=2;i=3323654524",
            "data_type": "Boolean",
            "display_type": "status-indicator",
            "tag_units": "",
            "decimal_places": 0,
            "icon": "battery",
            "is_boolean_control": False,
        },
        {
            "name": "Panel Door",
            "node_id": "ns=2;i=2180024782",
            "data_type": "Boolean",
            "display_type": "status-indicator",
            "tag_units": "",
            "decimal_places": 0,
            "icon": "alert",
            "is_boolean_control": False,
        },
    ]
    
    all_nodes = monitoring_nodes + production_nodes
    
    created_count = 0
    skipped_count = 0
    
    for node_data in all_nodes:
        tag_name_str = node_data.pop("name")
        node_id = node_data["node_id"]
        
        # Get or create tag
        tag_name, created = TagName.objects.get_or_create(
            name=tag_name_str,
            defaults={"tag_units": node_data.get("tag_units", "")}
        )
        
        # Create node
        node, created = OPCUANode.objects.update_or_create(
            client_config=client_config,
            node_id=node_id,
            defaults={
                "tag_name": tag_name,
                **node_data
            }
        )
        
        if created:
            print(f"✅ Created: {tag_name_str} ({node_id})")
            created_count += 1
        else:
            print(f"🔄 Updated: {tag_name_str} ({node_id})")
            skipped_count += 1
    
    print(f"\n✨ Setup complete! Created: {created_count}, Updated: {skipped_count}")


if __name__ == "__main__":
    create_sample_nodes()
