import mongoose from "mongoose";

// Initialize the MongoDB connection from MONGO_URI. Called once at startup,
// before the HTTP server begins listening, so no request is served without a
// live database connection. On failure we exit the process — running the API
// against a dead DB would only surface errors on every request.
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[db] MONGO_URI is not set — aborting startup");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("[db] MongoDB connected");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[db] MongoDB connection failed:", reason);
    process.exit(1);
  }
}
