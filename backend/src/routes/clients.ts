import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { ClientModel } from "../models/Client";
import { deleteObject } from "../services/storageService";
import { Client } from "../types";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const clients = await ClientModel.find();
    res.json(clients);
  } catch (err) {
    console.error("[clients] list failed:", err);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const client = await ClientModel.findOne({ id: req.params.id });
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
  } catch (err) {
    console.error("[clients] get failed:", err);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const { name, phone, email, notes } = req.body as Partial<Client>;
  if (!name || !phone) {
    return res.status(400).json({ error: "name and phone are required" });
  }
  try {
    const client = await ClientModel.create({
      id: uuidv4(),
      name,
      phone,
      email: email ?? "",
      notes: notes ?? "",
      documents: [],
    });
    res.status(201).json(client);
  } catch (err) {
    console.error("[clients] create failed:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

const UPDATABLE_FIELDS = ["name", "phone", "email", "notes"] as const;

router.patch("/:id", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const update: Partial<Pick<Client, (typeof UPDATABLE_FIELDS)[number]>> = {};
  for (const field of UPDATABLE_FIELDS) {
    if (typeof body[field] === "string") update[field] = body[field] as string;
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }
  try {
    const updated = await ClientModel.findOneAndUpdate(
      { id: req.params.id },
      update,
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ error: "Client not found" });
    res.json(updated);
  } catch (err) {
    console.error("[clients] update failed:", err);
    res.status(500).json({ error: "Failed to update client" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await ClientModel.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Client not found" });
    // Best-effort R2 cleanup — never fail the response over storage errors.
    for (const doc of deleted.documents) {
      if (doc.key) await deleteObject(doc.key).catch(() => undefined);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[clients] delete failed:", err);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

export default router;
