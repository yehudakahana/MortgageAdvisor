import "./testEnv";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app";
import { ClientModel } from "../models/Client";

const PORT = 3001;

// E2E backend: boots a throwaway in-memory MongoDB, seeds one client, and
// serves the real app on the real port. The database lives only inside this
// process — the real MONGO_URI from .env is never read, and everything is
// discarded when Playwright shuts the server down.
async function main(): Promise<void> {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri("sara-e2e"));

  await ClientModel.create({
    id: randomUUID(),
    name: "ישראל ישראלי",
    phone: "050-1234567",
    email: "test@example.com",
    notes: "",
    documents: [],
  });

  app.listen(PORT, () => {
    console.log(`[e2e] backend ready on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[e2e] server failed to start:", err);
  process.exit(1);
});
