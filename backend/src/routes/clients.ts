import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { ClientModel } from "../models/Client";
import { safeDeleteObject } from "../services/storageService";
import { guestClientCap } from "../middleware/guestLimits";
import { Client } from "../types";
import { isNonEmptyString, isOptionalString } from "../validation/validators";
import { CLIENT_MESSAGES } from "../constants/messages";

const router = Router();

// Tenant key of the authenticated user. The auth middleware guarantees
// req.user; the fallback satisfies strict TS and can never match a record.
function ownerOf(req: Request): string {
  return req.user?.id ?? "";
}

// Every query below is scoped by userId — a record owned by another user is
// indistinguishable from a missing one (404), never a 403 that leaks existence.
router.get("/", async (req: Request, res: Response) => {
  try {
    const clients = await ClientModel.find({ userId: ownerOf(req) });
    res.json(clients);
  } catch (err) {
    console.error("[clients] list failed:", err);
    res.status(500).json({ error: CLIENT_MESSAGES.listFailed });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const client = await ClientModel.findOne({ id: req.params.id, userId: ownerOf(req) });
    if (!client) return res.status(404).json({ error: CLIENT_MESSAGES.notFound });
    res.json(client);
  } catch (err) {
    console.error("[clients] get failed:", err);
    res.status(500).json({ error: CLIENT_MESSAGES.fetchFailed });
  }
});

router.post("/", guestClientCap, async (req: Request, res: Response) => {
  const { name, phone, email, notes } = (req.body ?? {}) as Record<string, unknown>;
  if (!isNonEmptyString(name) || !isNonEmptyString(phone)) {
    return res.status(400).json({ error: CLIENT_MESSAGES.requiredFields });
  }
  if (!isOptionalString(email) || !isOptionalString(notes)) {
    return res.status(400).json({ error: CLIENT_MESSAGES.fieldsMustBeStrings });
  }
  try {
    const client = await ClientModel.create({
      id: randomUUID(),
      userId: ownerOf(req),
      name,
      phone,
      email: email ?? "",
      notes: notes ?? "",
      documents: [],
    });
    res.status(201).json(client);
  } catch (err) {
    console.error("[clients] create failed:", err);
    res.status(500).json({ error: CLIENT_MESSAGES.createFailed });
  }
});

const UPDATABLE_FIELDS = ["name", "phone", "email", "notes"] as const;

router.patch("/:id", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const update: Partial<Pick<Client, (typeof UPDATABLE_FIELDS)[number]>> = {};
  for (const field of UPDATABLE_FIELDS) {
    const value = body[field];
    if (!isOptionalString(value)) {
      return res.status(400).json({ error: CLIENT_MESSAGES.updateFieldsMustBeStrings });
    }
    if (value !== undefined) update[field] = value;
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: CLIENT_MESSAGES.noValidUpdateFields });
  }
  try {
    const updated = await ClientModel.findOneAndUpdate(
      { id: req.params.id, userId: ownerOf(req) },
      update,
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ error: CLIENT_MESSAGES.notFound });
    res.json(updated);
  } catch (err) {
    console.error("[clients] update failed:", err);
    res.status(500).json({ error: CLIENT_MESSAGES.updateFailed });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await ClientModel.findOneAndDelete({
      id: req.params.id,
      userId: ownerOf(req),
    });
    if (!deleted) return res.status(404).json({ error: CLIENT_MESSAGES.notFound });
    // Best-effort R2 cleanup — never fail the response over storage errors.
    // Shared sample files are skipped inside safeDeleteObject.
    for (const doc of deleted.documents) {
      if (doc.key) await safeDeleteObject(doc.key);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[clients] delete failed:", err);
    res.status(500).json({ error: CLIENT_MESSAGES.deleteFailed });
  }
});

export default router;
