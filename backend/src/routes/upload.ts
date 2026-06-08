import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { ClientModel } from "../models/Client";
import { Document } from "../types";
import { extractFromFile } from "../services/extractionService";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const clientId = req.params.clientId;
    const dir = path.resolve(__dirname, `../../../uploads/${clientId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

router.post("/:clientId", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const docType = (req.body.type as Document["type"]) ?? "other";
  const doc: Document = {
    id: uuidv4(),
    type: docType,
    filename: req.file.filename,
    uploadedAt: new Date(),
  };

  // Capture before sending response
  const filePath = req.file.path;
  const mimeType = req.file.mimetype;
  const { clientId } = req.params;

  let updated;
  try {
    updated = await ClientModel.findOneAndUpdate(
      { id: clientId },
      { $push: { documents: doc } },
      { new: true }
    );
  } catch (err) {
    console.error("[upload] failed to attach document:", err);
    return res.status(500).json({ error: "Failed to save document" });
  }
  if (!updated) return res.status(404).json({ error: "Client not found" });
  res.status(201).json(updated);

  // Non-blocking background extraction — never delays the upload response.
  // Uses the positional operator to patch only the matching embedded document.
  void (async () => {
    const setExtraction = (data: Document["extractedData"]) =>
      ClientModel.findOneAndUpdate(
        { id: clientId, "documents.id": doc.id },
        { $set: { "documents.$.extractedData": data } }
      );
    try {
      const data = await extractFromFile(filePath, mimeType);
      await setExtraction(data);
      console.log(`[extraction] completed for doc ${doc.id}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[extraction] failed for doc ${doc.id}:`, reason);
      await setExtraction({ error: reason });
    }
  })();
});

// Re-run extraction for an already-uploaded document — e.g. after a transient
// Gemini failure (503/quota). Reads the stored file back from disk and
// overwrites its extractedData. Runs synchronously so the client gets the final
// result (success or error) in the response.
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
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const filePath = path.resolve(__dirname, `../../../uploads/${clientId}/${doc.filename}`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found on disk" });
  }

  const setExtraction = (data: Document["extractedData"]) =>
    ClientModel.findOneAndUpdate(
      { id: clientId, "documents.id": docId },
      { $set: { "documents.$.extractedData": data } },
      { new: true }
    );

  try {
    const data = await extractFromFile(filePath, "application/pdf");
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
