# Frontend Configuration - Code Examples

Quick code samples showing how to use the configuration in your components.

---

## Reading Configuration Values

### Get Single Value
```typescript
// Get server URL
const serverUrl = localStorage.getItem("roams_server_url");
console.log(serverUrl); // "https://api.example.com"

// Get environment
const env = localStorage.getItem("roams_environment");
console.log(env); // "production"

// Get numeric values (must parse)
const timeout = Number(localStorage.getItem("roams_api_timeout"));
console.log(timeout); // 15000
```

### Get All Configuration
```typescript
const getConfig = () => ({
  serverUrl: localStorage.getItem("roams_server_url") || "http://localhost:8000",
  environment: localStorage.getItem("roams_environment") || "development",
  apiTimeout: Number(localStorage.getItem("roams_api_timeout")) || 30000,
  requestRetries: Number(localStorage.getItem("roams_request_retries")) || 3,
  healthCheck: Number(localStorage.getItem("roams_health_check")) || 35,
  reconnectDelay: Number(localStorage.getItem("roams_reconnect_delay")) || 60,
  logLevel: localStorage.getItem("roams_log_level") || "debug",
  advancedMonitoring: localStorage.getItem("roams_adv_monitoring") === "true",
  autoRefresh: localStorage.getItem("roams_auto_refresh") === "true",
  offlineMode: localStorage.getItem("roams_offline_mode") === "true",
});

const config = getConfig();
console.log(config);
// Output:
// {
//   serverUrl: "https://api.example.com",
//   environment: "production",
//   apiTimeout: 15000,
//   requestRetries: 3,
//   healthCheck: 40,
//   reconnectDelay: 120,
//   logLevel: "warn",
//   advancedMonitoring: false,
//   autoRefresh: true,
//   offlineMode: false
// }
```

---

## API Client Setup

### Basic Setup with Configuration
```typescript
// File: src/services/api.ts
import axios from "axios";

// Read configuration
const getConfig = () => ({
  baseURL: localStorage.getItem("roams_server_url") || "http://localhost:8000",
  timeout: Number(localStorage.getItem("roams_api_timeout")) || 30000,
  retries: Number(localStorage.getItem("roams_request_retries")) || 3,
});

// Create client
const config = getConfig();
const apiClient = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
```

### With Retry Logic
```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const getConfig = () => ({
  baseURL: localStorage.getItem("roams_server_url") || "http://localhost:8000",
  timeout: Number(localStorage.getItem("roams_api_timeout")) || 30000,
  retries: Number(localStorage.getItem("roams_request_retries")) || 3,
  logLevel: localStorage.getItem("roams_log_level") || "info",
});

const config = getConfig();
let retryCount = 0;

const apiClient = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
});

// Response interceptor with retry logic
apiClient.interceptors.response.use(
  (response) => {
    retryCount = 0;
    return response;
  },
  async (error: AxiosError) => {
    const maxRetries = config.retries;

    // Check if should retry
    if (
      retryCount < maxRetries &&
      (error.code === "ECONNABORTED" || // timeout
        (error.response?.status && error.response.status >= 500))
    ) {
      retryCount++;

      // Exponential backoff
      const delayMs = 1000 * Math.pow(2, retryCount - 1);
      console.log(
        `[API] Retry ${retryCount}/${maxRetries} after ${delayMs}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));

      return apiClient.request(error.config as InternalAxiosRequestConfig);
    }

    retryCount = 0;
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## React Hook: useConfig

Create a custom hook to access configuration:

```typescript
// File: src/hooks/useConfig.ts
import { useState, useEffect } from "react";

interface Config {
  serverUrl: string;
  environment: "development" | "staging" | "production";
  apiTimeout: number;
  requestRetries: number;
  healthCheck: number;
  reconnectDelay: number;
  logLevel: string;
  advancedMonitoring: boolean;
  autoRefresh: boolean;
  offlineMode: boolean;
}

export function useConfig(): Config {
  const [config, setConfig] = useState<Config>({
    serverUrl: localStorage.getItem("roams_server_url") || "http://localhost:8000",
    environment: (localStorage.getItem("roams_environment") || "development") as any,
    apiTimeout: Number(localStorage.getItem("roams_api_timeout")) || 30000,
    requestRetries: Number(localStorage.getItem("roams_request_retries")) || 3,
    healthCheck: Number(localStorage.getItem("roams_health_check")) || 35,
    reconnectDelay: Number(localStorage.getItem("roams_reconnect_delay")) || 60,
    logLevel: localStorage.getItem("roams_log_level") || "debug",
    advancedMonitoring: localStorage.getItem("roams_adv_monitoring") === "true",
    autoRefresh: localStorage.getItem("roams_auto_refresh") === "true",
    offlineMode: localStorage.getItem("roams_offline_mode") === "true",
  });

  useEffect(() => {
    // Listen for storage changes
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.startsWith("roams_")) {
        setConfig((prev) => ({
          ...prev,
          [event.key.replace("roams_", "")]: event.newValue,
        }));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return config;
}

// Usage in component:
// const config = useConfig();
// console.log(config.serverUrl);
```

