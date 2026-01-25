import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { getServerUrl } from "@/services/api";

interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  role?: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      fetchCurrentUser(storedToken);
    }
    setLoading(false);
  }, []);

  const fetchCurrentUser = async (token: string) => {
  try {
    const serverUrl = getServerUrl();
    const res = await axios.get<User>(`${serverUrl}/api/user/`, {
      headers: { Authorization: `Token ${token}` },
      timeout: 10000,
    });
    setUser(res.data);
  } catch (err: any) {
    console.error("Failed to fetch current user", err);
    // If we cannot reach the backend, clear auth and surface a helpful message
    logout();
  }
};

const login = async (username: string, password: string) => {
  const serverUrl = getServerUrl();
  try {
    const res = await axios.post<{ token: string }>(
      `${serverUrl}/api-token-auth/`,
      { username, password },
      { timeout: 10000 }
    );
    const token = res.data.token;
    localStorage.setItem("token", token);
    setToken(token);
    await fetchCurrentUser(token);
  } catch (err: any) {
    console.error(`Login request to ${serverUrl} failed:`, err);
    // Re-throw the error with response data intact so Login.tsx can access err.response
    throw err;
  }
};

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
