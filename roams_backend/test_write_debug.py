#!/usr/bin/env python
"""Debug script to test writing to node 29"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'roams_pro.settings')
django.setup()

from roams_opcua_mgr.models import OPCUANode
from roams_opcua_mgr.opcua_client import get_active_client
from roams_opcua_mgr.write_data import write_station_node
from django.utils.timezone import now
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_write_node_29():
    """Test writing to node 29"""
    try:
        # Get node 29
        node = OPCUANode.objects.get(pk=29)
        print(f"\n{'='*60}")
        print(f"NODE 29 DETAILS:")
        print(f"{'='*60}")
        print(f"Tag Name: {node.tag_name}")
        print(f"Data Type: {node.data_type}")
        print(f"Node ID: {node.node_id}")
        print(f"Is Control: {node.is_boolean_control}")
        print(f"Access Level: {node.access_level}")
        print(f"Station: {node.client_config.station_name if node.client_config else 'None'}")
        print(f"Station Active: {node.client_config.active if node.client_config else 'N/A'}")
        
        # Get station
        station = node.client_config
        if not station:
            print("\n❌ ERROR: Node has no station configured!")
            return
        
        print(f"\n{'='*60}")
        print(f"STATION DETAILS:")
        print(f"{'='*60}")
        print(f"Name: {station.station_name}")
        print(f"Active: {station.active}")
        print(f"URL: {station.endpoint_url}")
        print(f"Connection Status: {station.connection_status}")
        
        # Check if station is active
        if not station.active:
            print(f"\n❌ ERROR: Station {station.station_name} is inactive!")
            return
        
        # Try to get active client
        print(f"\n{'='*60}")
        print(f"GETTING ACTIVE CLIENT:")
        print(f"{'='*60}")
        try:
            client = get_active_client(station)
            if client:
                print(f"✅ Got active client for {station.station_name}")
                print(f"Client type: {type(client)}")
                print(f"Client connected: {hasattr(client, '_uaclient') and client._uaclient is not None}")
            else:
                print(f"❌ ERROR: No active client for {station.station_name}")
                return
        except Exception as e:
            print(f"❌ ERROR getting client: {e}")
            import traceback
            traceback.print_exc()
            return
        
        # Try to write value 1 (True)
        print(f"\n{'='*60}")
        print(f"WRITING VALUE:")
        print(f"{'='*60}")
        write_value = True
        print(f"Writing: {write_value} to {node.tag_name}")
        
        try:
            success = write_station_node(client, node, write_value, "TEST_WRITE")
            if success:
                print(f"✅ Write successful!")
            else:
                print(f"❌ Write failed!")
        except Exception as e:
            print(f"❌ EXCEPTION during write: {e}")
            import traceback
            traceback.print_exc()
        
        print(f"\n{'='*60}")
        print(f"TEST COMPLETED")
        print(f"{'='*60}\n")
        
    except OPCUANode.DoesNotExist:
        print("❌ ERROR: Node 29 not found in database!")
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_write_node_29()
