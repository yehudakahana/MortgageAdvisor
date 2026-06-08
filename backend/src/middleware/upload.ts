import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { fromBuffer } from "file-type";

// The resolved (mime, ext) is attached here so the upload handler derives the R2
// key extension and ContentType from validated bytes — never from the client
// filename (Hebrew names break keys/URLs).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      resolvedFile?: { mime: string; ext: string };
    }
  }
}

// multer only buffers the file and enforces the hard 10MB cap. Content-type
// validation does NOT belong in fileFilter — there the buffer is incomplete and
// file-type is unreliable. We validate the complete buffer afterwards.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Wraps multer.single so a LIMIT_FILE_SIZE (or any multer) error returns a clean
// 400 JSON instead of bubbling into the default HTML error page.
export function uploadSingle(field: string) {
  const handler = upload.single(field);
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        const message =
          err.code === "LIMIT_FILE_SIZE"
            ? "הקובץ גדול מדי (מקסימום 10MB)"
            : "העלאת הקובץ נכשלה";
        res.status(400).json({ error: message });
        return;
      }
      if (err) {
        res.status(400).json({ error: "העלאת הקובץ נכשלה" });
        return;
      }
      next();
    });
  };
}

// Final RESOLVED allowlist. Keys map a resolved MIME to the key extension used
// for R2 — we never persist .zip/.cfb keys or application/zip content types.
const CONCRETE: Record<string, { mime: string; ext: string }> = {
  pdf: { mime: "application/pdf", ext: "pdf" },
  jpg: { mime: "image/jpeg", ext: "jpg" },
  png: { mime: "image/png", ext: "png" },
  webp: { mime: "image/webp", ext: "webp" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx",
  },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
  },
};

// Office containers are ambiguous by magic bytes: OOXML (docx/xlsx) look like a
// zip, legacy OLE2 (doc/xls) look like a CFB. file-type cannot tell them apart,
// so we fall back to the client extension — accepted ONLY when it is in the
// allowlist AND consistent with the detected container.
const ZIP_EXT: Record<string, { mime: string; ext: string }> = {
  docx: CONCRETE.docx,
  xlsx: CONCRETE.xlsx,
};
const CFB_EXT: Record<string, { mime: string; ext: string }> = {
  doc: { mime: "application/msword", ext: "doc" },
  xls: { mime: "application/vnd.ms-excel", ext: "xls" },
};

async function resolveType(
  buffer: Buffer,
  originalName: string
): Promise<{ mime: string; ext: string } | null> {
  const detected = await fromBuffer(buffer);
  if (!detected) return null;

  // Concrete, allowlisted detection wins immediately.
  if (CONCRETE[detected.ext]) return CONCRETE[detected.ext];

  // Ambiguous containers: trust the client extension only if it is consistent
  // with the detected container type.
  const ext = path.extname(originalName).slice(1).toLowerCase();
  if (detected.mime === "application/zip" && ZIP_EXT[ext]) return ZIP_EXT[ext];
  if (detected.mime === "application/x-cfb" && CFB_EXT[ext]) return CFB_EXT[ext];

  return null;
}

// Runs AFTER multer, on the complete req.file.buffer. Rejects anything that is
// not a resolvable allowlisted type with a clean 400.
export async function validateBuffer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: "לא הועלה קובץ" });
    return;
  }
  try {
    const resolved = await resolveType(req.file.buffer, req.file.originalname);
    if (!resolved) {
      res.status(400).json({ error: "סוג קובץ לא נתמך" });
      return;
    }
    req.resolvedFile = resolved;
    next();
  } catch (err) {
    console.error("[upload] buffer validation failed:", err);
    res.status(400).json({ error: "אימות הקובץ נכשל" });
  }
}
