// Dummy credentials so module-level SDK clients (Anthropic, Gemini, R2) and the
// auth routes construct without real secrets. Imported first by both the unit
// setup and the E2E server; a local .env is never loaded in tests.
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_USERS = JSON.stringify({ testuser: "testpass", otheruser: "otherpass" });
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.R2_ACCOUNT_ID = "test-account";
process.env.R2_ACCESS_KEY_ID = "test-access-key";
process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
process.env.R2_BUCKET_NAME = "test-bucket";
