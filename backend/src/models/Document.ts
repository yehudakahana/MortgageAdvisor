import { Schema, model } from "mongoose";
import { StoredDocument } from "../types";

// Standalone collection for R2-backed uploads. We persist ONLY metadata here —
// the binary lives in the private R2 bucket and is served via presigned URLs.
const StoredDocumentSchema = new Schema<StoredDocument>(
  {
    // Public uuid lookup key (not Mongo's _id), matching the project convention.
    id: { type: String, required: true, unique: true, index: true },
    // R2 object key: uploads/<owner>/<uuid>.<ext>.
    key: { type: String, required: true },
    // Original client filename (often Hebrew) — kept for display only.
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    // Authenticated owner (username) — drives ownership checks on the view route.
    owner: { type: String, required: true, index: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as { _id?: unknown })._id;
        return ret;
      },
    },
  }
);

export const DocumentModel = model<StoredDocument>("Document", StoredDocumentSchema);
