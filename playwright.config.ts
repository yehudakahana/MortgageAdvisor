import { defineConfig, devices } from "@playwright/test";

// E2E runs on dedicated ports so the dev servers (3001/5173) can keep running —
// reuseExistingServer only ever matches a previous E2E run, never the dev
// environment with the real database. Both ports are single-sourced here.
const BACKEND_PORT = 3002;
const CLIENT_PORT = 5174;

export default defineConfig({
  testDir: "./e2e",
  reporter: [["list"], ["html", { open: "on-failure" }]],
  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Real express app backed by a throwaway in-memory MongoDB (see
      // backend/src/test/e2eServer.ts) — the real database is never touched.
      command: "npx ts-node --transpile-only src/test/e2eServer.ts",
      cwd: "./backend",
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      env: { E2E_BACKEND_PORT: String(BACKEND_PORT) },
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --port ${CLIENT_PORT} --strictPort`,
      cwd: "./client",
      url: `http://localhost:${CLIENT_PORT}`,
      env: { API_PROXY_TARGET: `http://localhost:${BACKEND_PORT}` },
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
