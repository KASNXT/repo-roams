# Frontend Configuration Integration Guide

## How the Frontend Uses Configuration

This guide explains how the frontend reads and uses the configuration saved in the Network Tab.

---

## 📦 Configuration Storage

All configuration is stored in **browser localStorage** under these keys:

```javascript
localStorage.getItem("roams_server_url")           // "http://localhost:8000"
localStorage.getItem("roams_environment")          // "development"
localStorage.getItem("roams_api_timeout")          // "30000"
localStorage.getItem("roams_request_retries")      // "3"
localStorage.getItem("roams_health_check")         // "35"
localStorage.getItem("roams_reconnect_delay")      // "60"
localStorage.getItem("roams_log_level")            // "debug"
localStorage.getItem("roams_adv_monitoring")       // "true"
localStorage.getItem("roams_auto_refresh")         // "true"
localStorage.getItem("roams_offline_mode")         // "false"
```

---

## 🔌 API Client Integration

### Current Setup (After Deployment)

The frontend's API client should be updated to read from localStorage:

**File:** `roams_frontend/src/services/api.ts`

```typescript
import axios from "axios";

// Read configuration from localStorage
const getServerUrl = () => {
  const url = localStorage.getItem("roams_server_url");
  return url || "http://localhost:8000";
};

const getApiTimeout = () => {
  const timeout = localStorage.getItem("roams_api_timeout");
  return Number(timeout) || 30000;
};

const getRetries = () => {
  const retries = localStorage.getItem("roams_request_retries");
  return Number(retries) || 3;
};

// Create API client with dynamic configuration
export const apiClient = axios.create({
  baseURL: getServerUrl(),
  timeout: getApiTimeout(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Retry logic
let retryCount = 0;
const maxRetries = getRetries();

apiClient.interceptors.response.use(
  (response) => {
    retryCount = 0;
    return response;
  },
  async (error) => {
    if (retryCount < maxRetries && error.response?.status >= 500) {
      retryCount++;
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1))
      );
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 🎯 Using Configuration in Components

### Example 1: Data Fetching with Timeout Awareness

```typescript
import apiClient from "@/services/api";
import { useEffect, useState } from "react";

