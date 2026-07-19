import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

// Offline verification: identical to the base config, but the browser is
// forced through a black-hole proxy (port 9 — nothing listens there), with
// only localhost bypassed. Any request that escapes the route guard in
// e2e/fixtures.ts dies at the network layer instead of reaching the internet.
export default defineConfig({
  ...baseConfig,
  use: {
    ...baseConfig.use,
    proxy: {
      server: "http://127.0.0.1:9",
      bypass: "localhost,127.0.0.1",
    },
  },
});
