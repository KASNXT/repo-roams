import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = "http://localhost:8000/api";

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
    const res = await axios.get<User>(`${API_BASE_URL}/user/`, {
      headers: { Authorization: `Token ${token}` },
    });
    setUser(res.data);
  } catch (err) {
    console.error("Failed to fetch current user", err);
    logout();
  }
};

const login = async (username: string, password: string) => {
  const res = await axios.post<{ token: string }>(`${API_BASE_URL}/api-token-auth/`, {
    username,
    password,
  });
  const token = res.data.token;
  localStorage.setItem("token", token);
  setToken(token);
  await fetchCurrentUser(token);
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