---

## Data Fetching Examples

### Basic Fetch with Error Handling
```typescript
import { useState, useEffect } from "react";
import apiClient from "@/services/api";

export function StationList() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/api/stations/");
        setStations(response.data);
        setError(null);
      } catch (err) {
        if (err.code === "ECONNABORTED") {
          setError("Request timed out. Try increasing timeout in Settings.");
        } else if (err.response?.status === 404) {
          setError("Server not found. Check URL in Settings.");
        } else {
          setError(err.message || "Failed to load stations");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  return (
    <div>
      {stations.map((station) => (
        <div key={station.id}>{station.name}</div>
      ))}
    </div>
  );
}
```

### Fetch with Auto-Refresh
```typescript
import { useState, useEffect } from "react";
import apiClient from "@/services/api";
import { useConfig } from "@/hooks/useConfig";

export function LiveStationData() {
  const [data, setData] = useState(null);
  const config = useConfig();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/stations/latest/");
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    // Initial fetch
    fetchData();

    // Auto-refresh if enabled
    if (config.autoRefresh) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [config.autoRefresh]);

  return <div>{data ? JSON.stringify(data) : "Loading..."}</div>;
}
```

### Fetch with Offline Fallback
```typescript
import { useState, useEffect } from "react";
import apiClient from "@/services/api";
import { useConfig } from "@/hooks/useConfig";

export function StationDataWithFallback() {
  const [data, setData] = useState(null);
  const [offline, setOffline] = useState(false);
  const config = useConfig();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/stations/");
        setData(response.data);
        setOffline(false);

        // Cache for offline use
        localStorage.setItem("roams_cached_stations", JSON.stringify(response.data));
      } catch (error) {
        // Try offline mode
        if (config.offlineMode) {
          const cached = localStorage.getItem("roams_cached_stations");
          if (cached) {
            setData(JSON.parse(cached));
            setOffline(true);
            return;
          }
        }
        console.error("Failed to load data:", error);
      }
    };

    fetchData();
  }, [config.offlineMode]);

  return (
    <div>
      {offline && <div className="bg-yellow-100">Using cached data (offline)</div>}
      {data ? JSON.stringify(data) : "Loading..."}
    </div>
  );
}
```

---

## Feature Flag Usage

### Conditional Feature Rendering
```typescript
import { useConfig } from "@/hooks/useConfig";

export function Dashboard() {
  const config = useConfig();

  return (
    <div>
      <BasicMetrics />

      {config.advancedMonitoring && (
        <div>
          <h2>Advanced Metrics</h2>
          <DetailedMetrics />
          <PerformanceChart />
        </div>
      )}

      {config.autoRefresh && (
        <div className="bg-green-100 p-2">Auto-refresh enabled</div>
      )}

      {config.offlineMode && (
        <div className="bg-yellow-100 p-2">Offline mode available</div>
      )}
    </div>
  );
}
```

### Environment-Based Rendering
```typescript
import { useConfig } from "@/hooks/useConfig";

export function DebugPanel() {
  const config = useConfig();

  if (config.environment === "production") {
    return null; // Don't show debug panel in production
  }

  return (
    <div className="bg-gray-900 text-green-400 p-4 font-mono text-sm">
      <div>Environment: {config.environment}</div>
      <div>Server: {config.serverUrl}</div>
      <div>Timeout: {config.apiTimeout}ms</div>
      <div>Log Level: {config.logLevel}</div>
    </div>
  );
}
```

### Log Level Based Logging
```typescript
import { useConfig } from "@/hooks/useConfig";

export function useLogger() {
  const config = useConfig();

  const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = logLevels[config.logLevel] || 0;

  return {
    debug: (msg: string, data?: any) => {
      if (currentLevel <= logLevels.debug) {
        console.debug(`[DEBUG] ${msg}`, data);
      }
    },
    info: (msg: string, data?: any) => {
      if (currentLevel <= logLevels.info) {
        console.info(`[INFO] ${msg}`, data);
      }
    },
    warn: (msg: string, data?: any) => {
      if (currentLevel <= logLevels.warn) {
        console.warn(`[WARN] ${msg}`, data);
      }
    },
    error: (msg: string, data?: any) => {
      if (currentLevel <= logLevels.error) {
        console.error(`[ERROR] ${msg}`, data);
      }
    },
  };
}

// Usage:
// const logger = useLogger();
// logger.debug("This shows in debug mode only");
// logger.info("This shows in debug and info modes");
```

---

## OPC UA Health Check

