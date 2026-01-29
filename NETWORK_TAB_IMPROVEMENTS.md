# Network Tab Improvements & Dynamic Server Configuration

## Overview
The Network Tab has been enhanced with **dynamic backend server configuration**, eliminating hardcoded endpoints and making the system deployable across multiple environments without code changes.

---

## ✅ Improvements Completed

### 1. **Backend Server Configuration Section** (NetworkTab.tsx)

#### What Changed:
- Added new "Backend Server Configuration" card to the Network Settings page
- Provides UI for entering custom server address
- Includes built-in validation and testing

#### Features:
- **Server URL Input Field**
  - Format validation (checks for valid URL syntax)
  - Help text showing expected format: `http://hostname:port`
  - Example: `http://localhost:8000` or `https://api.example.com:8443`

- **Save & Test Button**
  - Validates URL format before saving
  - Tests connection to `/api/health/` endpoint
  - Provides clear error messages if connection fails
  - Displays success confirmation when saved

- **Reset to Default Button**
  - Quickly reverts to `http://localhost:8000`
  - Useful for troubleshooting or returning to local development

- **Visual Feedback**
  - 🔴 Red border on input if error exists
  - 🟢 Green success message with checkmark
  - 🔵 Blue accent on the card (stands out from other settings)

#### User Workflow:
```
1. User enters server URL (e.g., https://api.prod.company.com)
2. User clicks "Save & Test"
3. System validates URL format
4. System attempts connection to /api/health/
5. On success: Message shows "Server URL saved. Refresh page to apply."
6. User refreshes page (changes take effect immediately)
7. All subsequent API calls use the new server
```

#### Key Code Addition:
```typescript
// Backend Server Configuration
<Card className="shadow-card border-blue-200 dark:border-blue-800">
  <CardHeader>
    <CardTitle className="text-base font-medium flex items-center">
      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
      Backend Server Configuration
    </CardTitle>
  </CardHeader>
  <CardContent>
    <Input
      value={config.serverUrl}
      onChange={(e) => setConfig(prev => ({ ...prev, serverUrl: e.target.value }))}
      placeholder="http://localhost:8000"
    />
    <Button onClick={handleSaveServer}>Save & Test</Button>
    <Button onClick={() => setConfig(prev => ({ ...prev, serverUrl: "http://localhost:8000" }))}>
      Reset to Default
    </Button>
  </CardContent>
</Card>
```

---

### 2. **Dynamic API Endpoint Loading** (services/api.ts)

#### What Changed:
- Replaced hardcoded URL with dynamic configuration reading
- Server URL now loaded from `localStorage` at runtime
- Falls back to default if not configured

#### Before:
```typescript
const API_BASE_URL = "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});
```

#### After:
```typescript
// Get server URL from localStorage or use default
const getServerUrl = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("roams_server_url") || "http://localhost:8000";
  }
  return "http://localhost:8000";
};

const API_BASE_URL = `${getServerUrl()}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});
```

#### Benefits:
- ✅ No code rebuild required to change server address
- ✅ Runtime configuration via UI
- ✅ Automatic fallback to default if not set
- ✅ SSR-safe (checks for `window` object)

---

### 3. **Removed Duplicate API Instance** (Analysis.tsx)

#### What Changed:
- Removed duplicate `axios.create()` in Analysis component
- Now uses centralized `api` client from `services/api.ts`
- Ensures consistent server configuration across entire app

#### Before:
```typescript
// ❌ DUPLICATE - hardcoded, no auth handling consistency
const api = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Token ${token}`;
  }
  return config;
});

const res = await api.get("/telemetry/", {...});
```

#### After:
```typescript
// ✅ CENTRALIZED - one source of truth
import api from "@/services/api";

const res = await api.get("/telemetry/", {...});
```

#### Benefits:
- ✅ Single source of truth for API configuration
- ✅ Consistent auth token handling everywhere
- ✅ Easier maintenance and debugging
- ✅ Changes to API client affect entire app automatically

---

## 🎯 Architecture Benefits

### Before (Hardcoded):
```
┌─────────────────────────────────────┐
│     Frontend Code                   │
│  ❌ "http://localhost:8000" ────┐   │
│     (hardcoded in 2+ places)    │   │
└─────────────────────────────────┼───┘
                                  │
                    ┌─────────────▼────────┐
                    │  Django Backend      │
                    │  http://localhost    │
                    │  :8000               │
                    └──────────────────────┘
                    
Requires: Code rebuild for each environment
```

### After (Dynamic):
```
┌──────────────────────────────────────────┐
│     Frontend Application                  │
│  ✅ localStorage["roams_server_url"]  ┌──┐│
│     (loaded at runtime)               │  ││
│                                       │  ││
│  UI Setting Page ──────────────────→  └──┘│
│  (Network Tab)                            │
└──────────────────────────────────────────┘
         │
         │ (configurable per environment)
         │
    ┌────▼──────────────────────────────┐
    │  Django Backend                    │
    │  - localhost:8000 (dev)            │
    │  - staging.api.com (staging)       │
    │  - api.prod.com (production)       │
    └────────────────────────────────────┘
    
Requires: Just configuration, no rebuild
```

---

## 📋 Implementation Details

