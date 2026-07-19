import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";

// Shared MSW server; tests register handlers per-case with server.use(...).
// onUnhandledRequest: "error" fails any test whose code performs a network
// request that no handler covers — nothing ever leaves the process.
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  localStorage.clear();
});
afterAll(() => server.close());
