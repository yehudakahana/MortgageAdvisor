import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import clientsRouter from "./routes/clients";
import uploadRouter from "./routes/upload";
import chatRouter from "./routes/chat";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use("/api/clients", clientsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/chat", chatRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Sara backend running on http://localhost:${PORT}`);
});
