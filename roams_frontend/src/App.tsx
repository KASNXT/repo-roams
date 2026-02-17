// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import LoginPage from "./pages/Login";
import Index from "./pages/Index";
import Analysis from "./pages/Analysis";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Overview from "./pages/Overview";
import NotFound from "./pages/NotFound";
import Control from "./pages/control";
import StationMapFullPage from "./pages/StationMapFullPage";
import VPNConnections from "./pages/VPNConnections";
import {useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient();

// PrivateRoute component
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { token, loading } = useAuth();

  if (loading) return <div>Loading...</div>; // wait for auth state
  return token ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem={true}
        storageKey="roams_theme_preference"
        disableTransitionOnChange={false}
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Index />
                  </PrivateRoute>
                }
              />
              <Route
                path="/analysis"
                element={
                  <PrivateRoute>
                    <Analysis />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <PrivateRoute>
                    <Notifications />
                  </PrivateRoute>
                }
              />
              <Route
                path="/overview"
                element={
                  <PrivateRoute>
                    <Overview />
                  </PrivateRoute>
                }
              />
              <Route
                path="/control"
                element={
                  <PrivateRoute>
                    <Control />
                  </PrivateRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <PrivateRoute>
                    <StationMapFullPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/vpn-connections"
                element={
                  <PrivateRoute>
                    <VPNConnections />
                  </PrivateRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
