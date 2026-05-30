import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as db from "../services/dbService";
import { Client } from "../types";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json(db.getAllClients());
});

router.get("/:id", (req: Request, res: Response) => {
  const client = db.getClientById(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  res.json(client);
});

router.post("/", (req: Request, res: Response) => {
  const { name, phone, email, notes } = req.body as Partial<Client>;
  if (!name || !phone) {
    return res.status(400).json({ error: "name and phone are required" });
  }
  const client: Client = {
    id: uuidv4(),
    name,
    phone,
    email: email ?? "",
    notes: notes ?? "",
    documents: [],
    createdAt: new Date().toISOString(),
  };
  res.status(201).json(db.createClient(client));
});

router.patch("/:id", (req: Request, res: Response) => {
  const updated = db.updateClient(req.params.id, req.body as Partial<Client>);
  if (!updated) return res.status(404).json({ error: "Client not found" });
  res.json(updated);
});

router.delete("/:id", (req: Request, res: Response) => {
  const ok = db.deleteClient(req.params.id);
  if (!ok) return res.status(404).json({ error: "Client not found" });
  res.json({ success: true });
});

export default router;
