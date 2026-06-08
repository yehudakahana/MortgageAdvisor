import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { ClientModel } from "../models/Client";
import { Document } from "../types";
import { extractFromBuffer } from "../services/extractionService";
import { uploadSingle, validateBuffer } from "../middleware/upload";
import {
  uploadObject,
  deleteObject,
  getObjectBuffer,
  getViewUrl,
  buildContentDisposition,
} from "../services/storageService";

const router = Router();

// POST /:clientId — auth → multer (buffer + 10MB) → validateBuffer → handler.
// Files go to the private R2 bucket; only metadata is embedded on the client.
router.post(
  "/:clientId",
  uploadSingle("file"),
  validateBuffer,
  async (req: Request, res: Response) => {
    const file = req.file;
    const resolved = req.resolvedFile;
    if (!file || !resolved) return res.status(400).json({ error: "No file uploaded" });

    const { clientId } = req.params;
    const docType = (req.body.type as Document["type"]) ?? "other";

    // Key extension comes from the RESOLVED mime, never the client filename.
    const uuid = randomUUID();
    const key = `uploads/${clientId}/${uuid}.${resolved.ext}`;

    // Upload to R2 FIRST — persist metadata only after a successful upload.
    try {
      await uploadObject({
        key,
        body: file.buffer,
        contentType: resolved.mime,
        contentDisposition: buildContentDisposition(resolved.mime, file.originalname),
      });
    } catch (err) {
      console.error("[upload] R2 upload failed:", err);
      return res.status(500).json({ error: "Failed to upload file" });
    }

    const doc: Document = {
      id: uuid,
      type: docType,
      filename: file.originalname,
      key,
      mimetype: resolved.mime,
      uploadedAt: new Date(),
    };

    let updated;
    try {
      updated = await ClientModel.findOneAndUpdate(
        { id: clientId },
        { $push: { documents: doc } },
        { returnDocument: "after" }
      );
    } catch (err) {
      console.error("[upload] failed to attach document:", err);
      // Avoid an orphaned R2 object when the metadata write fails.
      await deleteObject(key).catch(() => undefined);
      return res.status(500).json({ error: "Failed to save document" });
    }
    if (!updated) {
      await deleteObject(key).catch(() => undefined);
      return res.status(404).json({ error: "Client not found" });
    }
    res.status(201).json(updated);

    // Non-blocking background extraction — never delays the upload response.
    // Reuses the in-memory buffer, so no disk read is involved.
    void (async () => {
      const setExtraction = (data: Document["extractedData"]) =>
        ClientModel.findOneAndUpdate(
          { id: clientId, "documents.id": uuid },
          { $set: { "documents.$.extractedData": data } }
        );
      try {
        const data = await extractFromBuffer(file.buffer, resolved.mime);
        await setExtraction(data);
        console.log(`[extraction] completed for doc ${uuid}`);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`[extraction] failed for doc ${uuid}:`, reason);
        await setExtraction({ error: reason });
      }
    })();
  }
);

// GET /:clientId/:docId/view — short-lived (15-min) presigned GET URL for an
// uploaded file. The bucket is private, so this is the only way to view it.
router.get("/:clientId/:docId/view", async (req: Request, res: Response) => {
  const { clientId, docId } = req.params;

  let client;
  try {
    client = await ClientModel.findOne({ id: clientId });
  } catch (err) {
    console.error("[view] lookup failed:", err);
    return res.status(500).json({ error: "Failed to load client" });
  }
  const doc = client?.documents.find((d) => d.id === docId);
  if (!doc || !doc.key) return res.status(404).json({ error: "Document not found" });

  try {
    const url = await getViewUrl(doc.key);
    res.json({ url });
  } catch (err) {
    console.error("[view] presign failed:", err);
    res.status(500).json({ error: "Failed to create view link" });
  }
});

// POST /:clientId/:docId/re-extract — re-run extraction for an already-uploaded
// document, e.g. after a transient Gemini failure. Downloads the file from R2
// into memory and overwrites its extractedData synchronously.
router.post("/:clientId/:docId/re-extract", async (req: Request, res: Response) => {
  const { clientId, docId } = req.params;

  let client;
  try {
    client = await ClientModel.findOne({ id: clientId });
  } catch (err) {
    console.error("[re-extract] lookup failed:", err);
    return res.status(500).json({ error: "Failed to load client" });
  }
  if (!client) return res.status(404).json({ error: "Client not found" });

  const doc = client.documents.find((d) => d.id === docId);
  if (!doc || !doc.key) return res.status(404).json({ error: "Document not found" });

  let buffer: Buffer;
  try {
    buffer = await getObjectBuffer(doc.key);
  } catch (err) {
    console.error("[re-extract] R2 download failed:", err);
    return res.status(404).json({ error: "File not found in storage" });
  }

  const setExtraction = (data: Document["extractedData"]) =>
    ClientModel.findOneAndUpdate(
      { id: clientId, "documents.id": docId },
      { $set: { "documents.$.extractedData": data } },
      { returnDocument: "after" }
    );

  try {
    const data = await extractFromBuffer(buffer, doc.mimetype ?? "application/pdf");
    const updated = await setExtraction(data);
    console.log(`[re-extract] completed for doc ${docId}`);
    res.json(updated);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[re-extract] failed for doc ${docId}:`, reason);
    const updated = await setExtraction({ error: reason });
    res.json(updated);
  }
});

export default router;
