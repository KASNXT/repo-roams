#!/usr/bin/env python3
"""Test script to verify role field in API response"""

import requests
import json

# Test local backend
url = "http://localhost:8000/api/users/"

# Get token (you'll need to replace this with actual token)
token_file = "/tmp/roams_test_token.txt"
try:
    with open(token_file) as f:
        token = f.read().strip()
except FileNotFoundError:
    print("Token file not found. Please login first:")
    print("  POST http://localhost:8000/api-token-auth/")
    print('  {"username": "admin", "password": "yourpassword"}')
    print()
    print("Or create token file:")
    print(f"  echo 'YOUR_TOKEN_HERE' > {token_file}")
    exit(1)

headers = {"Authorization": f"Token {token}"}

response = requests.get(url, headers=headers)

if response.status_code == 200:
    users = response.json()
    print("\n✅ API Response successful")
    print(f"\nTotal users: {len(users)}\n")
    print("User roles:")
    print("-" * 60)
    for user in users:
        role = user.get('role', '❌ NO ROLE FIELD')
        print(f"  {user['username']:15} | Role: {role:15} | Staff: {user['is_staff']}")
    print()
    
    # Check if mugerwa exists
    mugerwa = next((u for u in users if u['username'] == 'mugerwa'), None)
    if mugerwa:
        print(f"\n🔍 Mugerwa user found:")
        print(f"  Username: {mugerwa['username']}")
        print(f"  Role: {mugerwa.get('role', '❌ NO ROLE')}")
        print(f"  Expected: technician")
        if mugerwa.get('role') == 'technician':
            print("  ✅ Role is correct!")
        else:
            print(f"  ❌ Role mismatch! Got '{mugerwa.get('role')}' instead of 'technician'")
else:
    print(f"❌ API Error: {response.status_code}")
    print(response.text)
