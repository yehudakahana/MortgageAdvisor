import { describe, expect, it } from "vitest";
import { detectFileType } from "./fileSignature";
import { resolveType } from "./upload";

// Minimal buffers carrying just the magic bytes plus filler — detection is a
// fixed-offset compare, so nothing more is needed.
const buf = (...bytes: number[]) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(32)]);
const PDF = buf(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34);
const JPG = buf(0xff, 0xd8, 0xff, 0xe0);
const PNG = buf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const ZIP = buf(0x50, 0x4b, 0x03, 0x04);
const CFB = buf(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "latin1"),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP", "latin1"),
  Buffer.alloc(16),
]);
// The formats whose parsers caused the file-type infinite-loop advisories: now
// simply unrecognised, so no parser ever runs on them.
const MKV = buf(0x1a, 0x45, 0xdf, 0xa3);
const ASF = buf(0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11);

describe("detectFileType", () => {
  it("recognises every container the allowlist can resolve", () => {
    expect(detectFileType(PDF)).toEqual({ ext: "pdf", mime: "application/pdf" });
    expect(detectFileType(JPG)).toEqual({ ext: "jpg", mime: "image/jpeg" });
    expect(detectFileType(PNG)).toEqual({ ext: "png", mime: "image/png" });
    expect(detectFileType(WEBP)).toEqual({ ext: "webp", mime: "image/webp" });
    expect(detectFileType(ZIP)).toEqual({ ext: "zip", mime: "application/zip" });
    expect(detectFileType(CFB)).toEqual({ ext: "cfb", mime: "application/x-cfb" });
  });

  it("returns null for unrecognised, empty and truncated buffers", () => {
    expect(detectFileType(Buffer.from("not a real file"))).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
    expect(detectFileType(Buffer.from([0x89, 0x50]))).toBeNull();
    // RIFF without the WEBP tag is some other RIFF container (e.g. wav).
    expect(detectFileType(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(16)]))).toBeNull();
  });

  it("does not recognise video containers (MKV/ASF)", () => {
    expect(detectFileType(MKV)).toBeNull();
    expect(detectFileType(ASF)).toBeNull();
  });
});

describe("resolveType", () => {
  it("resolves concrete types from bytes, ignoring the client filename", () => {
    expect(resolveType(PDF, "evil.exe")).toEqual({ mime: "application/pdf", ext: "pdf" });
    expect(resolveType(PNG, "no-extension")).toEqual({ mime: "image/png", ext: "png" });
  });

  it("disambiguates zip and CFB containers via a consistent client extension", () => {
    expect(resolveType(ZIP, "salary.docx")?.ext).toBe("docx");
    expect(resolveType(ZIP, "salary.xlsx")?.ext).toBe("xlsx");
    expect(resolveType(CFB, "salary.doc")?.mime).toBe("application/msword");
    expect(resolveType(CFB, "salary.xls")?.mime).toBe("application/vnd.ms-excel");
  });

  it("rejects a container whose extension is not allowlisted or not consistent", () => {
    expect(resolveType(ZIP, "archive.zip")).toBeNull();
    expect(resolveType(ZIP, "legacy.doc")).toBeNull();
    expect(resolveType(CFB, "sheet.xlsx")).toBeNull();
    expect(resolveType(MKV, "movie.docx")).toBeNull();
  });
});
