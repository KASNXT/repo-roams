# Network Tab & Server Configuration - Quick Reference

## 🎯 What's New?

The **Backend Server Configuration** section in Network Tab allows users to change the backend server address without rebuilding the application.

---

## 📍 Where to Find It

**Settings → Network Tab → Scroll Down to "Backend Server Configuration"**

---

## 🔧 How to Use

### Basic Usage
```
1. Open Settings (⚙️ icon)
2. Click "Network" tab
3. Scroll to "Backend Server Configuration" (blue-highlighted section)
4. Enter server URL (e.g., http://your-server:8000)
5. Click "Save & Test"
6. See green success message
7. Refresh page (Ctrl+R / Cmd+R)
8. Done! ✓
```

### Change Server Examples

#### To Local Dev Server:
```
Enter: http://localhost:8000
Click: Save & Test
Result: ✓ Connected to local development
```

#### To Team Development Server:
```
Enter: http://192.168.1.50:8000
Click: Save & Test
Result: ✓ Connected to team server
```

#### To Cloud Staging:
```
Enter: https://api-staging.mycompany.com
Click: Save & Test
Result: ✓ Connected to staging environment
```

#### To Production:
```
Enter: https://api.mycompany.com
Click: Save & Test
Result: ✓ Connected to production (be careful!)
```

#### Reset to Default:
```
Click: Reset to Default
Result: http://localhost:8000 (restored)
```

---

## ✅ Valid URL Formats

All of these will work:

| Format | Valid? | Example |
|--------|--------|---------|
| `http://localhost:8000` | ✅ | Local development |
| `http://192.168.1.50:8000` | ✅ | LAN IP address |
| `https://api.example.com` | ✅ | Domain with HTTPS |
| `https://api.example.com:8443` | ✅ | HTTPS with custom port |
| `http://example.com` | ✅ | Domain with HTTP |
| `localhost:8000` | ❌ | Missing `http://` |
| `example.com` | ❌ | Missing protocol |
| `:8000` | ❌ | Missing host |

---

## 🚨 Common Issues & Solutions

### Issue: "Unable to connect to server"
**Cause**: Server is offline or URL is wrong
**Solution**: 
- Check server is running
- Verify URL format: `http://hostname:port`
- Test with another tool (curl, Postman)
- Check firewall/network connectivity

### Issue: "Invalid URL format"
**Cause**: Missing `http://` or `https://`
**Solution**: Always include the protocol
```
❌ localhost:8000
✅ http://localhost:8000

❌ example.com
✅ https://example.com
```

### Issue: Changes don't take effect after Save & Test
**Cause**: Forgot to refresh page
**Solution**: Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac)

### Issue: Can't change from current server
**Cause**: May need to wait for success message first
**Solution**: Wait for green checkmark, then try again

---

## 💡 Tips & Best Practices

### ✅ DO:
- Test connection before refreshing page
- Use HTTPS for production servers
- Keep the default `http://localhost:8000` for local development
- Write down your server URLs for quick reference
- Use the Reset button if you get confused

### ❌ DON'T:
- Type just the hostname without `http://` or `https://`
- Change server mid-operation (data might be inconsistent)
- Share production URLs casually
- Forget to refresh page after saving

---

## 🔍 Technical Details

### Where is the URL Stored?
- **Storage**: Browser's localStorage
- **Key**: `roams_server_url`
- **Persists**: Until manually changed or cleared
- **Survives**: Page refresh, browser restart

### How It Works
```
1. User enters URL in Network Tab
2. User clicks "Save & Test"
   ├─ Validates URL format
   ├─ Tests connection to /api/health/
   └─ If success: saves to localStorage
3. User refreshes page
   ├─ services/api.ts loads
   ├─ Reads localStorage["roams_server_url"]
   └─ Creates axios client with correct server
4. All API calls use the new server ✓
```

### What Gets Stored?
```typescript
localStorage.setItem("roams_server_url", "http://your-server:8000")
// Now: localStorage.getItem("roams_server_url") 
//      → "http://your-server:8000"
```

### Files Modified (Under the Hood)
- `roams_frontend/src/components/settings/NetworkTab.tsx` - UI & validation
- `roams_frontend/src/services/api.ts` - Reads from localStorage
- `roams_frontend/src/pages/Analysis.tsx` - Uses centralized API client

---

## 🔐 Security

