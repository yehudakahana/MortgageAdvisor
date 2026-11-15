import { Router, Request, Response } from "express";
import { ClientModel } from "../models/Client";
import { runValidation } from "../services/validationService";
import { Client } from "../types";
import { CLIENT_MESSAGES, VALIDATION_MESSAGES } from "../constants/messages";

const router = Router();

// GET /api/validation/:clientId
// Runs the advisor's document-validation rules against this client's extracted
// documents and returns a per-rule report. Returns { skipped: true } when the
// advisor has no validation rules, so the gate lives server-side: no rules =>
// no LLM call. Scoped by userId (a foreign client 404s, no existence leak).
router.get("/:clientId", async (req: Request, res: Response) => {
  try {
    const client = await ClientModel.findOne({
      id: req.params.clientId,
      userId: req.user?.id ?? "",
    });
    if (!client) return res.status(404).json({ error: CLIENT_MESSAGES.notFound });

    const report = await runValidation(req.user?.username ?? "", client.toObject() as unknown as Client);
    res.json(report);
  } catch (err) {
    console.error("[validation] run failed:", err);
    res.status(502).json({ error: VALIDATION_MESSAGES.runFailed });
  }
});

export default router;
