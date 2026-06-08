import { S3Client } from "@aws-sdk/client-s3";

// Fail-fast at boot: every R2 credential must be present or the process should
// refuse to start (mirrors the connectDB() guard in config/db.ts).
const REQUIRED_ENV = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`[r2] Missing required environment variable: ${key}`);
  }
}

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME as string;

// R2 is S3-compatible. region is the literal "auto"; the checksum flags are
// mandatory for R2 (it rejects the default streaming checksum trailers). Never
// set ACLs — R2 has no per-object ACLs.
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
