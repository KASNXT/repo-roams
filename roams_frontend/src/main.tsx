// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Import global CSS
import "./index.css"; // or wherever your main CSS file is

import { AuthProvider } from "./hooks/useAuth";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
