import { Router } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { timingSafeEqual } from "crypto";
import { AUTH_MESSAGES } from "../constants/messages";

const router = Router();

// Constant-time string comparison to avoid leaking credential length/match
// timing. Returns false (without short-circuiting on content) for any mismatch.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Throttle brute-force password attempts per IP (relies on app.set("trust proxy")).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: AUTH_MESSAGES.tooManyAttempts },
});

// POST /api/login — validates credentials against the ALLOWED_USERS env map and
// returns a 30-day signed JWT. Never crashes on bad config; returns 500 instead.
router.post("/", loginLimiter, (req, res) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[CONFIG ERROR] JWT_SECRET is not set.");
    return res.status(500).json({ error: AUTH_MESSAGES.serverConfigError });
  }

  let allowedUsers: Record<string, string>;
  try {
    allowedUsers = JSON.parse(process.env.ALLOWED_USERS ?? "");
  } catch {
    console.error("[CONFIG ERROR] ALLOWED_USERS is missing or not valid JSON.");
    return res.status(500).json({ error: AUTH_MESSAGES.serverConfigError });
  }

  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: AUTH_MESSAGES.missingCredentials });
  }

  // typeof guard also avoids prototype-chain lookups (e.g. "__proto__").
  const expected = allowedUsers[username];
  if (typeof expected !== "string" || !safeEqual(expected, password)) {
    return res.status(401).json({ error: AUTH_MESSAGES.badCredentials });
  }

  const token = jwt.sign({ username }, secret, { expiresIn: "30d" });
  return res.json({ token, username });
});

export default router;
