// Loaded first by the runner, before anything that reads process.env at import
// time (backend/src/config/llmModels.ts throws on missing keys).

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

for (const key of ["ANTHROPIC_API_KEY", "GEMINI_API_KEY"]) {
  if (!process.env[key]) {
    throw new Error(`[eval] missing ${key} — the suite makes real API calls. Set it in backend/.env`);
  }
}

// Hard guarantee that the suite cannot reach production data: no eval module
// imports config/db.ts, and without a URI nothing could connect even if one did.
delete process.env.MONGO_URI;