### Is it Safe?
✅ **Yes.** Server URLs are not sensitive information.
- No passwords stored
- No authentication tokens exposed
- HTTPS recommended for production

### Best Practices
- Use HTTPS (`https://`) for production
- Keep server URLs private (don't share publicly)
- Verify server certificate (browser will warn if invalid)
- Change password regularly on backend

---

## 🎓 Understanding the Architecture

### Before (Hardcoded)
```javascript
// In every build:
const SERVER = "http://localhost:8000"
// To change: rebuild code → redeploy app → restart
```

### After (Dynamic)
```javascript
// UI Setting:
localStorage["roams_server_url"] = "http://new-server:8000"
// To change: just type in UI → click save → refresh page
```

### Impact
| Action | Before | After |
|--------|--------|-------|
| Change server | 10+ min, dev needed | 30 seconds, UI |
| Different env | Different build | Same build |
| Production | Not practical | Production-ready |

---

## 📊 Example Scenarios

### Scenario 1: Developer Testing Multiple Servers
```
Morning:
  Set server: http://localhost:8000 (local dev)
  Test feature X
  
Afternoon:
  Set server: http://staging:8000 (staging env)
  Test feature X on staging
  
Evening:
  Set server: https://api.prod.com (production)
  Check production status
  
All without rebuilding! 🎉
```

### Scenario 2: Deploying to Different Customer Sites
```
Customer A:
  Deploy same build to: http://customera.local:8000
  User configures server via Network Tab
  ✓ Works!

Customer B:
  Deploy same build to: http://customerb.local:8000
  User configures server via Network Tab
  ✓ Works!

No custom builds needed! 🎉
```

### Scenario 3: Docker Container
```
Start container with no hardcoded endpoints
User opens Network Tab
Types: http://docker-host:8000
App connects instantly
Perfect for containerized deployments! 🎉
```

---

## 🛠️ Troubleshooting Flowchart

```
Is the app connecting to the right server?
│
├─→ YES ✓ → Nothing to do!
│
└─→ NO ✗
    │
    ├─→ Do you see "Backend Server Configuration" in Network Tab?
    │   │
    │   ├─→ NO → Your app version needs updating
    │   │
    │   └─→ YES → Continue...
    │
    ├─→ Have you entered a server URL?
    │   │
    │   ├─→ NO → Enter server URL and click Save & Test
    │   │
    │   └─→ YES → Continue...
    │
    ├─→ Did you see a green success message?
    │   │
    │   ├─→ NO → Red error appears
    │   │   ├─→ "Invalid URL format" → Add http:// prefix
    │   │   ├─→ "Unable to connect" → Server is down
    │   │   └─→ Fix issue and try again
    │   │
    │   └─→ YES → Continue...
    │
    ├─→ Did you refresh the page?
    │   │
    │   ├─→ NO → Press Ctrl+R or Cmd+R
    │   │
    │   └─→ YES → Should work now! ✓
    │
    └─→ Still not working?
        └─→ Check if server is running at that address
            └─→ Use curl: curl http://your-server:8000/api/health/
```

---

## 📞 Support

### Common Questions

**Q: Do I need to remember the server address?**
A: No! It's saved in localStorage. Just refresh page, and it remembers.

**Q: Can I have different servers on different devices?**
A: Yes! Each device/browser has its own localStorage.

**Q: What if I change the server URL wrong?**
A: Just click "Reset to Default" to go back to localhost:8000.

**Q: Does changing the server affect my data?**
A: No! The data stays on the backend. You're just pointing to a different server.

**Q: Can I use this in production?**
A: Yes! That's exactly why we built it. Use HTTPS for security.

---

## 🎯 Key Takeaway

> **Old Way**: Change server = Edit code → Rebuild → Deploy → Restart
>
> **New Way**: Change server = Type URL → Click Save → Refresh browser
>
> **Time Saved**: ~10 minutes per change
> **Complexity**: Reduced from developer task to user-friendly UI action

---

## 📚 Related Documentation

- [NETWORK_TAB_IMPROVEMENTS.md](NETWORK_TAB_IMPROVEMENTS.md) - Technical details
- [NETWORK_TAB_BEFORE_AFTER.md](NETWORK_TAB_BEFORE_AFTER.md) - Architecture changes
- [API_REFERENCE.md](API_REFERENCE.md) - API endpoints

---

**Last Updated**: 2024
**Status**: ✅ Production Ready
**Feature**: Dynamic Backend Server Configuration
