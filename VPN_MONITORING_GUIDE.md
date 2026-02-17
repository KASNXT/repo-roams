# VPN Monitoring Configuration Guide for VPS

## Quick Access Summary

### Local Development (Localhost)
- **Frontend**: http://localhost:5173
- **Login**: test / test123
- **Backend**: http://localhost:8000/api/
- **Status**: ✅ Running with OPC UA disabled (fast response)

### Production (VPS)
- **Frontend**: http://144.91.79.167
- **Backend**: http://144.91.79.167:8000/api/
- **VPN Endpoint**: http://144.91.79.167:8000/api/vpn-monitor/all_connections/
- **Status**: ✅ Deployed (requires admin authentication)

---

## VPN Monitoring Setup on VPS

### Current Deployment Status: ✅ COMPLETE

| Component | Status | Details |
|-----------|--------|---------|
| Backend API | ✅ Deployed | vpn_views.py with 4 endpoints |
| Frontend UI | ✅ Deployed | VPNConnections.tsx component |
| NetworkTab | ✅ Updated | Includes VPN card for admins |
| Django Service | ✅ Running | Since 2026-02-07 23:11:50 CET |
| Frontend Build | ✅ Latest | index-DSkJKjg0.js (1.2MB) |

---

## VPN Data Sources Configuration

### 1. OpenVPN Status Log

**Purpose**: Display connected OpenVPN clients

**Setup Commands** (run on VPS as root):
```bash
# Edit OpenVPN server configuration
nano /etc/openvpn/server.conf

# Add these lines if not present:
status /var/log/openvpn/openvpn-status.log
status-version 2

# Set permissions
chmod 644 /var/log/openvpn/openvpn-status.log

# Restart OpenVPN
systemctl restart openvpn@server
```

**Verify**:
```bash
# Check if status log exists and is being updated
ls -lh /var/log/openvpn/openvpn-status.log
tail -20 /var/log/openvpn/openvpn-status.log

# Should show output like:
# OpenVPN CLIENT LIST
# Updated,Thu Feb  8 12:00:00 2026
# Common Name,Real Address,Bytes Received,Bytes Sent,Connected Since
# client1,192.168.1.100:1194,12345,67890,Thu Feb  8 10:00:00 2026
```

---

### 2. L2TP/IPsec Status (strongSwan)

**Purpose**: Display connected L2TP/IPsec clients

**Setup Commands**:
```bash
# Install strongSwan if not present
apt-get install strongswan

# Test ipsec command
ipsec statusall

# If Django runs as www-data (not root), grant sudo access:
echo 'www-data ALL=(ALL) NOPASSWD: /usr/sbin/ipsec statusall' > /etc/sudoers.d/django-ipsec
chmod 440 /etc/sudoers.d/django-ipsec
```

**Verify**:
```bash
# Check IPsec service status
systemctl status strongswan
# or
systemctl status ipsec

# Test status command
ipsec statusall

# Should show output like:
# Security Associations (1 up, 0 connecting):
#   l2tp-psk[1]: ESTABLISHED 2 hours ago
#     192.168.1.1[%any]...192.168.1.100[%any]
```

---

### 3. Django Service Permissions

**Check which user runs Django**:
```bash
systemctl show -p User roams-django.service

# If output is empty, Django runs as root (no additional permissions needed)
# If output shows a user (e.g., www-data), grant file/command access
```

**If Django runs as non-root user**:
```bash
# Grant read access to OpenVPN log
chown root:www-data /var/log/openvpn/openvpn-status.log
chmod 640 /var/log/openvpn/openvpn-status.log

# Grant ipsec command access (add to sudoers)
echo 'www-data ALL=(ALL) NOPASSWD: /usr/sbin/ipsec statusall' > /etc/sudoers.d/django-ipsec
chmod 440 /etc/sudoers.d/django-ipsec
```

---

## Testing VPN Monitoring

### Backend API Test (SSH to VPS)

```bash
# Test endpoint without auth (should return 401)
curl http://localhost:8000/api/vpn-monitor/all_connections/
# Expected: {"detail":"Authentication credentials were not provided."}

# Get admin token
TOKEN=$(curl -s -X POST http://localhost:8000/api-token-auth/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_ADMIN_PASSWORD"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Test with authentication
curl -H "Authorization: Token $TOKEN" \
  http://localhost:8000/api/vpn-monitor/all_connections/
  
# Expected output (if no VPN configured):
# {
#   "total_connections": 0,
#   "openvpn_count": 0,
#   "l2tp_count": 0,
#   "clients": [],
#   "servers": {"openvpn": false, "l2tp": false},
#   "last_updated": "2026-02-08T12:00:00Z"
# }
```

---

## Frontend Access

### View VPN Connections Card

**Steps**:
1. **Open browser**: http://144.91.79.167
2. **Login** with admin credentials:
   - **Eng_Hillary** / munnolary@gmail.com
   - **admin** user
   - **kasmic** / mkasiita@gmail.com (superuser)
3. **Navigate**: Settings → Network tab
4. **Scroll down** to VPN Connections card

**What You Should See**:

```
┌─────────────────────────────────────────────┐
│ 🖧 VPN Connections                          │
├─────────────────────────────────────────────┤
│ Server Status:                              │
│   OpenVPN: 🟢 Active (3 clients)            │
│   L2TP/IPSec: 🟢 Active (1 client)          │
│                                             │
│ Active Connections: 4                       │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Client IP  │ Type     │ Duration │ Data││ │
│ ├────────────┼──────────┼──────────┼─────┤│ │
│ │ 10.8.0.2   │ OpenVPN  │ 2h 15m   │ ↓↑  ││ │
│ │ 10.8.0.3   │ OpenVPN  │ 1h 30m   │ ↓↑  ││ │
│ │ 192.168.1…│ L2TP     │ 45m      │ ↓↑  ││ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 🔄 Auto-refresh: ON (10s)    [Refresh Now] │
└─────────────────────────────────────────────┘
```

