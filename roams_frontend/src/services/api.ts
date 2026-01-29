// roams_frontend/src/services/api.ts
import axios from "axios";

// Get server URL based on hostname (no localStorage dependency)
export const getServerUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    
    // VPS production
    if (hostname === '144.91.79.167') {
      return 'http://144.91.79.167:8000';
    }
    
    // Local development
    return "http://localhost:8000";
  }
  return "http://localhost:8000";
};

const api = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false, // Set to true only if using session cookies
});

// --- Attach token and dynamic baseURL automatically ---
api.interceptors.request.use((config) => {
  // Set baseURL dynamically on each request
  config.baseURL = `${getServerUrl()}/api`;
  
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Token ${token}`;
  }
  return config;
});

// --- Handle authentication errors ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Authentication failed - token may be invalid or expired");
      // Optionally clear token and redirect to login
      // localStorage.removeItem("token");
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// -------- Types --------
export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
}

export interface Station {
  id: number;
  station_name: string;
  endpoint_url: string;
  active: boolean;
  connection_status: string;
  security_policy: string;
  last_connected: string | null;
  created_at: string;
}

export interface Node {
  id: number;
  tag_name: string | null;
  node_id: string;
  last_value: string | null;
  last_updated: string;
  tag_units: string | null;
  add_new_tag_name: string;
  access_level: string;
  station_name: string;
  min_value: number | null;
  max_value: number | null;
}

export interface ReadLog {
  id: number | string;
  station_name: string;
  node_tag_name: string | null;
  value: number | string | null;
  timestamp: string;
}

export interface ThresholdBreach {
  id: number;
  node: number;
  node_name: string;
  node_id?: string;
  node_tag_name?: string;
  station_name?: string;
  threshold: number;
  breach_value: number;
  breach_type: string;
  level?: string;
  value?: number;
  min_value?: number;
  max_value?: number;
  warning_level?: number;
  critical_level?: number;
  timestamp: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

export interface Summary {
  total_active_stations: number;
  total_connected_stations: number;
}


// -------- API Calls --------
export async function fetchCurrentUser(): Promise<User> {
  const res = await api.get<User>("/user/");
  return res.data;
}

// ✅ Fetch OPC UA Clients (Stations)
export async function fetchStations(): Promise<Station[]> {
  type PaginatedResponse = {
    count: number;
    next: string | null;
    previous: string | null;
    results: Station[];
  };

  const res = await api.get<PaginatedResponse | Station[]>("/opcua_clientconfig/");
  return Array.isArray(res.data) ? res.data : res.data.results || [];
}

// ✅ Fetch Nodes
export async function fetchNodes(): Promise<Node[]> {
  interface PaginatedNodeResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Node[];
  }

  const res = await api.get<PaginatedNodeResponse | Node[]>("/opcua_node/");
  const data = res.data;

  if (Array.isArray(data)) {
    return data;
  } else if ("results" in data) {
    return data.results;
  } else {
    console.warn("⚠️ Unexpected node API response format:", data);
    return [];
  }
}

// ✅ Fetch Read Logs (with pagination + filters)
export async function fetchReadLogs(
  stationName?: string,
  dateRange?: { from?: Date; to?: Date }
): Promise<ReadLog[]> {
  interface PaginatedReadLogResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ReadLog[];
  }

  let allResults: ReadLog[] = [];
  let url: string | null = "/opcua_readlog/";

    const params: Record<string, string> = {};

    if (stationName) params.station_name = stationName;
    if (dateRange?.from) params.timestamp_after = dateRange.from.toISOString();
    if (dateRange?.to) params.timestamp_before = dateRange.to.toISOString();

    while (url) {
      const res = await api.get<PaginatedReadLogResponse>(url, { params });
      const data: PaginatedReadLogResponse = res.data;

      allResults = allResults.concat(data.results);

      // next may be null → perfectly valid now
      url = data.next ? data.next.replace(`${getServerUrl()}/api`, "") : null;
    }

    return allResults;
  }

// -------- Summary Data --------
export async function fetchSummary(): Promise<Summary> {
  const res = await api.get<Summary>("/active-stations/");
  return res.data;
}

// ✅ Fetch Active Threshold Breaches (Alarms)
export async function fetchActiveBreaches(): Promise<ThresholdBreach[]> {
  interface PaginatedBreachResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ThresholdBreach[];
  }

  try {
    const res = await api.get<PaginatedBreachResponse | ThresholdBreach[]>("/breaches/?acknowledged=false");
    const data = res.data;

    if (Array.isArray(data)) {
      return data;
    } else if ("results" in data) {
      return data.results;
    } else {
      console.warn("⚠️ Unexpected breach API response format:", data);
      return [];
    }
  } catch (err) {
    console.error("Failed to fetch active breaches:", err);
    return [];
  }
}

// ✅ Fetch All Threshold Breaches (with filters)
export async function fetchBreaches(acknowledged?: boolean): Promise<ThresholdBreach[]> {
  interface PaginatedBreachResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ThresholdBreach[];
  }

  let allResults: ThresholdBreach[] = [];
  let url: string | null = "/breaches/?limit=100"; // Limit to 100 per page to reduce response size

  const params: Record<string, string> = {};

  if (acknowledged !== undefined) {
    params.acknowledged = String(acknowledged);
  }

  try {
    let pageCount = 0;
    const maxPages = 5; // Limit to 500 breaches max for now (5 pages × 100)
    
    while (url && pageCount < maxPages) {
      try {
        pageCount++;
        console.log(`📡 Fetching page ${pageCount} from: ${url}`);
        const res = await api.get<PaginatedBreachResponse>(url, { 
          params,
          timeout: 5000, // 5 second timeout per request
        });
        const data: PaginatedBreachResponse = res.data;
        console.log(`📦 Page ${pageCount}: Got ${data.results.length} results, next: ${data.next ? "yes" : "no"}`);

        allResults = allResults.concat(data.results);
        url = data.next ? data.next.replace(`${getServerUrl()}/api`, "") : null;
      } catch (err) {
        console.error("❌ Error in fetch loop:", err);
        throw err;
      }
    }
    
    if (pageCount >= maxPages && url) {
      console.log("⚠️ Reached max pages limit, stopping pagination");
    }
    
    console.log(`✅ Total fetched: ${allResults.length} breaches`);
    return allResults;
  } catch (error) {
    console.error("❌ Error fetching breaches:", error);
    throw error;
  }
}

// -------- Telemetry Data --------
export interface TelemetryPoint {
  timestamp: string;
  parameter: string;
  value: number;
  station: string;
}

export async function fetchTelemetry(
  stationId: string,
  dateRange?: { from?: Date; to?: Date }
): Promise<TelemetryPoint[]> {
  const params: Record<string, string> = { station: stationId };

  if (dateRange?.from) params.from = dateRange.from.toISOString();
  if (dateRange?.to) params.to = dateRange.to.toISOString();

  const res = await api.get<TelemetryPoint[]>("/telemetry/", { params });
  return res.data;
}

export default api;
