import { Router } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { AUTH_MESSAGES } from "../constants/messages";
import { getJwtSecret } from "../config/auth";

const router = Router();

// bcrypt hashes look like $2b$12$<53 chars> — anything else stored in
// ALLOWED_USERS is a misconfiguration, since plaintext passwords are no longer
// accepted.
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

// Compared against when the username doesn't exist, so unknown and known
// usernames take the same time (no user-enumeration via timing).
const DUMMY_HASH = "$2b$04$GA8Vfp7h6bgR7T33/MFq9OFkp4M0.Nnw7sHNclIuc1p6MajTgIVTW";

// Throttle brute-force password attempts per IP (relies on app.set("trust proxy")).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: AUTH_MESSAGES.tooManyAttempts },
});

// POST /api/login — validates credentials against the ALLOWED_USERS env map and
// returns a 30-day signed JWT. Passwords must be stored as bcrypt hashes —
// plaintext entries are rejected as a config error (fail-closed). Never
// crashes on bad config; returns 500 instead.
router.post("/", loginLimiter, async (req, res) => {
  // Throws on a missing or weak secret; answer 500 rather than crash, and
  // never sign a token with an unusable secret (fail-closed).
  let secret: string;
  try {
    secret = getJwtSecret();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
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
  if (typeof expected !== "string") {
    // Unknown user: still run a compare so the timing matches a real login.
    await bcrypt.compare(password, DUMMY_HASH);
    return res.status(401).json({ error: AUTH_MESSAGES.badCredentials });
  }
  if (!isBcryptHash(expected)) {
    console.error(
      `[CONFIG ERROR] ALLOWED_USERS entry for "${username}" is not a bcrypt hash; ` +
        "plaintext passwords are not accepted."
    );
    return res.status(500).json({ error: AUTH_MESSAGES.serverConfigError });
  }
  if (!(await bcrypt.compare(password, expected))) {
    return res.status(401).json({ error: AUTH_MESSAGES.badCredentials });
  }

  const token = jwt.sign({ username }, secret, { expiresIn: "30d" });
  return res.json({ token, username });
});

export default router;
