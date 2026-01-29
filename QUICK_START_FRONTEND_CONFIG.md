# 🚀 Quick Start: Frontend URL Configuration

**Status:** ✅ Complete and Ready to Use

---

## 30-Second Quick Start

### 1. Open Settings
Click ⚙️ Settings in your app

### 2. Go to Network Tab
Look for "Network" in the settings menu

### 3. Configure URL
**Option A (Fastest - One Click):**
- Click 🔧 Development OR
- Click 🧪 Staging OR  
- Click 🚀 Production

**Option B (Custom Server):**
- Type your URL in the field
- Click "Save & Test"

### 4. Save
Click "💾 Save All Configuration"

### 5. Refresh
Press F5 to refresh the page

### ✅ Done!
Your configuration is now active!

---

## Three Ways to Set URL

```
╔════════════════════════════════════════════════════════╗
║ WAY #1: ONE-CLICK PRESET (Fastest)                     ║
├────────────────────────────────────────────────────────┤
║ Click:  🔧 Dev  |  🧪 Staging  |  🚀 Production      ║
║ Result: All settings auto-adjust                      ║
║ Time:   2 seconds                                      ║
╚════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════╗
║ WAY #2: MANUAL URL (Custom Servers)                    ║
├────────────────────────────────────────────────────────┤
║ Type:   http://192.168.1.50:8000                       ║
║ Click:  Save & Test                                    ║
║ Verify: Connection check                               ║
║ Save:   Save All Configuration                         ║
║ Time:   30 seconds                                     ║
╚════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════╗
║ WAY #3: COPY & SHARE (Team)                            ║
├────────────────────────────────────────────────────────┤
║ Click:  📋 Copy button                                 ║
║ Share:  Send to team in chat/email                     ║
║ They:   Paste in their Network Tab                     ║
║ Time:   5 seconds                                      ║
╚════════════════════════════════════════════════════════╝
```

---

## Pre-configured Environments

### 🔧 Development (Local Testing)
```
URL:      http://localhost:8000
Timeout:  30,000 ms (30 seconds - very generous)
Logging:  debug (show everything)
Use when: Testing on your machine
```

### 🧪 Staging (Team Testing)
```
URL:      https://api-staging.example.com
Timeout:  20,000 ms (20 seconds)
Logging:  info (important events only)
Use when: Testing with your team before production
```

### 🚀 Production (Live Uganda Deployment)
```
URL:      https://api.example.com (AWS Cape Town)
Timeout:  15,000 ms (15 seconds)
Logging:  warn (errors only)
Use when: Live OPC UA data collection from Uganda
```

---

## For Uganda OPC UA Deployment

### The Challenge
```
Your Location:         Uganda office with OPC UA stations
Backend Server:        Need to be in AWS (Cape Town is best)
Your Frontend:         Needs to connect to backend
Latency Requirement:   100-200ms acceptable
```

### The Solution
```
1. Open Settings → Network Tab
2. Click 🚀 Production button
3. See URL: https://api.example.com (AWS Cape Town)
4. Click "💾 Save All Configuration"
5. Refresh page (F5)
6. ✅ Done! All requests go to AWS Cape Town
   ├─ OPC UA connects via OpenVPN tunnel
   ├─ Latency: 50-80ms (ideal)
   └─ Live data flowing from Uganda stations
```

### What Gets Configured
```
✓ Backend URL: AWS Cape Town server
✓ API Timeout: 15 seconds (right for 50-80ms latency)
✓ Health Check: 40 seconds (OPC UA checks)
✓ Reconnection: 120 seconds max (exponential backoff)
✓ Logging: warn (minimal overhead)
✓ Auto-refresh: Enabled (for live data)
```

---

## Common Tasks

### Task: Switch from Development to Production
```
1. Settings → Network Tab
2. Click 🚀 Production (was 🔧 Development)
3. Click "💾 Save All Configuration"
4. Refresh (F5)
Done!
```

### Task: Use a Custom Server
```
1. Settings → Network Tab
2. Type in URL field: http://192.168.1.50:8000
3. Click "Save & Test"
4. See ✓ Success or ✗ Error
5. Click "💾 Save All Configuration"
6. Refresh (F5)
Done!
```

### Task: Share Configuration with Team
```
1. Settings → Network Tab
2. Click 📋 Copy button next to URL
3. Send to team: "Use this URL: [paste]"
4. They paste in their Network Tab
5. They click "Save & Test"
6. They click "💾 Save All Configuration"
7. They refresh (F5)
Done! All using same server.
```

### Task: Check Current Configuration
```
1. Settings → Network Tab
2. Look at "Configuration Summary" card
3. Shows:
   - Current environment
   - Server URL
   - API timeout
   - Health check interval
   - Log level
```

### Task: Reset Everything
```
1. Settings → Network Tab
2. Click "🔄 Reset All" button
3. Confirm when prompted
4. Page refreshes
5. Back to defaults
Done!
```