### Storage:
- **Key**: `roams_server_url`
- **Value**: Full server URL (e.g., `"http://localhost:8000"`)
- **Storage Type**: Browser `localStorage`
- **Persistence**: Survives browser restart

### Configuration Flow:
```
1. NetworkTab.tsx (UI)
   └─ User enters URL
   └─ Clicks "Save & Test"
   
2. Validation
   └─ Format check (URL validity)
   └─ Connection test (GET /api/health/)
   
3. Storage
   └─ localStorage.setItem("roams_server_url", url)
   
4. API Client Reload
   └─ Requires page refresh to pick up new URL
   └─ services/api.ts reads from localStorage on module load
```

### Error Handling:
- **Empty URL**: "Server URL cannot be empty"
- **Invalid Format**: "Invalid URL format. Example: http://localhost:8000"
- **Connection Failed**: "Unable to connect to server. Please check the URL and try again."
- **Server Error**: "Server returned status {code}"

---

## 🚀 Deployment Use Cases

### Development:
```
Network Tab → Set to http://localhost:8000 → Save → Refresh
→ App connects to local Django dev server
```

### Staging:
```
Network Tab → Set to https://api-staging.company.com → Save → Refresh
→ App connects to staging environment
```

### Production:
```
Network Tab → Set to https://api.company.com → Save → Refresh
→ App connects to production environment
```

### Docker/Container:
```
Dockerfile: No hardcoded endpoints
Start application → User configures server URL via Network Tab
→ Flexible for any deployment target
```

---

## 📝 Files Modified

### 1. `roams_frontend/src/components/settings/NetworkTab.tsx`
- **Type**: Component Enhancement
- **Changes**:
  - Added `serverUrl` to `NetworkConfig` interface
  - Added state management for `serverError` and `saveSuccess`
  - Added `validateServerUrl()` function
  - Added `handleSaveServer()` async function with connection testing
  - Added new "Backend Server Configuration" card with input and buttons
- **Lines**: Expanded from 223 → 275 lines

### 2. `roams_frontend/src/services/api.ts`
- **Type**: Configuration Update
- **Changes**:
  - Added `getServerUrl()` function to read from localStorage
  - Changed from hardcoded to dynamic `API_BASE_URL`
  - Made SSR-safe with `window` check
- **Lines**: Expanded from 11 → 18 lines (core API setup)

### 3. `roams_frontend/src/pages/Analysis.tsx`
- **Type**: Code Cleanup
- **Changes**:
  - Added `import api from "@/services/api"`
  - Removed duplicate `axios.create()` call
  - Removed redundant interceptor setup
  - Now uses centralized API client
- **Lines**: Reduced by ~20 lines of duplicate code

---

## ⚙️ Configuration Examples

### Default (Development):
```typescript
localStorage.getItem("roams_server_url") // → null
// Falls back to: http://localhost:8000
```

### Custom (Staging):
```typescript
localStorage.setItem("roams_server_url", "https://api-staging.acme.com")
localStorage.getItem("roams_server_url") // → "https://api-staging.acme.com"
```

### Custom with Port:
```typescript
localStorage.setItem("roams_server_url", "http://192.168.1.50:8000")
localStorage.getItem("roams_server_url") // → "http://192.168.1.50:8000"
```

---

## 🔒 Security Considerations

1. **HTTPS Recommended**: Use HTTPS URLs in production (`https://api.example.com`)
2. **CORS**: Backend should allow requests from frontend origin
3. **Token Storage**: Auth tokens still stored in localStorage (existing pattern)
4. **No Sensitive Data**: Server URL is not sensitive (non-confidential)

---

## 📱 User Experience

### Normal Flow:
1. **First Time**: App uses default `http://localhost:8000`
2. **User Customization**: Navigate to Settings → Network Tab
3. **Enter Server URL**: Type custom server address
4. **Click Save & Test**: System validates and tests connection
5. **See Success**: Green checkmark shows "Server URL saved"
6. **Refresh Page**: User refreshes browser (Ctrl+R / Cmd+R)
7. **New Connection**: All API calls use new server address

### Error Scenarios:
- **Server Offline**: Clear error message, option to retry or use default
- **Wrong Address**: Validation catches format issues immediately
- **Network Issue**: Connection test fails with helpful message

---

## 🎯 Next Steps / Future Enhancements

### Immediate (Ready to Deploy):
- ✅ Dynamic server configuration via UI
- ✅ Connection testing before save
- ✅ Clear error messages and feedback

### Future (Not Implemented):
- [ ] Auto-reload API client on server change (no page refresh needed)
- [ ] Remember server choice across sessions (already works via localStorage)
- [ ] Server preset buttons (Dev/Staging/Prod shortcuts)
- [ ] Endpoint health status monitoring
- [ ] Server connection history/logs
- [ ] Environment selector dropdown
- [ ] Configuration backup/restore with server URL

---

## ✨ Summary

The Network Tab has been transformed from a **local network configuration tool** into a **comprehensive network and backend management interface**. Users can now:

- ✅ Configure backend server address via UI
- ✅ Test connection before applying changes
- ✅ Switch between environments without code changes
- ✅ See clear feedback on success/failure
- ✅ Quickly reset to default if needed

This makes the application truly **environment-agnostic** and **deployment-ready** for development, staging, and production environments.
