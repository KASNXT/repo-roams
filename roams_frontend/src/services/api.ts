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
  id: number;
  node: number;
  node_tag_name: string;
  value: number | string;
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

export async function fetchStations(): Promise<Station[]> {
  const res = await api.get<Station[]>("/clients/");
  return res.data;
}

// ✅ After: handle DRF paginated response
export async function fetchNodes(): Promise<Node[]> {
  type PaginatedNodeResponse = {
    count: number;
    next: string | null;
    previous: string | null;
    results: Node[];
  };

  const res = await api.get<PaginatedNodeResponse>("/opcua_node/");
  return res.data.results; // <-- now we only return the array
}
export async function fetchReadLogs(): Promise<ReadLog[]> {
  const res = await api.get<ReadLog[]>("/read-logs/");
  return res.data;
}

export async function fetchSummary(): Promise<Summary> {
  const res = await api.get<Summary>("/active-stations/");
  return res.data;
}

export default api;