---

## Valid URL Examples

### ✅ Correct Format
```
http://localhost:8000
http://127.0.0.1:8000
http://192.168.1.50:8000
http://api.example.com:8000
https://api.example.com
https://api.example.com:8443
```

### ❌ Wrong Format
```
localhost:8000                 (missing http://)
api.example.com                (missing https://)
ftp://server:8000              (unsupported protocol)
http://api.example.com:8000/api    (no paths)
```

---

## What to Do If...

### Problem: "Connection Error" message

**Check:**
- Is URL spelled correctly?
- Is backend running?
- Can you ping the server?
- Is port correct (usually 8000)?

**Fix:**
- Correct the URL
- Start the backend
- Try clicking "Save & Test" again

### Problem: Changes don't persist after refresh

**Check:**
- Are you in private/incognito mode?
- Did you click "Save All Configuration"?

**Fix:**
- Use normal browsing mode
- Click "Save All" explicitly
- Try Ctrl+F5 (hard refresh)

### Problem: Slow requests in Uganda

**Solutions:**
- Increase timeout: drag slider to 20,000-30,000ms
- Check internet speed
- Increase health check interval
- Make sure OpenVPN is active

### Problem: OPC UA showing disconnected

**Check:**
- Is OpenVPN tunnel active?
- Is OPC UA server running?
- Check health check interval (should be 30-40s)

**Fix:**
- Activate OpenVPN
- Start OPC UA server
- Increase health check interval

---

## Settings Explained

### API Request Timeout
```
What: How long to wait for responses
Range: 5-60 seconds
Default: 15s (production), 30s (development)
For Uganda: 15-20 seconds
Too low: Requests fail too quickly
Too high: App feels slow
```

### Request Retries
```
What: How many times to retry failed requests
Range: 1-5 attempts
Default: 3
For Uganda: 2-3 (avoid retry storms)
Uses exponential backoff: 1s, 2s, 4s, 8s...
```

### Health Check Interval
```
What: How often to verify OPC UA is healthy
Range: 10-120 seconds
Default: 35s (development), 40s (production)
For Uganda: 35-40 seconds
Recommended: Check every 30-40 seconds
```

### Log Level
```
🔍 Debug: Everything (for developers)
ℹ️ Info: Important events (staging/testing)
⚠️ Warn: Warnings and above (production)
❌ Error: Errors only (high-load production)
For Uganda: warn (minimize overhead)
```

---

## Keyboard Shortcuts

```
F12       = Open Developer Tools
F5        = Refresh page
Ctrl+F5   = Hard refresh (clear cache)
Ctrl+K    = Quick search (many apps)
Cmd+,     = Open settings (some apps)
```

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────┐
│ FRONTEND URL CONFIGURATION - QUICK REFERENCE     │
├──────────────────────────────────────────────────┤
│                                                   │
│ LOCATION: Settings ⚙️ → Network Tab              │
│                                                   │
│ ONE-CLICK PRESETS:                               │
│   🔧 Development  (http://localhost:8000)        │
│   🧪 Staging      (https://api-staging...)       │
│   🚀 Production   (https://api.example.com)      │
│                                                   │
│ MANUAL URL:                                      │
│   Type URL → Save & Test → Save All              │
│                                                   │
│ SHARE:                                           │
│   Click Copy button → Send to team               │
│                                                   │
│ APPLY:                                           │
│   Click "Save All Configuration"                 │
│   Press F5 to refresh                            │
│                                                   │
│ FOR UGANDA:                                      │
│   Click 🚀 Production → AWS Cape Town ready!     │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## Before & After

### Before
```
❌ URL in code (can't change)
❌ Must recompile to switch servers
❌ Hard to deploy to new server
❌ No way to share configuration
```

### After
```
✅ URL in Settings UI (easy change)
✅ One-click environment switch
✅ Easy deployment to any server
✅ Copy button to share with team
✅ Pre-configured for Uganda
```

---

## Need More Help?

### Quick Questions
→ [FRONTEND_URL_QUICK_REFERENCE.md](./FRONTEND_URL_QUICK_REFERENCE.md)

### Visual Step-by-Step
→ [FRONTEND_VISUAL_GUIDE.md](./FRONTEND_VISUAL_GUIDE.md)

### Complete Details
→ [FRONTEND_URL_CONFIGURATION_GUIDE.md](./FRONTEND_URL_CONFIGURATION_GUIDE.md)

### All Documentation
→ [FRONTEND_CONFIGURATION_DOCUMENTATION_INDEX.md](./FRONTEND_CONFIGURATION_DOCUMENTATION_INDEX.md)

---

## That's It!

You now know how to:
- ✅ Access the Network Tab
- ✅ Change URLs easily
- ✅ Use environment presets
- ✅ Configure custom servers
- ✅ Share with your team
- ✅ Deploy to Uganda

**Ready? Go open Settings → Network Tab and try it!**

---

