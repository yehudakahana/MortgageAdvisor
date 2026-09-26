// Dummy credentials so module-level SDK clients (Anthropic, Gemini, R2) and the
// auth routes construct without real secrets. Imported first by both the unit
// setup and the E2E server; a local .env is never loaded in tests.
// The JWT secret intentionally meets the 32-byte production minimum so tests
// run through the same getJwtSecret() enforcement as production.
import bcrypt from "bcryptjs";

process.env.JWT_SECRET = "test-only-jwt-secret-with-at-least-32-bytes!";
// Login passwords must be bcrypt hashes, like production (cost 4 keeps the
// suite fast; the plaintext values stay "testpass"/"otherpass").
process.env.ALLOWED_USERS = JSON.stringify({
  testuser: bcrypt.hashSync("testpass", 4),
  otheruser: bcrypt.hashSync("otherpass", 4),
});
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.R2_ACCOUNT_ID = "test-account";
process.env.R2_ACCESS_KEY_ID = "test-access-key";
process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
process.env.R2_BUCKET_NAME = "test-bucket";
