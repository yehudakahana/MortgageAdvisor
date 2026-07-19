# Offline Testing

Local test infrastructure (Vitest + Playwright) that runs green with **no
network access** after a one-time install.

## One-time install (network required once)

```sh
npm --prefix client install
npm --prefix backend install
npm install                                # root: @playwright/test
npx playwright install --with-deps chromium
npm run test:e2e                           # first run downloads the mongod binary
```

The last two steps cache binaries outside the repo (`%LOCALAPPDATA%\ms-playwright`
and mongodb-memory-server's binary cache). After that, everything runs offline.

## Scripts (repo root)

| Script | What it runs |
|---|---|
| `npm test` | FE + BE unit suites |
| `npm run test:fe` / `test:be` | one suite (`test:watch:fe` / `test:watch:be` to watch) |
| `npm run test:e2e` | Playwright login flow (`test:e2e:ui` for UI mode) |
| `npm run test:offline` | same E2E suite through a black-hole proxy (see below) |

## Test database isolation

There is no db.json — persistence is MongoDB via Mongoose. E2E never touches
the real database: `backend/src/test/e2eServer.ts` boots an **in-memory
MongoDB** (mongodb-memory-server), seeds one client, and serves the real app
with dummy secrets from `backend/src/test/testEnv.ts`. The real `.env` /
`MONGO_URI` is never read, and the database dies with the process.

E2E runs on dedicated ports — backend **3002** and its own vite instance on
**5174** (proxying `/api` to 3002 via `API_PROXY_TARGET`). The dev servers on
3001/5173 can keep running; `reuseExistingServer: true` only ever matches a
previous E2E run, never the dev environment.

## No-external-calls enforcement

- **FE unit:** MSW with `onUnhandledRequest: "error"` (`client/src/test/setup.ts`)
  — any unmocked request fails the test.
- **BE unit:** MSW node guard (`backend/src/test/setup.ts`) — loopback traffic
  (supertest talking to the app under test) passes through, any other origin
  throws. Never relax either setting.
- **E2E:** `e2e/fixtures.ts` aborts every non-localhost page request and fails
  the test listing the offending URLs.
- **`test:offline`:** additionally forces the browser through a proxy at
  `http://127.0.0.1:9` (nothing listens there) with only localhost bypassed, so
  any escaped request dies at the network layer.

## Final sign-off

The proxy only covers browser traffic; backend-originated calls (Anthropic,
Gemini, R2) get dummy keys and are not exercised by the login flow. Final
sign-off is therefore **one manual run of the full suite with WiFi off**:

```sh
npm test && npm run test:e2e
```
