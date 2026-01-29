# Frontend URL Configuration Guide

## Overview

The enhanced **Network Tab** in the Settings page provides a complete configuration management system for frontend deployment across different environments. This guide explains how to adjust URLs and configure the system for your deployment needs.

---

## 📍 How to Access URL Configuration

### 1. Open Settings
- Click the **⚙️ Settings** icon in the sidebar
- Navigate to the **Network** tab

### 2. Current Configuration Display
The page shows:
- **Current Environment**: Which environment you're using (Development/Staging/Production)
- **Current Server URL**: The backend API address your frontend is connecting to
- **Copy Button**: One-click copy of current URL

---

## 🎯 Three Ways to Adjust the URL

### Method 1: Quick Environment Presets (Recommended for Easy Switching)

**Best for:** Switching between dev/staging/production environments

**Steps:**
1. Open **Settings → Network Tab**
2. Look for the **Environment Presets** section
3. Click one of the three buttons:
   - 🔧 **Development** - Localhost on your machine
   - 🧪 **Staging** - AWS Cape Town or test server
   - 🚀 **Production** - Live server in Uganda

**What happens:**
- All settings automatically adjust to optimized values for that environment
- URL, timeouts, health checks, logging level change instantly
- Click **"Save All Configuration"** to persist

**Pre-configured URLs:**
```
Development  → http://localhost:8000
Staging      → https://api-staging.example.com
Production   → https://api.example.com
```

### Method 2: Manual URL Entry (For Custom Addresses)

**Best for:** Custom IP addresses, local network servers, or temporary testing

**Steps:**
1. Open **Settings → Network Tab**
2. Go to **Backend Server Configuration** section
3. In the "Server URL" field, enter your custom URL:
   ```
   http://192.168.1.50:8000          # Local network server
   http://54.100.200.300:8000         # AWS EC2 IP
   https://api.mycompany.com:8443     # Custom domain with HTTPS
   ```
4. Click **"Save & Test"** to:
   - Validate the URL format
   - Test connection to the server
   - Show success/error message
5. **Refresh the page** to apply changes

**Valid URL Formats:**
```
✅ http://localhost:8000
✅ http://192.168.1.50:8000
✅ https://api.example.com
✅ https://api.example.com:8443
✅ http://10.0.0.1:3000

❌ localhost:8000                    (missing http://)
❌ api.example.com                   (missing protocol)
❌ ftp://server:8000                 (unsupported protocol)
```

### Method 3: Copy & Share Configuration

**Best for:** Team deployment or backup/restore settings

**Steps:**
1. Click the 📋 **Copy** button next to your server URL
2. The URL is copied to clipboard
3. Send to team members or document for later use
4. They can paste directly in their Network Tab

---

## 🔧 Configuration Components

### Backend Server Configuration
```
URL: http://localhost:8000
     └─ Controls where your frontend sends API requests
     └─ Must be accessible from your device/network
     └─ Must match backend Django server address
```

### API Settings
```
Request Timeout: 15,000 - 30,000 ms (milliseconds)
  └─ How long to wait for backend responses
  └─ Lower = Faster failure detection (better for slow networks)
  └─ Higher = More tolerance for slow backends
  
Request Retries: 1 - 5 attempts
  └─ How many times to retry failed requests
  └─ Helps recover from temporary network issues
```

### OPC UA Settings
```
Health Check Interval: 10 - 120 seconds
  └─ How often to verify OPC UA connection is healthy
  └─ Recommended for Uganda: 35 seconds
  
Reconnection Max Delay: 30 - 300 seconds
  └─ Maximum wait time between reconnection attempts
  └─ Uses exponential backoff: 1s → 2s → 4s → ... → max
```

### Logging Level
```
🔍 Debug   → Verbose - Shows all messages (Development)
ℹ️ Info    → Normal  - Important events only (Staging)
⚠️ Warn    → Warnings only (Light Production)
❌ Error   → Errors only (Production)
```

### Feature Flags
```
✓ Advanced Monitoring  → Detailed diagnostics + extra stats
✓ Auto-Refresh        → Automatically reload data at intervals
✓ Offline Mode        → Use cached data if backend unavailable
```

---

## 📊 Pre-configured Environments

### Development (🔧)
**Use Case:** Local testing and development
```
URL:                    http://localhost:8000
API Timeout:            30,000 ms (generous, allows debugging pauses)
Health Check:           35 seconds
Logging:                Debug (shows everything)
Features:               All enabled for testing
```

