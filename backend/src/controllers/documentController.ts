import { Request, Response } from "express";
import { ClientModel } from "../models/Client";
import { extractFromBuffer } from "../services/extractionService";
import {
  safeDeleteObject,
  getObjectBuffer,
  getViewUrl,
} from "../services/storageService";
import { formatExtractionError, setExtraction } from "./uploadController";

// Delete a single document: remove the R2 object (best-effort, same pattern as
// client deletion) and pull the embedded metadata. Returns the updated client.
export async function deleteDocument(req: Request, res: Response) {
  const { clientId, docId } = req.params;

  let client;
  try {
    client = await ClientModel.findOne({ id: clientId });
  } catch (err) {
    console.error("[delete-doc] lookup failed:", err);
    return res.status(500).json({ error: "טעינת הלקוח נכשלה" });
  }
  if (!client) return res.status(404).json({ error: "הלקוח לא נמצא" });

  const doc = client.documents.find((d) => d.id === docId);
  if (!doc) return res.status(404).json({ error: "המסמך לא נמצא" });

  if (doc.key) await safeDeleteObject(doc.key);

  try {
    const updated = await ClientModel.findOneAndUpdate(
      { id: clientId },
      { $pull: { documents: { id: docId } } },
      { returnDocument: "after" }
    );
    // The client may have been deleted between the lookup and the update.
    if (!updated) return res.status(404).json({ error: "הלקוח לא נמצא" });
    res.json(updated);
  } catch (err) {
    console.error("[delete-doc] failed to remove document:", err);
    res.status(500).json({ error: "מחיקת המסמך נכשלה" });
  }
}

// Short-lived (15-min) presigned GET URL — the only way to view a private file.
// `?mode=download` forces an attachment (with the original filename); otherwise
// the browser previews inline (PDF/image). Office files can't render inline, so
// they always come back as an attachment regardless of mode.
export async function viewDocument(req: Request, res: Response) {
  const { clientId, docId } = req.params;
  const wantsDownload = req.query.mode === "download";

  let client;
  try {
    client = await ClientModel.findOne({ id: clientId });
  } catch (err) {
    console.error("[view] lookup failed:", err);
    return res.status(500).json({ error: "טעינת הלקוח נכשלה" });
  }
  const doc = client?.documents.find((d) => d.id === docId);
  if (!doc || !doc.key) return res.status(404).json({ error: "המסמך לא נמצא" });

  const canPreviewInline =
    doc.mimetype === "application/pdf" || doc.mimetype?.startsWith("image/");
  const disposition = wantsDownload || !canPreviewInline ? "attachment" : "inline";

  try {
    const url = await getViewUrl(doc.key, disposition, doc.filename);
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
    const reason = formatExtractionError(err);
    console.error(`[re-extract] failed for doc ${docId}:`, reason);
    const updated = await setExtraction(clientId, docId, { error: reason });
    res.json(updated);
  }
}
