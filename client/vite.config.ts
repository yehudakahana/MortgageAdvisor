import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Overridable so the E2E run (playwright.config.ts) can point its own
      // vite instance at the test backend on 3002 instead of the dev backend.
      "/api": process.env.API_PROXY_TARGET ?? "http://localhost:3001",
    },
  },
});