### Staging (🧪)
**Use Case:** Team testing, pre-production validation
```
URL:                    https://api-staging.example.com
API Timeout:            20,000 ms (balanced)
Health Check:           30 seconds
Logging:                Info (important events)
Advanced Monitoring:    Enabled
Auto-Refresh:           Enabled
Offline Mode:           Disabled
```

### Production (🚀)
**Use Case:** Live deployment, data collection in Uganda
```
URL:                    https://api.example.com
API Timeout:            15,000 ms (strict, fail fast)
Health Check:           40 seconds (less aggressive)
Logging:                Warn (errors only)
Advanced Monitoring:    Disabled
Auto-Refresh:           Enabled (for data collection)
Offline Mode:           Disabled
```

---

## 🌍 Uganda Deployment: Specific URL Examples

### For AWS Cape Town Server (Recommended)

**What you get:**
- ~50-80ms latency to Uganda
- Stable connection
- OPC UA health checks every 35 seconds

**URL to use in Production preset:**
```
https://api-cape-town.example.com
or
http://ec2-instance-id.compute-1.amazonaws.com:8000
```

**Configuration:**
```
Environment:           Production
Server URL:            https://api-cape-town.example.com
API Timeout:           15,000 ms (15 seconds)
Health Check:          40 seconds
Reconnect Max Delay:   120 seconds
```

### For Staging on AWS Europe (Testing)

**What you get:**
- ~100-150ms latency (simulates Uganda conditions)
- Test before production
- Identify latency-related issues

**URL to use in Staging preset:**
```
https://api-staging-eu.example.com
```

**Configuration:**
```
Environment:           Staging
Server URL:           https://api-staging-eu.example.com
API Timeout:           20,000 ms (20 seconds, more lenient)
Health Check:          30 seconds
Reconnect Max Delay:   60 seconds
```

### For Local Network Testing (Uganda Office)

**What you get:**
- Fast development iteration
- No internet required
- Test OPC UA station connections

**URL to use in Development preset:**
```
http://192.168.1.50:8000          (Replace 192.168.1.50 with your laptop IP)
```

**Configuration:**
```
Environment:           Development
Server URL:            http://192.168.1.50:8000
API Timeout:           30,000 ms (very generous)
Health Check:          35 seconds
Logging:               Debug (see all details)
```

---

## 🔌 OpenVPN + URL Configuration

### When Using OpenVPN for Uganda Station Connection

**Setup:**
1. VPN connects your laptop → Uganda OPC UA stations
2. Backend Django server runs on AWS Cape Town
3. Frontend (your browser) connects to backend via internet

**URL Configuration:**
```
VPN Tunnel:        To Uganda OPC UA Stations (192.168.x.x)
Backend URL:       AWS Cape Town (https://api-cape-town.example.com)
Frontend Browser:  Your local machine (http://localhost:3000 during dev)
```

**Network Flow:**
```
Your Browser
    ↓
Frontend (Vite Dev Server or deployed)
    ↓
Backend API (AWS Cape Town)
    ↓
VPN Tunnel
    ↓
OPC UA Servers (Uganda Stations)
```

**URL Setting:**
```
Server URL: https://api-cape-town.example.com  ← NOT the VPN tunnel
                                                 ← NOT localhost if deployed
```

---

## 💾 Save Configuration

### Save All Settings
- Click **"💾 Save All Configuration"** button
- All settings stored in browser localStorage
- Settings persist even after closing browser
- Works across page refreshes

### Reset All Settings
- Click **"🔄 Reset All"** button
- Warning: This deletes ALL configuration
- Frontend will revert to development defaults
- Use only if configuration is corrupted

---

## ✅ Verification Checklist

After changing URL, verify:

