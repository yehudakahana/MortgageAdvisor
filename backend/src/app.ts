import express from "express";
import cors from "cors";
import clientsRouter from "./routes/clients";
import uploadRouter from "./routes/upload";
import chatRouter from "./routes/chat";
import authRouter from "./routes/auth";
import { authenticateToken } from "./middleware/authMiddleware";

// App assembly only — no DB connection and no listen() here, so tests can
// import the app and drive it with supertest. Bootstrapping lives in index.ts.
export const app = express();

// Behind Railway's reverse proxy: trust the first proxy hop so express-rate-limit
// sees the real client IP instead of the proxy's.
app.set("trust proxy", 1);

// Allow the Authorization header through CORS preflight so the React client can
// send Bearer tokens.
app.use(
  cors({
    origin: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json());

// Public routes (no token required).
app.use("/api/login", authRouter);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Everything below this line requires a valid JWT.
app.use(authenticateToken);

app.use("/api/clients", clientsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/chat", chatRouter);
