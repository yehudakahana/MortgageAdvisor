// Load .env before any other import so module-level SDK clients (Anthropic,
// Gemini) read their API keys at construction time.
import "dotenv/config";
import { app } from "./app";
import { connectDB } from "./config/db";

const PORT = process.env.PORT ?? 3001;

// Connect to MongoDB before accepting traffic — no request is served without a
// live database connection.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`kay.ai backend running on http://localhost:${PORT}`);
  });
});
