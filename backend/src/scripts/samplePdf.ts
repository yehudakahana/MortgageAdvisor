// Hand-built minimal PDF (no extra packages) for the shared guest demo file.
// ASCII-only content: embedding Hebrew in raw PDF needs font embedding, and the
// demo's real value lives in the pre-filled extractedData on the template
// client — this file only has to open cleanly in a browser preview.

const LINES = [
  "SAMPLE PAYSTUB - DEMO DATA ONLY",
  "",
  "Employee: Israel Israeli",
  "Employer: Demo Company Ltd.",
  "Period: 06/2026",
  "",
  "Gross Salary: 18,300 ILS",
  "Net Salary:   12,450 ILS",
  "",
  "This document contains entirely fictional data",
  "generated for the kay.ai guest demo environment.",
];

export function buildSamplePdf(): Buffer {
  const escaped = (s: string) => s.replace(/\\/g, "\\\\").replace(/[()]/g, "\\$&");
  const text = LINES.map(
    (line, i) => `BT /F1 12 Tf 60 ${760 - i * 22} Td (${escaped(line)}) Tj ET`
  ).join("\n");

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
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(body + xref + trailer, "ascii");
}
