# Frontend URL Configuration - Quick Reference

## 🎯 Three Ways to Change the Backend URL

### Method 1: Environment Presets (Fastest) 
```
Settings → Network Tab → Environment Presets
                ↓
        Click: 🔧 Dev / 🧪 Staging / 🚀 Prod
                ↓
        All settings auto-adjust + save
```

**One-Click Setup:**
- 🔧 **Development**: `http://localhost:8000` (Local testing)
- 🧪 **Staging**: `https://api-staging.example.com` (Team testing)
- 🚀 **Production**: `https://api.example.com` (Live Uganda deployment)

---

### Method 2: Manual URL Entry (For Custom Servers)
```
Settings → Network Tab → Backend Server Configuration
                ↓
        Enter URL: http://192.168.1.50:8000
                ↓
        Click: Save & Test
                ↓
        Success ✓ or Error ✗ shown
                ↓
        Refresh page
```

---

### Method 3: Copy & Share
```
Settings → Network Tab → Copy button (📋)
                ↓
        URL copied to clipboard
                ↓
        Share with team or save for later
```

---

## 📍 For Uganda Deployment

### Backend Server Location
```
Your Laptop/Device
    ↓
Frontend App (This browser)
    ↓
Backend API (AWS Cape Town)
    ↓
    ├─ OPC UA Connection (via OpenVPN)
    └─ Stations (Uganda)
```

### Recommended Settings
```
Environment:          Production (🚀)
Server URL:           https://api.example.com
API Timeout:          15,000 ms
Health Check:         35 seconds
Log Level:            warn (errors only)
```

---

## 🔄 Configuration Flow

```
1. USER CHANGES URL
   ↓
2. CLICK "Save & Test"
   ↓
3. URL VALIDATED
   ↓
4. CONNECTION TESTED
   ↓
5. SAVED TO localStorage
   ↓
6. USER REFRESHES PAGE
   ↓
7. FRONTEND READS CONFIG
   ↓
8. API CLIENT UPDATED
   ↓
9. ALL REQUESTS USE NEW URL ✓
```

---

## 🧪 Quick Test Checklist

After changing URL:
- [ ] URL is correct format (http://... or https://...)
- [ ] Backend server is running
- [ ] "Save & Test" shows ✓ success
- [ ] Page refreshed
- [ ] Data loads from new server
- [ ] No errors in browser console (F12)

---

## 💾 Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Developer Console | F12 | Cmd + Option + I |
| Refresh Page | F5 | Cmd + R |
| Hard Refresh | Ctrl + F5 | Cmd + Shift + R |
| Network Tab | F12 → Network | F12 → Network |

---

## 📱 Example URLs by Scenario

### Local Development (Your Machine)
```
http://localhost:8000
http://127.0.0.1:8000
```

### Team Development (Same Network)
```
http://192.168.1.50:8000         (Replace with your IP)
http://10.0.0.15:8000
```

### AWS Server
```
http://ec2-50-100-200-50.compute.amazonaws.com
https://api.example.com           (Better - use domain)
```

### Hetzner VPS
```
https://vps.example.com
http://167.99.100.200:8000        (Using IP - not recommended)
```

### Local HTTPS (with self-signed cert)
```
https://localhost:8443
```

---

## ✅ Verify Configuration Applied

### In Browser Console (F12)
```javascript
// Check what URL is configured
localStorage.getItem("roams_server_url")

// Example output:
// "http://localhost:8000"
// or "https://api.example.com"
```

### In Network Tab (F12)
```
1. F12 → Network tab
2. Reload page (F5)
3. Look for API requests
4. Should go to your configured URL
5. Status should be 200 (success) not 404
```

---

## 🚨 Common Issues & Fixes

### Issue: "Connection Error" After Saving URL

**Causes:**
- URL is wrong (typo)
- Backend not running
- Firewall blocking connection
- DNS not resolving domain

**Fix:**
```
1. Check URL spelling exactly
2. Test: Open URL in browser tab
3. If get blank page: Backend running?
4. If get DNS error: Check domain name
5. Increase timeout: drag slider right
```

### Issue: Settings Don't Persist After Refresh

**Cause:** Browser privacy mode clears localStorage

**Fix:**
```
1. Use normal browsing (not private/incognito)
2. Or use persistent storage extension
3. Or hard refresh: Ctrl+F5
```

### Issue: Slow Requests in Uganda

**Cause:** Long latency to backend

**Fix:**
```
1. Deploy backend to AWS Cape Town (50-80ms)
2. Increase timeout: 20,000-30,000 ms
3. Increase health check: 40-60 seconds
4. Check internet connection speed
```

---

## 📊 Configuration by Environment

### Development Environment
```typescript
{
  serverUrl: "http://localhost:8000",
  apiTimeout: 30000,           // Very generous (30s)
  healthCheck: 35,             // Frequent checks
  logLevel: "debug",           // Show everything
  autoRefresh: true,           // For testing
  advancedMonitoring: true     // All features enabled
}
```

### Staging Environment
```typescript
{
  serverUrl: "https://api-staging.example.com",
  apiTimeout: 20000,           // Balanced (20s)
  healthCheck: 30,             // Regular checks
  logLevel: "info",            // Important only
  autoRefresh: true,           // Test data flow
  advancedMonitoring: true     // Test monitoring
}
```

### Production Environment (Uganda)
```typescript
{
  serverUrl: "https://api.example.com",
  apiTimeout: 15000,           // Strict (15s)
  healthCheck: 40,             // Less aggressive
  logLevel: "warn",            // Errors only
  autoRefresh: true,           // Live data
  advancedMonitoring: false    // Optimized
}
```

---

## 📞 Support Workflow

**If it's not working:**

1. **Check URL Format**
   ```
   ✓ http://localhost:8000
   ✓ https://api.example.com
   ✗ localhost:8000         (missing http://)
   ✗ api.example.com        (missing https://)
   ```

2. **Test Backend Directly**
   ```
   Open in browser: http://localhost:8000/api/health/
   Should see: {"status": "ok"} or similar
   ```

3. **Check Browser Console**
   ```
   F12 → Console
   Look for red errors
   Note error messages
   ```

4. **Check Network Tab**
   ```
   F12 → Network
   Reload page
   Click on requests
   Check response status
   200 = OK, 404 = not found, 502 = backend down
   ```

5. **Verify Configuration Saved**
   ```
   F12 → Console
   Type: localStorage.getItem("roams_server_url")
   Should show your URL
   ```

---

## 🎓 Learning Path

**New to this?**

1. Start with **Development** environment (localhost)
2. Get comfortable changing URLs
3. Try **Staging** with a test server
4. Move to **Production** when ready
5. All settings have helpful descriptions when hovering

**Need more details?** See:
- `FRONTEND_URL_CONFIGURATION_GUIDE.md` - Full user guide
- `FRONTEND_CONFIGURATION_INTEGRATION_GUIDE.md` - Developer guide
- Settings page UI - Hover over any field for help

---

## 🔐 Security Note

✅ **Safe to change**: URL, timeouts, feature flags
❌ **Never enter here**: Passwords, API keys, secrets

All backend authentication should be handled separately (JWT tokens, environment variables, etc)

---

