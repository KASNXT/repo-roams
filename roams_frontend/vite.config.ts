// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173, // Fixed port - won't auto-increment
    strictPort: true, // Fail if port is in use instead of trying next port
    // SPA fallback
    open: true, // optional: opens browser automatically
    watch: {
      usePolling: true,
    },
  },
  // For SPA routing (so /analysis works)
  build: {
    rollupOptions: {
      input: "/index.html",
    },
  },
});
