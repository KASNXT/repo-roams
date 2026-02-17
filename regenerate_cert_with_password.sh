#!/bin/bash
# Run this script on VPS: ssh root@144.91.79.167
# Then: bash ~/regenerate_cert_with_password.sh

cd ~/openvpn-ca

echo "Step 1: Revoking old passwordless certificate..."
echo "yes" | ./easyrsa revoke Bombo_BH2-station

echo "Step 2: Generating Certificate Revocation List..."
./easyrsa gen-crl
sudo cp ~/openvpn-ca/pki/crl.pem /etc/openvpn/server/

echo ""
echo "========================================="
echo "Step 3: Generating NEW certificate WITH password"
echo "You will be prompted to create a password"
echo "Use something like: Bombo2026!"
echo "========================================="
echo ""

# Generate certificate WITH password (will prompt for password)
./easyrsa build-client-full Bombo_BH2-station

echo ""
echo "========================================="
echo "Step 4: Extracting certificate files..."
echo "========================================="

# Extract files
cat pki/issued/Bombo_BH2-station.crt > /root/client-encrypted.crt
cat pki/private/Bombo_BH2-station.key > /root/client-encrypted.key

echo ""
echo "Verifying the key is encrypted..."
head -5 /root/client-encrypted.key

echo ""
echo "========================================="
echo "SUCCESS! Files created:"
echo "  /root/client-encrypted.crt"
echo "  /root/client-encrypted.key"
echo ""
echo "Download these files and upload to router"
echo "IMPORTANT: Enter the password you just created in the cert_pass field!"
echo "========================================="