export function StationData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // API client automatically uses timeout from localStorage
        const response = await apiClient.get("/api/stations/");
        setData(response.data);
        setError(null);
      } catch (err) {
        // Handle timeout vs other errors
        if (err.code === "ECONNABORTED") {
          setError("Request timed out. Check your network or increase timeout in Settings.");
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  return <div>{JSON.stringify(data)}</div>;
}
```

### Example 2: Using Environment for Feature Toggles

```typescript
import { useEffect, useState } from "react";

export function AdvancedDashboard() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const advancedMonitoring = localStorage.getItem("roams_adv_monitoring");
    setShowAdvanced(advancedMonitoring === "true");
  }, []);

  return (
    <div>
      <BasicMetrics />
      {showAdvanced && <AdvancedMetrics />}
    </div>
  );
}
```

### Example 3: Conditional Rendering Based on Log Level

```typescript
function DebugPanel() {
  const logLevel = localStorage.getItem("roams_log_level") || "info";
  const showDebug = logLevel === "debug";

  return (
    <div>
      {showDebug && (
        <div className="bg-gray-100 p-4 rounded">
          <h3>Debug Information</h3>
          <pre>{JSON.stringify(window.location, null, 2)}</pre>
          <pre>{JSON.stringify(navigator.userAgent, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### Example 4: OPC UA Connection Management

```typescript
import { useEffect, useState } from "react";
import apiClient from "@/services/api";

export function OPCUAStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const healthCheckInterval = Number(
      localStorage.getItem("roams_health_check")
    ) || 35;

    const checkHealth = async () => {
      try {
        const response = await apiClient.get("/api/opcua/health/");
        setConnected(response.data.connected);
      } catch {
        setConnected(false);
      }
    };

    checkHealth();

    // Health check runs at configured interval
    const interval = setInterval(checkHealth, healthCheckInterval * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      OPC UA Status: {connected ? "✅ Connected" : "❌ Disconnected"}
    </div>
  );
}
```

---

## 🔄 Auto-Refresh Implementation

### Using Auto-Refresh Configuration

```typescript
import { useEffect, useState } from "react";
import apiClient from "@/services/api";

export function LiveData() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const autoRefresh = localStorage.getItem("roams_auto_refresh") === "true";

    if (!autoRefresh) return;

    const fetchData = async () => {
      const response = await apiClient.get("/api/latest-data/");
      setData(response.data);
    };

    // Initial fetch
    fetchData();

    // Set up interval (e.g., every 5 seconds for live data)
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  return <div>{data ? JSON.stringify(data) : "Waiting..."}</div>;
}
```

---

## 🔌 Detecting Configuration Changes

### Listen for localStorage Changes

```typescript
import { useEffect, useState } from "react";

export function ConfigurationListener() {
  const [config, setConfig] = useState({
    serverUrl: localStorage.getItem("roams_server_url"),
    environment: localStorage.getItem("roams_environment"),
  });

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key?.startsWith("roams_")) {
        setConfig((prev) => ({
          ...prev,
          [event.key.replace("roams_", "")]: event.newValue,
        }));

        // Optional: Show toast notification
        console.log(`Configuration changed: ${event.key}`);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return <div>Current Environment: {config.environment}</div>;
}
```

---

## 📊 Configuration Flow Diagram

```
Network Tab Component
    ↓
User clicks "Save All Configuration"
    ↓
All values → localStorage (roams_server_url, roams_api_timeout, etc)
    ↓
User refreshes page or navigates
    ↓
App loads (App.tsx or main.tsx)
    ↓
Services read from localStorage
    ↓
API Client initialized with saved values
    ↓
Components use API Client
    ↓
All requests use configured URL, timeout, retries
```

---

## 🎛️ Configuration in Different Layers

### Layer 1: Browser Storage
```
localStorage → Persistent, survives refreshes
```

### Layer 2: API Client (services/api.ts)
```
Reads from localStorage
Applies timeout: axios.create({ timeout: 30000 })
Adds retry logic in interceptors
```

### Layer 3: Components
```
Use apiClient for requests
Listen to localStorage for config changes
Render UI based on feature flags
```

### Layer 4: Backend (Django)
```
Receives requests from configured URL
No direct config access (runs on server)
Can read settings from response headers if needed
```

---

## 📝 Code Examples by Use Case

### Use Case 1: Loading Data from Configured Server

```typescript
export async function fetchStations() {
  try {
    // apiClient automatically uses URL and timeout from localStorage
    const response = await apiClient.get("/api/stations/");
    return response.data;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error("Server request timed out");
    }
    throw error;
  }
}
```

### Use Case 2: Switching Environments Dynamically

```typescript
export function setEnvironment(env: "development" | "staging" | "production") {
  const presets = {
    development: {
      url: "http://localhost:8000",
      timeout: 30000,
    },
    staging: {
      url: "https://api-staging.example.com",
      timeout: 20000,
    },
    production: {
      url: "https://api.example.com",
      timeout: 15000,
    },
  };

  const preset = presets[env];
  localStorage.setItem("roams_server_url", preset.url);
  localStorage.setItem("roams_api_timeout", preset.timeout.toString());
  localStorage.setItem("roams_environment", env);

  // Reload to apply changes
  window.location.reload();
}
```

### Use Case 3: Conditional Feature Rendering

```typescript
export function Analytics() {
  const advancedMonitoring = localStorage.getItem("roams_adv_monitoring") === "true";
  const logLevel = localStorage.getItem("roams_log_level");

  return (
    <div>
      {advancedMonitoring && <DetailedMetrics />}
      {logLevel === "debug" && <DebugConsole />}
      <StandardMetrics />
    </div>
  );
}
```

### Use Case 4: Handling Timeouts Gracefully

```typescript
export function StationDataWithFallback() {
  const [data, setData] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await apiClient.get("/api/stations/");
        setData(response.data);
        setOfflineMode(false);
      } catch (error) {
        // If timeout and offline mode enabled, use cached data
        if (error.code === "ECONNABORTED") {
          const offlineModeEnabled =
            localStorage.getItem("roams_offline_mode") === "true";

          if (offlineModeEnabled) {
            const cached = localStorage.getItem("roams_cached_stations");
            if (cached) {
              setData(JSON.parse(cached));
              setOfflineMode(true);
              return;
            }
          }
        }
        console.error("Failed to load data:", error);
      }
    };

    loadData();
  }, []);

  return (
    <div>
      {offlineMode && <div className="bg-yellow-100">Using offline data</div>}
      {JSON.stringify(data)}
    </div>
  );
}
```

---

## 🧪 Testing Configuration

### Test 1: Verify API Client Uses Correct URL

```typescript
// In browser console (F12)
import apiClient from "@/services/api";
console.log(apiClient.defaults.baseURL);  // Should match roams_server_url
console.log(apiClient.defaults.timeout);  // Should match roams_api_timeout
```

### Test 2: Change URL Dynamically

```typescript
// In browser console
localStorage.setItem("roams_server_url", "https://new-server.com");
localStorage.setItem("roams_environment", "staging");

// Reload to apply
window.location.reload();
```

### Test 3: Monitor Network Requests

```typescript
// F12 → Network tab
// Make a request: fetch("/api/test")
// Check if requests go to configured URL
// Check response time matches timeout setting
```

### Test 4: Test Feature Flags

```typescript
// In console
localStorage.setItem("roams_adv_monitoring", "true");
localStorage.setItem("roams_auto_refresh", "false");

// Component should re-render with new features
window.location.reload();
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] API client reads `roams_server_url` from localStorage
- [ ] Timeout configuration applied to axios
- [ ] Retry logic implemented
- [ ] Environment presets updated with production URL
- [ ] Feature flags tested
- [ ] OPC UA health check interval configured
- [ ] Auto-refresh behavior verified
- [ ] Offline mode tested (if enabled)
- [ ] localStorage keys documented
- [ ] Error messages helpful (not showing technical details)

---

## 📋 localStorage Keys Reference

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `roams_server_url` | string | `http://localhost:8000` | Backend API URL |
| `roams_environment` | string | `development` | Current environment |
| `roams_api_timeout` | number | `30000` | Request timeout in ms |
| `roams_request_retries` | number | `3` | Retry attempts |
| `roams_health_check` | number | `35` | OPC UA health check interval (s) |
| `roams_reconnect_delay` | number | `60` | Max reconnection backoff (s) |
| `roams_log_level` | string | `debug` | Logging verbosity |
| `roams_adv_monitoring` | string | `true` | Show advanced metrics |
| `roams_auto_refresh` | string | `true` | Auto-refresh data |
| `roams_offline_mode` | string | `false` | Use cached data offline |

---

## 🔗 Related Files

- [`FRONTEND_URL_CONFIGURATION_GUIDE.md`](./FRONTEND_URL_CONFIGURATION_GUIDE.md) - User guide
- [`NetworkTab.tsx`](./roams_frontend/src/components/settings/NetworkTab.tsx) - Configuration component
- [`services/api.ts`](./roams_frontend/src/services/api.ts) - API client setup
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) - Full deployment steps

---

## Questions?

Check the frontend console for errors:
```
F12 → Console tab
Look for red error messages or network failures
```

---