**If VPN is not configured**, you'll see:
```
┌─────────────────────────────────────────────┐
│ 🖧 VPN Connections                          │
├─────────────────────────────────────────────┤
│ Server Status:                              │
│   OpenVPN: ⚪ Not configured                │
│   L2TP/IPSec: ⚪ Not configured             │
│                                             │
│ Active Connections: 0                       │
│                                             │
│ No active VPN connections                   │
│                                             │
│ Configure VPN servers to see client data    │
└─────────────────────────────────────────────┘
```

---

## Troubleshooting

### VPN Card Not Visible

**Possible causes**:
1. ❌ **Not logged in as admin**
   - Solution: Login with admin/staff user (Eng_Hillary, admin, kasmic)
   
2. ❌ **Frontend not rebuilt**
   - Solution: SSH to VPS and rebuild
   ```bash
   cd /opt/roams/roams_frontend
   npm run build
   systemctl reload nginx
   ```

3. ❌ **Browser cache**
   - Solution: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### VPN Endpoint Returns 500 Error

**Check Django logs**:
```bash
journalctl -u roams-django -n 100 -f
```

**Common issues**:
- OpenVPN log file doesn't exist or is not readable
- ipsec command requires sudo but Django user doesn't have permission
- File permission issues

**Solution**:
```bash
# Create empty log if missing
touch /var/log/openvpn/openvpn-status.log
chmod 644 /var/log/openvpn/openvpn-status.log

# Grant ipsec permission
echo 'www-data ALL=(ALL) NOPASSWD: /usr/sbin/ipsec statusall' > /etc/sudoers.d/django-ipsec
```

### No VPN Clients Showing

**This is expected if**:
- No OpenVPN server is configured
- No clients are currently connected
- Status logging is not enabled in OpenVPN config

**To verify OpenVPN is working**:
```bash
# Check OpenVPN service
systemctl status openvpn@server

# Check if clients are connected
cat /var/log/openvpn/openvpn-status.log
```

---

## API Endpoints Reference

### VPN Monitoring Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/vpn-monitor/all_connections/` | GET | Admin | Combined VPN status |
| `/api/vpn-monitor/openvpn_status/` | GET | Admin | OpenVPN only |
| `/api/vpn-monitor/l2tp_status/` | GET | Admin | L2TP/IPsec only |
| `/api/vpn-monitor/disconnect_client/` | POST | Admin | Disconnect client* |

*Disconnect feature is a placeholder for future implementation

### Response Format

```json
{
  "total_connections": 4,
  "openvpn_count": 3,
  "l2tp_count": 1,
  "servers": {
    "openvpn": true,
    "l2tp": true
  },
  "clients": [
    {
      "client_ip": "10.8.0.2",
      "vpn_type": "OpenVPN",
      "connected_since": "2026-02-08T10:00:00Z",
      "bytes_sent": 1234567,
      "bytes_received": 7654321,
      "virtual_ip": "10.8.0.2",
      "real_address": "192.168.1.100:52341"
    }
  ],
  "last_updated": "2026-02-08T12:30:45Z"
}
```

---

## Security Notes

1. **Admin-Only Access**: VPN monitoring is restricted to admin users only
   - Backend: `IsAdminUser` permission class
   - Frontend: Role check (`user.role === 'admin' || user.is_staff`)

2. **File Permissions**: Ensure VPN log files are not world-readable
   - Recommended: `chmod 640` (owner read/write, group read)
   - Django user should be in appropriate group

3. **Sudo Access**: If granting sudo for ipsec commands:
   - Use `NOPASSWD` only for specific command
   - Don't grant full sudo access
   - Validate sudoers syntax with `visudo -c`

---

## Summary Checklist

### ✅ Completed (Already Deployed)
- [x] VPN monitoring backend API (vpn_views.py)
- [x] VPN monitoring frontend component (VPNConnections.tsx)
- [x] NetworkTab integration
- [x] Frontend built and deployed on VPS
- [x] Django service running on VPS

### 📝 VPS Configuration Needed (Optional)
- [ ] Configure OpenVPN status logging
- [ ] Set file permissions for Django user
- [ ] Grant ipsec command access (if needed)
- [ ] Test VPN endpoints with admin token
- [ ] Verify frontend displays VPN card

### 🧪 Testing Required
- [ ] Login to VPS web interface as admin
- [ ] Navigate to Settings → Network tab
- [ ] Verify VPN Connections card is visible
- [ ] Check if VPN status displays correctly (or shows "not configured")

---

## Next Steps

1. **Test Local Frontend Now**:
   - Open http://localhost:5173
   - Login with test/test123
   - Go to Settings → Network
   - Verify VPN card appears (will show "not configured" locally)

2. **Access VPS Web Interface**:
   - Open http://144.91.79.167
   - Login as admin
   - Go to Settings → Network
   - Check VPN Connections card

3. **Configure VPN Sources** (if you have VPN servers):
   - Follow OpenVPN setup section
   - Follow L2TP/IPsec setup section
   - Restart Django service
   - Verify data appears in card

---

**The VPN monitoring feature is fully deployed and ready to use!** 🎉

The card will appear for admin users immediately. VPN data will show once you configure the VPN server status sources.
