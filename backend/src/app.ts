import express from "express";
import cors from "cors";
import helmet from "helmet";
import clientsRouter from "./routes/clients";
import uploadRouter from "./routes/upload";
import chatRouter from "./routes/chat";
import authRouter from "./routes/auth";
import guestAuthRouter from "./routes/guestAuth";
import settingsRouter from "./routes/settings";
import { authenticateToken } from "./middleware/authMiddleware";

// App assembly only — no DB connection and no listen() here, so tests can
// import the app and drive it with supertest. Bootstrapping lives in index.ts.
export const app = express();

// Behind Railway's reverse proxy: trust the first proxy hop so express-rate-limit
// sees the real client IP instead of the proxy's.
app.set("trust proxy", 1);

// CORS allow-list: the Cloudflare-hosted client origins plus local dev.
// Extra origins can be appended with the CLIENT_ORIGINS env var
// (comma-separated). Never reflect arbitrary origins — a phishing page that
// steals a token must not be able to call the API from the victim's browser.
const DEFAULT_CLIENT_ORIGINS = [
  "https://mortage-advisor.yk3222145.workers.dev", // production client (Cloudflare Workers)
  "https://mortgage-advisor.yehuda-kahana.workers.dev", // alternate production hostname
  "http://localhost:5173", // Vite dev
  "http://localhost:4173", // Vite preview
];
const EXTRA_ORIGINS = (process.env.CLIENT_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = [...DEFAULT_CLIENT_ORIGINS, ...EXTRA_ORIGINS];

// Security headers. Two helmet defaults are disabled on purpose:
// - contentSecurityPolicy: this API serves JSON, not HTML; the SPA's CSP is
//   delivered by Cloudflare via client/public/_headers.
// - crossOriginResourcePolicy: the SPA calls this API cross-origin
//   (Cloudflare Workers -> Railway), and CORP: same-origin would make the
//   browser drop those responses despite the CORS allow-list.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json());

// Public routes (no token required).
app.use("/api/login", authRouter);
app.use("/api/auth/guest", guestAuthRouter);
// Railway injects RAILWAY_GIT_COMMIT_SHA at build time, so the deployed commit
// is reported here — this is how we tell a stale deploy from a real bug.
const COMMIT_SHA = (process.env.RAILWAY_GIT_COMMIT_SHA ?? "unknown").slice(0, 7);
const STARTED_AT = new Date().toISOString();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", commit: COMMIT_SHA, startedAt: STARTED_AT });
});

// Everything below this line requires a valid JWT.
app.use(authenticateToken);

app.use("/api/clients", clientsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/chat", chatRouter);
app.use("/api/settings", settingsRouter);
