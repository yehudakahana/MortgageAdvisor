// testEnv runs before any app import: setup files execute before test files.
import "./testEnv";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

// Outbound network guard. MSW patches node's http/fetch globally, which also
// covers supertest's own loopback traffic — so instead of the plain
// onUnhandledRequest: "error", the same guarantee is expressed as a function:
// loopback passes through (that's the server under test), anything else throws.
export const server = setupServer();

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

beforeAll(() =>
  server.listen({
    onUnhandledRequest(request) {
      const { hostname } = new URL(request.url);
      if (LOOPBACK_HOSTS.has(hostname)) return;
      throw new Error(
        `[test] blocked external request: ${request.method} ${request.url}`
      );
    },
  })
);
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
