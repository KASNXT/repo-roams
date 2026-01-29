#!/usr/bin/env python
"""Manually start OPC UA clients"""
import os
import sys
import django
import time

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'roams_pro.settings')
django.setup()

from roams_opcua_mgr.opcua_client import start_opcua_clients

print("Starting OPC UA clients...")
start_opcua_clients()

# Keep running
print("OPC UA clients started. Press Ctrl+C to stop.")
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nStopping...")
