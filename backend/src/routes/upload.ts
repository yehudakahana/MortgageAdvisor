import { Router } from "express";
import { uploadSingle, validateBuffer } from "../middleware/upload";
import {
  uploadDocument,
  viewDocument,
  reExtractDocument,
} from "../controllers/uploadController";

const router = Router();

// auth → multer (buffer + 10MB) → validateBuffer → handler.
router.post("/:clientId", uploadSingle("file"), validateBuffer, uploadDocument);
router.get("/:clientId/:docId/view", viewDocument);
router.post("/:clientId/:docId/re-extract", reExtractDocument);

export default router;
