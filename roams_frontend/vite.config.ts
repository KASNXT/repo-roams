// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
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
