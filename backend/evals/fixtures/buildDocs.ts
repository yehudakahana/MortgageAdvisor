// Fixture documents for the extraction evals. Entirely fictional data.
//
// The PDF writer is the same minimal hand-built approach as
// backend/src/scripts/samplePdf.ts, generalized to take arbitrary lines.
// Content is ASCII: embedding Hebrew in a raw PDF requires font embedding,
// which would mean a new dependency. Real Hebrew PDFs can be dropped into
// evals/fixtures/docs/ under the same filename and are never overwritten.

import fs from "fs";
import path from "path";
import { DOCS } from "./docContent";

const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/[()]/g, "\\$&");

export function buildPdf(lines: string[]): Buffer {
  const text = lines
    .map((line, i) => `BT /F1 12 Tf 60 ${760 - i * 22} Td (${escape(line)}) Tj ET`)
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(body + xref + trailer, "ascii");
}

// Idempotent: an existing file (including a real Hebrew PDF dropped in by hand)
// is left untouched.
export function ensureDocs(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, lines] of Object.entries(DOCS)) {
    const target = path.join(dir, name);
    if (!fs.existsSync(target)) fs.writeFileSync(target, buildPdf(lines));
  }
}
