import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { ClientModel } from "../models/Client";
import { Document } from "../types";
import { extractFromBuffer } from "../services/extractionService";
import {
  uploadObject,
  deleteObject,
  getObjectBuffer,
  getViewUrl,
  buildContentDisposition,
} from "../services/storageService";

// Patch only the matching embedded document's extractedData via the positional
// operator. Shared by the upload (background) and re-extract flows.
function setExtraction(clientId: string, docId: string, data: Document["extractedData"]) {
  return ClientModel.findOneAndUpdate(
    { id: clientId, "documents.id": docId },
    { $set: { "documents.$.extractedData": data } },
    { returnDocument: "after" }
  );
}

// Upload to R2 FIRST, then embed metadata on the client (never the binary).
export async function uploadDocument(req: Request, res: Response) {
  const file = req.file;
  const resolved = req.resolvedFile;
  if (!file || !resolved) return res.status(400).json({ error: "לא הועלה קובץ" });

  const { clientId } = req.params;
  const docType = (req.body.type as Document["type"]) ?? "other";

  // Key extension comes from the RESOLVED mime, never the client filename.
  const uuid = randomUUID();
  const key = `uploads/${clientId}/${uuid}.${resolved.ext}`;

  try {
    await uploadObject({
      key,
      body: file.buffer,
      contentType: resolved.mime,
      contentDisposition: buildContentDisposition(resolved.mime, file.originalname),
    });
  } catch (err) {
    console.error("[upload] R2 upload failed:", err);
    return res.status(500).json({ error: "העלאת הקובץ נכשלה" });
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
    await deleteObject(key).catch(() => undefined); // avoid an orphaned R2 object
    return res.status(500).json({ error: "שמירת המסמך נכשלה" });
  }
  if (!updated) {
    await deleteObject(key).catch(() => undefined);
    return res.status(404).json({ error: "הלקוח לא נמצא" });
  }
  res.status(201).json(updated);

  // Non-blocking background extraction — never delays the upload response.
  // Reuses the in-memory buffer, so no disk read is involved.
  void (async () => {
    try {
      const data = await extractFromBuffer(file.buffer, resolved.mime);
      await setExtraction(clientId, uuid, data);
      console.log(`[extraction] completed for doc ${uuid}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[extraction] failed for doc ${uuid}:`, reason);
      await setExtraction(clientId, uuid, { error: reason });
    }
  })();
}

// Short-lived (15-min) presigned GET URL — the only way to view a private file.
export async function viewDocument(req: Request, res: Response) {
  const { clientId, docId } = req.params;

  let client;
  try {
    client = await ClientModel.findOne({ id: clientId });
  } catch (err) {
    console.error("[view] lookup failed:", err);
    return res.status(500).json({ error: "טעינת הלקוח נכשלה" });
  }
  const doc = client?.documents.find((d) => d.id === docId);
  if (!doc || !doc.key) return res.status(404).json({ error: "המסמך לא נמצא" });

  try {
    const url = await getViewUrl(doc.key);
    res.json({ url });
  } catch (err) {
    console.error("[view] presign failed:", err);
    res.status(500).json({ error: "יצירת קישור הצפייה נכשלה" });
  }
}

// Re-run extraction after a transient failure: download from R2 into memory and
// overwrite extractedData synchronously so the client gets the final result.
export async function reExtractDocument(req: Request, res: Response) {
  const { clientId, docId } = req.params;

  let client;
  try {
    client = await ClientModel.findOne({ id: clientId });
  } catch (err) {
    console.error("[re-extract] lookup failed:", err);
    return res.status(500).json({ error: "טעינת הלקוח נכשלה" });
  }
  if (!client) return res.status(404).json({ error: "הלקוח לא נמצא" });

  const doc = client.documents.find((d) => d.id === docId);
  if (!doc || !doc.key) return res.status(404).json({ error: "המסמך לא נמצא" });

  let buffer: Buffer;
  try {
    buffer = await getObjectBuffer(doc.key);
  } catch (err) {
    console.error("[re-extract] R2 download failed:", err);
    return res.status(404).json({ error: "הקובץ לא נמצא באחסון" });
  }

  try {
    const data = await extractFromBuffer(buffer, doc.mimetype ?? "application/pdf");
    const updated = await setExtraction(clientId, docId, data);
    console.log(`[re-extract] completed for doc ${docId}`);
    res.json(updated);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[re-extract] failed for doc ${docId}:`, reason);
    const updated = await setExtraction(clientId, docId, { error: reason });
    res.json(updated);
  }
}
