// roams_frontend/src/services/api.ts
import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Attach token automatically ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Token ${token}`;
  }
  return config;
});

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

  const res = await api.get<PaginatedResponse | Station[]>("/clients/");
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
  let url: string | null = "/read-logs/";

    const params: Record<string, string> = {};

    if (stationName) params.station_name = stationName;
    if (dateRange?.from) params.timestamp_after = dateRange.from.toISOString();
    if (dateRange?.to) params.timestamp_before = dateRange.to.toISOString();

    while (url) {
      const res = await api.get<PaginatedReadLogResponse>(url, { params });
      const data: PaginatedReadLogResponse = res.data;

      allResults = allResults.concat(data.results);

      // next may be null → perfectly valid now
      url = data.next ? data.next.replace(API_BASE_URL, "") : null;
    }

    return allResults;
  }

// -------- Summary Data --------
export async function fetchSummary(): Promise<Summary> {
  const res = await api.get<Summary>("/active-stations/");
  return res.data;
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
