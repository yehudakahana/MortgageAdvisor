import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import * as db from "../services/dbService";
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

router.post("/:clientId", upload.single("file"), (req: Request, res: Response) => {
  const client = db.getClientById(req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const docType = (req.body.type as Document["type"]) ?? "other";
  const doc: Document = {
    id: uuidv4(),
    type: docType,
    filename: req.file.filename,
    uploadedAt: new Date().toISOString(),
  };

  // Capture before sending response
  const filePath = req.file.path;
  const mimeType = req.file.mimetype;
  const { clientId } = req.params;

  const updated = db.addDocumentToClient(clientId, doc);
  res.status(201).json(updated);

  // Non-blocking background extraction — never delays the upload response
  void (async () => {
    try {
      const data = await extractFromFile(filePath, mimeType);
      db.updateDocumentExtraction(clientId, doc.id, data);
      console.log(`[extraction] completed for doc ${doc.id}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[extraction] failed for doc ${doc.id}:`, reason);
      db.updateDocumentExtraction(clientId, doc.id, { error: reason });
    }
  })();
});

export default router;
