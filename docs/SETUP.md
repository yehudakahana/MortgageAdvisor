# Setup

## Prerequisites

- Node.js 20+ and npm
- MongoDB (local or Atlas)
- Anthropic and Gemini API keys
- A private Cloudflare R2 bucket with read/write/delete credentials

The app requires **both AI keys and all four R2 settings** at startup, even to open the UI. Unit tests and evals have lighter requirements (below).

## Install

```bash
git clone https://github.com/yehudakahana/MortgageAdvisor.git
cd MortgageAdvisor
npm ci
npm --prefix backend ci
npm --prefix client ci
```

Root, backend, and client have separate lockfiles (not npm workspaces).

## Configure

```bash
cp backend/.env.example backend/.env
cp client/.env.example client/.env
openssl rand -hex 32   # use as JWT_SECRET
```

| Variable | Notes |
| --- | --- |
| `JWT_SECRET` | Required, ≥ 32 bytes |
| `ALLOWED_USERS` | Required: JSON map of username → bcrypt hash |
| `MONGO_URI` | Required |
| `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | Required |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Required |
| `PORT` | Optional, default `3001` |
| `JWT_VERSION` | Optional, default `1`; bump to revoke all tokens |
| `CLIENT_ORIGINS` | Optional extra CORS origins, comma-separated |
| `CLAUDE_MODEL`, `GEMINI_MODEL` | Optional model overrides (defaults in [`llmModels.ts`](../backend/src/config/llmModels.ts)) |

Generate a password hash:

```bash
cd backend
node -e 'console.log(require("bcryptjs").hashSync("YOUR_PASSWORD", 12))'
```

Then `ALLOWED_USERS={"advisor":"<hash>"}`. Plaintext passwords are rejected.

Leave `VITE_API_URL` empty in `client/.env` — Vite proxies `/api` to `localhost:3001` (override with `API_PROXY_TARGET`).

## Run

```bash
npm --prefix backend run dev   # terminal 1
npm --prefix client run dev    # terminal 2
```

Open http://localhost:5173. Health check: http://localhost:3001/api/health.

## Deploy

```bash
npm --prefix backend run build
npm --prefix client run build
npm --prefix backend start
```

Serve `client/dist` as static assets (Cloudflare Workers config included). `client/.env.production` points to the demo backend — override `VITE_API_URL` for your own deployment, and update CSP `connect-src` in `client/public/_headers` and backend CORS origins.

## Tests and evals

```bash
npm test                 # all unit/API tests
npm run test:fe          # frontend only
npm run test:be          # backend only

npx playwright install --with-deps chromium
npm run test:e2e         # login flow against real Express + temp MongoDB
npm run test:offline     # same, with non-local traffic blocked
```

Unit tests use dummy credentials, MSW to block external calls, and an in-memory MongoDB. CI runs build + unit tests on both packages, plus a dependency audit. CI does not run the paid evals.

### Evals

Needs only `ANTHROPIC_API_KEY` and `GEMINI_API_KEY`. Makes **real, billable calls**.

```bash
npm run eval -- --repeats=1 --limit=3   # smoke run
npm run eval                            # 32 non-holdout cases × 3 attempts
npm run eval -- --holdout               # 8 holdout cases
npm run eval -- --only=extraction
npm run eval -- --category=unanswerable
```

Set `EVAL_JUDGE_MODEL` to a model available on your account and different from both chat models (used for 2 open-ended cases). Results go to `backend/evals/results/`. Full details: [`backend/evals/README.md`](../backend/evals/README.md).
