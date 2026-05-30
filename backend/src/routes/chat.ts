import { Router, Request, Response } from "express";
import * as db from "../services/dbService";
import { ChatMessage } from "../types";

const router = Router();

// Placeholder — will be wired to Claude API in Phase 2
router.post("/", (req: Request, res: Response) => {
  const { message } = req.body as { message: string };
  if (!message) return res.status(400).json({ error: "message is required" });

  const clients = db.getAllClients();
  const reply: ChatMessage = {
    role: "assistant",
    content: `[Sara - stub] You asked: "${message}". There are currently ${clients.length} client(s) in the system.`,
  };
  res.json(reply);
});

export default router;
