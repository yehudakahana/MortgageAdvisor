import { Router } from "express";
import { uploadSingle, validateBuffer } from "../middleware/upload";
import { guestReExtractCap, guestUploadCap } from "../middleware/guestLimits";
import { uploadDocument } from "../controllers/uploadController";
import {
  deleteDocument,
  viewDocument,
  reExtractDocument,
} from "../controllers/documentController";

const router = Router();

// auth → multer (buffer + 10MB) → validateBuffer → guest caps (5 files / 5MB,
// no-op for regular users) → handler.
router.post("/:clientId", uploadSingle("file"), validateBuffer, guestUploadCap, uploadDocument);
router.get("/:clientId/:docId/view", viewDocument);
// Re-extraction is a full LLM extraction, so guests get their own hourly cap.
router.post("/:clientId/:docId/re-extract", guestReExtractCap, reExtractDocument);
router.delete("/:clientId/:docId", deleteDocument);

export default router;
