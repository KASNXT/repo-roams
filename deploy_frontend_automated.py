#!/usr/bin/env python3
"""Deploy ROAMS Frontend to VPS"""

import subprocess
import sys

VPS_IP = "144.91.79.167"
VPS_PASSWORD = "lWCc5Ss72c5s3gBMWa6G46NOPJUuw"
FRONTEND_DIR = "/opt/roams_pro/roams_frontend"
NGINX_ROOT = "/var/www/html"

def run_ssh_command(command):
    """Execute SSH command with password"""
    ssh_cmd = f"sshpass -p '{VPS_PASSWORD}' ssh -o StrictHostKeyChecking=no root@{VPS_IP} '{command}'"
    try:
        result = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True, timeout=300)
        if result.returncode != 0 and result.stderr:
            print(f"Error: {result.stderr}", file=sys.stderr)
        return result.stdout
    except subprocess.TimeoutExpired:
        print("Command timed out", file=sys.stderr)
        return None

def main():
    print("=" * 50)
    print("ROAMS Frontend Deployment to VPS")
    print("=" * 50)
    print()

    # Step 1: Check NGINX config
    print("Step 1/6: Checking NGINX configuration...")
    nginx_config = run_ssh_command("cat /etc/nginx/sites-enabled/default 2>/dev/null | grep -E 'root|location' | head -10")
    print(nginx_config)
    
    # Step 2: Pull latest code
    print("\nStep 2/6: Pulling latest code from GitHub...")
    output = run_ssh_command("cd /opt/roams_pro && git pull origin main 2>&1 | tail -5")
    print(output)
    
    # Step 3: Check Node.js version
    print("\nStep 3/6: Checking Node.js installation...")
    node_version = run_ssh_command("which node && node --version")
    print(node_version or "Node.js not found")
    
    # Step 4: Install dependencies
    print("\nStep 4/6: Installing npm dependencies...")
    output = run_ssh_command(f"cd {FRONTEND_DIR} && npm install 2>&1 | tail -10")
    print(output)
    
    # Step 5: Build production frontend
    print("\nStep 5/6: Building production frontend...")
    output = run_ssh_command(f"cd {FRONTEND_DIR} && npm run build 2>&1 | tail -10")
    print(output)
    
    # Step 6: Deploy to NGINX
    print("\nStep 6/6: Deploying to NGINX...")
    commands = f"rm -rf {NGINX_ROOT}/* && cp -r {FRONTEND_DIR}/dist/* {NGINX_ROOT}/ && systemctl restart nginx && echo 'Deployment complete!'"
    output = run_ssh_command(commands)
    print(output)
    
    print("\n" + "=" * 50)
    print("🚀 Frontend deployment complete!")
    print(f"Visit: http://{VPS_IP}")
    print("=" * 50)

if __name__ == "__main__":
    main()
