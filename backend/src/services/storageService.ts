import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET_NAME } from "../config/r2";

const VIEW_URL_TTL_SECONDS = 15 * 60; // 15 minutes

interface UploadParams {
  key: string;
  body: Buffer;
  contentType: string;
  contentDisposition: string;
}

// Build a safe Content-Disposition. Images render inline; documents/spreadsheets
// download. Original names are usually Hebrew, so a raw filename="<hebrew>" is an
// invalid header — use RFC 5987 (filename*) with an ASCII fallback.
export function buildContentDisposition(mime: string, originalName: string): string {
  if (mime.startsWith("image/")) return "inline";

  const asciiFallback =
    originalName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "document";
  const encoded = encodeURIComponent(originalName);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

// Uploads the buffer to R2. Must succeed before any Mongoose write so we never
// persist metadata for an object that does not exist.
export async function uploadObject(params: UploadParams): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ContentDisposition: params.contentDisposition,
    })
  );
}

// Removes an object — used to avoid orphaned R2 objects when a record is deleted.
export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
}

// Short-lived (15-minute) presigned GET URL. The bucket stays fully private;
// this is the only way a file is ever served.
export async function getViewUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
    { expiresIn: VIEW_URL_TTL_SECONDS }
  );
}