- [ ] URL is entered correctly (no typos)
- [ ] Protocol is included (http:// or https://)
- [ ] Port number is correct (usually 8000 for Django)
- [ ] Backend server is running and accessible
- [ ] "Save & Test" shows success message
- [ ] Page is refreshed after saving
- [ ] Data loads correctly from backend
- [ ] OPC UA status shows connected

### Quick Test
1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Check if any red errors appear
4. Go to **Network** tab
5. Reload page
6. Should see successful requests to your server URL

---

## 🐛 Troubleshooting

### "Connection Error" Message

**Problem:** Backend URL is unreachable

**Solutions:**
- [ ] Check URL spelling and format
- [ ] Verify backend server is running
- [ ] Check if firewall blocks the connection
- [ ] For remote servers, verify DNS is resolving
- [ ] Check internet connection
- [ ] For AWS, verify security group allows port 8000/443

### Stale Configuration After Refresh

**Problem:** Changes don't appear after page refresh

**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh: Ctrl+F5
- Check localStorage has new values:
  - F12 → Application → Local Storage → roams_server_url

### Timeout Errors on Slow Networks

**Problem:** API requests timing out in Uganda

**Solutions:**
1. **Increase timeout:** Drag slider to 20,000-30,000ms
2. **Check network:** Test Uganda internet speed
3. **Use staging environment:** Pre-configured for slow connections
4. **Verify VPN:** If using OpenVPN, check connection quality

### OPC UA Connection Failed

**Problem:** OPC UA status shows disconnected despite backend URL correct

**Solutions:**
- [ ] Verify OpenVPN tunnel is active (if required)
- [ ] Check OPC UA server is running in Uganda
- [ ] Review backend logs for connection errors
- [ ] Increase health check interval (give it more time)
- [ ] Check OPC UA credentials in backend settings

---

## 📝 For Different Deployment Scenarios

### Scenario 1: Single Developer (You)
```
Environment: Development
URL: http://localhost:8000
Best for: Testing on your machine
```

### Scenario 2: Team Testing
```
Environment: Staging
URL: https://team-api.example.com
Best for: Multiple people testing together
```

### Scenario 3: Live Uganda Stations
```
Environment: Production
URL: https://api.example.com (AWS Cape Town)
Best for: Collecting real OPC UA data
```

### Scenario 4: Multiple Offices
```
Each office has Development preset: http://office-server:8000
All offices have Production preset: https://api.example.com
Best for: Distributed teams with local + central servers
```

---

## 🚀 What Happens After You Save URL

### Immediate:
1. URL validation runs
2. Test connection attempt
3. Result shown (✓ Success or ✗ Error)

### After Page Refresh:
1. Frontend reads new URL from localStorage
2. All future API requests use new URL
3. Existing page data may become stale
4. Page auto-refreshes with data from new backend

### In Network Tab:
1. Open F12 → Network
2. Reload page
3. Should see requests to your new server URL
4. Status codes should be 200 (success) not 404/502

---

## 📱 Mobile/Remote Access

If accessing the frontend from a different device:

**Local Network Server:**
```
Your Server IP:   192.168.1.50
Access from:      http://192.168.1.50:8000 (same network only)
```

**VPS Server (AWS, DigitalOcean, etc):**
```
VPS IP:           52.123.45.67
Access from:      https://52.123.45.67 or https://api.example.com
Required:         HTTPS certificate (don't use plain IP)
```

**Best Practice:**
- Use domain name (api.example.com) not IP
- Always use HTTPS for remote access
- Domain survives if you change servers

---

## 🔐 Security Notes

### Passwords and Secrets
- Never store passwords in URL
- Use environment variables in backend
- Example: `http://api.example.com` not `http://api:password@example.com`

### HTTPS for Production
- Always use `https://` for production
- Browser will block mixed content (https site → http backend)
- Get free SSL certificate from Let's Encrypt

### Localhost Only in Development
- `http://localhost:8000` works only on your machine
- Other users cannot access `localhost`
- For team testing, use LAN IP or public domain

---

## 📞 Support

If URL configuration isn't working:

1. **Check backend logs:** `docker logs django_backend` or tail Django logs
2. **Check frontend console:** F12 → Console tab for errors
3. **Verify connectivity:** ping the server: `ping api.example.com`
4. **Check DNS:** `nslookup api.example.com` (for domain names)
5. **Review Network Tab:** F12 → Network shows actual requests and responses

---

## Summary

✨ **Three ways to adjust URL:**
1. **Quick Presets** → 🔧 Dev / 🧪 Staging / 🚀 Production
2. **Manual Input** → Type custom URL + Save & Test
3. **Share/Copy** → Copy button for easy sharing

✨ **For Uganda Deployment:**
- Use **AWS Cape Town** URL in Production preset
- Set health check to **35 seconds**
- API timeout **15,000-20,000ms**
- Keep OpenVPN tunnel active for OPC UA stations

✨ **After Changing URL:**
- Always click **"Save All Configuration"**
- **Refresh the page** to apply changes
- Verify in Network tab that requests go to new URL

---

**Need more details?** Check the other documentation files:
- `DEPLOYMENT_GUIDE.md` - Full deployment instructions
- `API_REFERENCE.md` - Backend API endpoints
- `OPC_UA_INDEX.md` - OPC UA configuration
