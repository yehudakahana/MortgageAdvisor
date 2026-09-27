// Magic-byte detection for exactly the container types the upload allowlist can
// resolve (see upload.ts). This replaces the `file-type` package: every version
// that still supports CommonJS is affected by GHSA infinite-loop advisories in
// the MKV/ASF parsers, and those parsers ran on every uploaded buffer even
// though neither format is accepted. The fixed release (v22) is ESM-only and
// requires Node >=22, so it cannot be used from this CommonJS backend.
//
// Returns the same `{ ext, mime }` shape the old fromBuffer() call produced, so
// the resolution logic in upload.ts is unchanged. Anything not listed here is
// rejected by the caller — there is no parsing beyond a fixed-offset compare,
// so a malformed file can never loop.

export interface DetectedType {
  ext: string;
  mime: string;
}

// Offset-0 signatures. Order matters only in that every pattern is unambiguous.
const SIGNATURES: { ext: string; mime: string; bytes: number[] }[] = [
  { ext: "pdf", mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { ext: "jpg", mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "png", mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // OOXML (docx/xlsx) arrives as a zip; the caller disambiguates by extension.
  { ext: "zip", mime: "application/zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
  { ext: "zip", mime: "application/zip", bytes: [0x50, 0x4b, 0x05, 0x06] }, // empty archive
  { ext: "zip", mime: "application/zip", bytes: [0x50, 0x4b, 0x07, 0x08] }, // spanned archive
  // Legacy OLE2 (doc/xls); the caller disambiguates by extension.
  { ext: "cfb", mime: "application/x-cfb", bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
];

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, i) => buffer[i] === byte);
}

// WebP is the one two-part signature: "RIFF" at 0, "WEBP" at 8.
function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.toString("latin1", 0, 4) === "RIFF" &&
    buffer.toString("latin1", 8, 12) === "WEBP"
  );
}

export function detectFileType(buffer: Buffer): DetectedType | null {
  if (isWebp(buffer)) return { ext: "webp", mime: "image/webp" };
  const match = SIGNATURES.find((sig) => startsWith(buffer, sig.bytes));
  return match ? { ext: match.ext, mime: match.mime } : null;
}
