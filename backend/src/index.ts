// Load .env before any other import so module-level SDK clients (Anthropic,
// Gemini) read their API keys at construction time.
import "dotenv/config";
import { app } from "./app";
import { connectDB } from "./config/db";
import { getJwtSecret } from "./config/auth";

const PORT = process.env.PORT ?? 3001;

// Fail fast on a missing or weak JWT signing secret — a weak secret makes
// every issued token forgeable, so starting up anyway is never acceptable.
try {
  getJwtSecret();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

// Connect to MongoDB before accepting traffic — no request is served without a
// live database connection.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`kay.ai backend running on http://localhost:${PORT}`);
  });
});
