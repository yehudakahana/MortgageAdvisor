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
import { CLIENT_MESSAGES, DOCUMENT_MESSAGES, UPLOAD_MESSAGES } from "../constants/messages";

// LLM/provider errors often arrive as a JSON blob (e.g. Gemini's
// {"error":{"code":503,"message":"...high demand..."}}). Surface the human

// message when present so the client can show something readable.
// busboy (via multer) decodes multipart filenames as latin1, so UTF-8 names —
// typically Hebrew here — arrive as mojibake ("×§×××¥ ..."). Re-encode the
// latin1 bytes back to UTF-8 to recover the original name. If the string already
// contains chars outside the latin1 range it was decoded correctly, so leave it.
function decodeOriginalName(name: string): string {
  if (/[^\x00-\xff]/.test(name)) return name;
  return Buffer.from(name, "latin1").toString("utf8");
}

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
  if (!file || !resolved) return res.status(400).json({ error: UPLOAD_MESSAGES.noFile });

  const { clientId } = req.params;
  const rawType = (req.body as Record<string, unknown>).type;
  let docType: Document["type"] = "other";
  if (rawType !== undefined) {
    if (!isDocumentType(rawType)) {
      return res.status(400).json({ error: DOCUMENT_MESSAGES.invalidType });
    }
    docType = rawType;
  }

  // Key extension comes from the RESOLVED mime, never the client filename.
  const uuid = randomUUID();
  const key = `uploads/${clientId}/${uuid}.${resolved.ext}`;
  const originalName = decodeOriginalName(file.originalname);

  try {
    await uploadObject({
      key,
      body: file.buffer,
      contentType: resolved.mime,
      contentDisposition: buildContentDisposition(resolved.mime, originalName),
    });
  } catch (err) {
    console.error("[upload] R2 upload failed:", err);
    return res.status(500).json({ error: UPLOAD_MESSAGES.uploadFailed });
  }

  const doc: Document = {
    id: uuid,
    type: docType,
    filename: originalName,
    key,
    mimetype: resolved.mime,
    uploadedAt: new Date(),
  };

  let updated;
  try {
    // Scoped by userId: uploading to another user's client 404s like a
    // missing client (no existence leak).
    updated = await ClientModel.findOneAndUpdate(
      { id: clientId, userId: req.user?.id ?? "" },
      { $push: { documents: doc } },
      { returnDocument: "after" }
    );
  } catch (err) {
    console.error("[upload] failed to attach document:", err);
    await safeDeleteObject(key); // avoid an orphaned R2 object
    return res.status(500).json({ error: UPLOAD_MESSAGES.saveFailed });
  }
  if (!updated) {
    await safeDeleteObject(key);
    return res.status(404).json({ error: CLIENT_MESSAGES.notFound });
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
