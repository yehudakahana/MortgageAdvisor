import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  reporter: [["list"], ["html", { open: "on-failure" }]],
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // E2E runs on dedicated ports (backend 3002, vite 5174) so the dev servers
  // (3001/5173) can keep running — reuseExistingServer only ever matches a
  // previous E2E run, never the dev environment with the real database.
  webServer: [
    {
      // Real express app backed by a throwaway in-memory MongoDB (see
      // backend/src/test/e2eServer.ts) — the real database is never touched.
      command: "npx ts-node --transpile-only src/test/e2eServer.ts",
      cwd: "./backend",
      url: "http://localhost:3002/api/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --port 5174 --strictPort",
      cwd: "./client",
      url: "http://localhost:5174",
      env: { API_PROXY_TARGET: "http://localhost:3002" },
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
