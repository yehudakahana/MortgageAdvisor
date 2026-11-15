import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { ClientModel } from "../models/Client";
import { safeDeleteObject } from "../services/storageService";
import { guestClientCap } from "../middleware/guestLimits";
import { releaseGuestCounter, reserveGuestCounter } from "../services/guestQuotaService";
import { GUEST_LIMITS, SAMPLE_KEY_PREFIX } from "../constants/guest";
import { Client } from "../types";
import { isNonEmptyString, isOptionalString } from "../validation/validators";
import { CLIENT_MESSAGES, GUEST_MESSAGES } from "../constants/messages";

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
  // Guests: reserve one of the own-client slots atomically BEFORE writing, so
  // simultaneous requests cannot overshoot the cap (the middleware count above
  // is only an early reject). Released if the write fails or the client is deleted.
  const guestId = req.user?.isGuest ? ownerOf(req) : null;
  if (guestId) {
    const slot = await reserveGuestCounter(guestId, "ownClients", GUEST_LIMITS.extraClients).catch(
      () => "error" as const
    );
    if (slot === "error") return res.status(500).json({ error: GUEST_MESSAGES.limitCheckFailed });
    if (slot === "gone") return res.status(401).json({ error: "Unauthorized" });
    if (slot === "full") return res.status(403).json({ error: GUEST_MESSAGES.clientCapReached });
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
    if (guestId) await releaseGuestCounter(guestId, "ownClients").catch(() => undefined);
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
    // findOneAndDelete has a single winner per client, so this releases once.
    if (req.user?.isGuest) {
      const ownDocs = deleted.documents.filter((d) => !d.key?.startsWith(SAMPLE_KEY_PREFIX)).length;
      if (!deleted.isSample) await releaseGuestCounter(ownerOf(req), "ownClients").catch(() => undefined);
      await releaseGuestCounter(ownerOf(req), "uploads", ownDocs).catch(() => undefined);
    }
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
