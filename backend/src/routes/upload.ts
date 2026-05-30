import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import * as db from "../services/dbService";
import { Document } from "../types";

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

  const updated = db.addDocumentToClient(req.params.clientId, doc);
  res.status(201).json(updated);
});

export default router;
