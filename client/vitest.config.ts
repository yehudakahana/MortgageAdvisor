import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Merges the real vite config so the "@" alias (and any future resolve options)
// is defined in exactly one place.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
    },
  })
);