### Using Health Check Interval
```typescript
import { useState, useEffect } from "react";
import apiClient from "@/services/api";
import { useConfig } from "@/hooks/useConfig";

export function OPCUAHealthMonitor() {
  const [connected, setConnected] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const config = useConfig();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await apiClient.get("/api/opcua/health/");
        setConnected(response.data.connected);
        setLastCheck(new Date());
      } catch (error) {
        setConnected(false);
      }
    };

    // Initial check
    checkHealth();

    // Set up interval using configured health check interval
    const interval = setInterval(checkHealth, config.healthCheck * 1000);

    return () => clearInterval(interval);
  }, [config.healthCheck]);

  return (
    <div>
      <div>OPC UA Status: {connected ? "✅ Connected" : "❌ Disconnected"}</div>
      <div>Last Check: {lastCheck?.toLocaleTimeString()}</div>
      <div>Check Interval: Every {config.healthCheck} seconds</div>
    </div>
  );
}
```

---

## Environment-Specific Setup

### Connection Configuration by Environment
```typescript
export const getEnvironmentConfig = (
  env: "development" | "staging" | "production"
) => {
  const configs = {
    development: {
      serverUrl: "http://localhost:8000",
      timeout: 30000,
      retries: 3,
      healthCheck: 35,
    },
    staging: {
      serverUrl: "https://api-staging.example.com",
      timeout: 20000,
      retries: 2,
      healthCheck: 30,
    },
    production: {
      serverUrl: "https://api.example.com",
      timeout: 15000,
      retries: 1,
      healthCheck: 40,
    },
  };

  return configs[env];
};

// Usage
const envConfig = getEnvironmentConfig("production");
console.log(envConfig);
// { serverUrl: "https://api.example.com", timeout: 15000, retries: 1, healthCheck: 40 }
```

---

## Error Handling Patterns

### Handle Timeout Errors
```typescript
import apiClient from "@/services/api";

export async function fetchWithTimeoutHandling(url: string) {
  try {
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Request timed out. The server is taking too long to respond. " +
        "Try increasing the timeout in Settings → Network → API Settings"
      );
    }
    throw error;
  }
}
```

### Handle Connection Errors
```typescript
export async function fetchWithConnectionHandling(url: string) {
  try {
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    if (error.message === "Network Error") {
      throw new Error(
        "Cannot connect to server. Check your URL in Settings → Network. " +
        "Make sure the backend is running at: " +
        localStorage.getItem("roams_server_url")
      );
    }
    throw error;
  }
}
```

### User-Friendly Error Messages
```typescript
export function getErrorMessage(error: any): string {
  const timeout = Number(localStorage.getItem("roams_api_timeout")) || 30000;

  if (error.code === "ECONNABORTED") {
    return `Server didn't respond within ${timeout / 1000} seconds. Try increasing the timeout in Settings.`;
  }

  if (error.response?.status === 404) {
    const url = localStorage.getItem("roams_server_url");
    return `Server not found at: ${url}. Check the URL in Settings.`;
  }

  if (error.response?.status === 502) {
    return "Backend server is down or unreachable. Check Settings → Network.";
  }

  if (error.message === "Network Error") {
    return "Network connection failed. Check your internet connection.";
  }

  return error.message || "An error occurred";
}

// Usage
try {
  await fetchData();
} catch (error) {
  alert(getErrorMessage(error));
}
```

---

## Testing Configuration

### Verify Configuration Loaded
```typescript
export function verifyConfiguration() {
  const config = {
    serverUrl: localStorage.getItem("roams_server_url"),
    environment: localStorage.getItem("roams_environment"),
    timeout: Number(localStorage.getItem("roams_api_timeout")),
    retries: Number(localStorage.getItem("roams_request_retries")),
  };

  console.table(config);

  // Validation
  if (!config.serverUrl) console.warn("⚠️ Server URL not set");
  if (!config.environment) console.warn("⚠️ Environment not set");
  if (!config.timeout) console.warn("⚠️ Timeout not set");

  return config;
}

// Run in console: verifyConfiguration()
```

### Test API Connection
```typescript
export async function testApiConnection() {
  const serverUrl = localStorage.getItem("roams_server_url") || "http://localhost:8000";

  try {
    const response = await fetch(`${serverUrl}/api/health/`, {
      timeout: 5000, // Short timeout for test
    });

    if (response.ok) {
      console.log("✅ API connection successful");
      return true;
    } else {
      console.log(
        `❌ API returned status ${response.status}`
      );
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot connect to ${serverUrl}`, error);
    return false;
  }
}

// Run in console: await testApiConnection()
```

---

## Usage Summary

| Task | Code Pattern |
|------|---|
| Get single value | `localStorage.getItem("roams_server_url")` |
| Get all config | `useConfig()` hook |
| Setup API client | Read from localStorage in axios create |
| Fetch data | Use apiClient instead of fetch/axios |
| Conditional rendering | `if (config.advancedMonitoring)` |
| Health checks | `setInterval(check, config.healthCheck * 1000)` |
| Error handling | Check `error.code === "ECONNABORTED"` for timeouts |
| Logging | Use `config.logLevel` to filter output |

---

