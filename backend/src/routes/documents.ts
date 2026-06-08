import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { DocumentModel } from "../models/Document";
import { uploadSingle, validateBuffer } from "../middleware/upload";
import {
  uploadObject,
  getViewUrl,
  buildContentDisposition,
  ownerKeySegment,
} from "../services/storageService";

const router = Router();

// POST /api/documents — auth → multer (buffer + 10MB) → validateBuffer → handler.
// Upload to R2 FIRST; persist metadata ONLY after a successful upload.
router.post("/", uploadSingle("file"), validateBuffer, async (req: Request, res: Response) => {
  const file = req.file;
  const resolved = req.resolvedFile;
  const owner = req.user?.username;
  if (!file || !resolved) return res.status(400).json({ error: "No file uploaded" });
  if (!owner) return res.status(401).json({ error: "Unauthorized" });

  // Key extension comes from the RESOLVED mime, never the client filename. The
  // owner segment is sanitized to stay ASCII-safe (usernames may be Hebrew).
  const uuid = randomUUID();
  const key = `uploads/${ownerKeySegment(owner)}/${uuid}.${resolved.ext}`;

  try {
    await uploadObject({
      key,
      body: file.buffer,
      contentType: resolved.mime,
      contentDisposition: buildContentDisposition(resolved.mime, file.originalname),
    });
  } catch (err) {
    console.error("[documents] R2 upload failed:", err);
    return res.status(500).json({ error: "Failed to upload file" });
  }

  try {
    const doc = await DocumentModel.create({
      id: uuid,
      key,
      originalName: file.originalname,
      mimetype: resolved.mime,
      size: file.size,
      owner,
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error("[documents] failed to persist metadata:", err);
    res.status(500).json({ error: "Failed to save document" });
  }
});

// GET /api/documents/:id/view — owner-scoped 15-minute presigned GET URL.
// Missing doc and not-the-owner return an IDENTICAL 404 to avoid leaking
// document existence.
router.get("/:id/view", async (req: Request, res: Response) => {
  const owner = req.user?.username;

  let doc;
  try {
    doc = await DocumentModel.findOne({ id: req.params.id });
  } catch (err) {
    console.error("[documents] lookup failed:", err);
    return res.status(500).json({ error: "Failed to load document" });
  }
  if (!doc || doc.owner !== owner) {
    return res.status(404).json({ error: "Document not found" });
  }

  try {
    const url = await getViewUrl(doc.key);
    res.json({ url });
  } catch (err) {
    console.error("[documents] presign failed:", err);
    res.status(500).json({ error: "Failed to create view link" });
  }
});

export default router;
