import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { ClientModel } from "../models/Client";
import { Document } from "../types";
import { extractFromBuffer } from "../services/extractionService";
import {
  uploadObject,
  safeDeleteObject,
  buildContentDisposition,
} from "../services/storageService";
import { isDocumentType } from "../validation/validators";

// LLM/provider errors often arrive as a JSON blob (e.g. Gemini's
// {"error":{"code":503,"message":"...high demand..."}}). Surface the human
// message when present so the client can show something readable.
// Shared with documentController (re-extract flow).
export function formatExtractionError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw);
    const message = parsed?.error?.message;
    if (typeof message === "string" && message.trim()) return message;
  } catch {
    // not JSON — fall through to the raw string
  }
  return raw;
}

// Patch only the matching embedded document's extractedData via the positional
// operator. Shared by the upload (background) and re-extract flows.
export function setExtraction(clientId: string, docId: string, data: Document["extractedData"]) {
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
  const rawType = (req.body as Record<string, unknown>).type;
  let docType: Document["type"] = "other";
  if (rawType !== undefined) {
    if (!isDocumentType(rawType)) {
      return res.status(400).json({ error: "סוג המסמך אינו תקין" });
    }
    docType = rawType;
  }

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
    await safeDeleteObject(key); // avoid an orphaned R2 object
    return res.status(500).json({ error: "שמירת המסמך נכשלה" });
  }
  if (!updated) {
    await safeDeleteObject(key);
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
      const reason = formatExtractionError(err);
      console.error(`[extraction] failed for doc ${uuid}:`, reason);
      await setExtraction(clientId, uuid, { error: reason });
    }
  })();
}
