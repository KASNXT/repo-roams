#!/bin/bash
# Generate passwordless certificate for Qixiang QX310 router
# Run on VPS: ssh root@144.91.79.167
# Then: bash ~/generate_qx310_cert.sh

cd ~/openvpn-ca

echo "========================================="
echo "Generating NEW passwordless certificate for QX310"
echo "========================================="

# Generate certificate WITHOUT password (nopass flag)
./easyrsa build-client-full qx310 nopass

echo ""
echo "========================================="
echo "Extracting certificate files..."
echo "========================================="

# Extract the 3 required files
cat pki/ca.crt > /root/ca.crt
cat pki/issued/qx310.crt > /root/qx310.crt
cat pki/private/qx310.key > /root/qx310.key

# Verify files
echo ""
echo "Files created:"
ls -lh /root/ca.crt /root/qx310.crt /root/qx310.key

echo ""
echo "Verifying qx310.key is NOT encrypted..."
head -2 /root/qx310.key

echo ""
echo "========================================="
echo "SUCCESS! Download these 3 files:"
echo "  /root/ca.crt"
echo "  /root/qx310.crt"
echo "  /root/qx310.key (NO PASSWORD)"
echo ""
echo "Upload to QX310 router:"
echo "  CA Certificate: ca.crt"
echo "  Client Certificate: qx310.crt"
echo "  Client Key: qx310.key"
echo "  cert_pass: LEAVE BLANK"
echo "========================================="
